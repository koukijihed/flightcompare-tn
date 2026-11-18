import { describe, expect, it } from "vitest";
import {
  createTravelpayoutsSignature,
  decodeTravelpayoutsBookingCode,
  encodeTravelpayoutsBookingCode,
  normalizeTravelpayoutsGates,
  zonedTimeToUtc,
  type TravelpayoutsBookingCode,
} from "./travelpayouts";
import type { ProviderSearchParams } from "./types";

const params: ProviderSearchParams = {
  origin: "TUN",
  destination: "IST",
  departureDate: "2026-06-01",
  returnDate: null,
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "ECONOMY",
  tripType: "ONE_WAY",
};

describe("createTravelpayoutsSignature", () => {
  // Published vectors from the Travelpayouts PHP SDK test suite.
  it("matches the one-way economy vector", () => {
    const signature = createTravelpayoutsSignature("my-token", {
      marker: "my-marker",
      host: "myhost.com",
      user_ip: "127.0.0.1",
      locale: "en",
      trip_class: "Y",
      passengers: { adults: 1, children: 0, infants: 0 },
      segments: [{ date: "2015-06-06", destination: "BUC", origin: "IAS" }],
    });
    expect(signature).toBe("d68c1587015117070a797df608a0ef49");
  });

  it("matches the round-trip business vector", () => {
    const signature = createTravelpayoutsSignature("my-token", {
      marker: "my-marker",
      host: "myhost.com",
      user_ip: "127.0.0.1",
      locale: "en",
      trip_class: "C",
      passengers: { adults: 1, children: 0, infants: 0 },
      segments: [
        { date: "2015-06-06", destination: "BUC", origin: "IAS" },
        { date: "2015-06-06", destination: "IAS", origin: "BUC" },
      ],
    });
    expect(signature).toBe("3c6ff3a62e84695608fbf34d26a633c0");
  });

  it("matches the Romanian locale vector", () => {
    const signature = createTravelpayoutsSignature("my-token", {
      marker: "my-marker",
      host: "myhost.com",
      user_ip: "127.0.0.1",
      locale: "ro",
      trip_class: "C",
      passengers: { adults: 1, children: 0, infants: 0 },
      segments: [{ date: "2015-06-06", destination: "BUC", origin: "IAS" }],
    });
    expect(signature).toBe("4e5415a02ab1c286405ba99ba575a243");
  });

  it("is independent of the insertion order", () => {
    const a = createTravelpayoutsSignature("token", {
      b: "2",
      a: "1",
      nested: { z: 1, y: 2 },
    });
    const b = createTravelpayoutsSignature("token", {
      nested: { y: 2, z: 1 },
      a: "1",
      b: "2",
    });
    expect(a).toBe(b);
  });
});

describe("zonedTimeToUtc", () => {
  it("converts winter and summer Paris wall times", () => {
    expect(zonedTimeToUtc("2026-01-15", "10:00", "Europe/Paris")).toBe(
      "2026-01-15T09:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-07-15", "10:00", "Europe/Paris")).toBe(
      "2026-07-15T08:00:00.000Z",
    );
  });

  it("keeps Tunisia UTC+1 all year", () => {
    expect(zonedTimeToUtc("2026-01-15", "10:00", "Africa/Tunis")).toBe(
      "2026-01-15T09:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-07-15", "10:00", "Africa/Tunis")).toBe(
      "2026-07-15T09:00:00.000Z",
    );
  });

  it("returns null for incomplete input", () => {
    expect(zonedTimeToUtc(undefined, "10:00", "Europe/Paris")).toBeNull();
    expect(zonedTimeToUtc("2026-01-15", undefined, "Europe/Paris")).toBeNull();
  });
});

describe("booking code", () => {
  it("round-trips through base64url", () => {
    const code: TravelpayoutsBookingCode = {
      s: "d9266de5-7578-418f-9ddc-6b176ae45923",
      u: "18000000",
      o: "TUN",
      d: "IST",
      dd: "2026-06-01",
      rd: null,
      a: 1,
    };
    expect(decodeTravelpayoutsBookingCode(encodeTravelpayoutsBookingCode(code))).toEqual(code);
  });

  it("rejects malformed payloads", () => {
    expect(decodeTravelpayoutsBookingCode("not-base64")).toBeNull();
    expect(decodeTravelpayoutsBookingCode("x".repeat(600))).toBeNull();
    expect(
      decodeTravelpayoutsBookingCode(Buffer.from(JSON.stringify({ s: "x" })).toString("base64url")),
    ).toBeNull();
  });
});

describe("normalizeTravelpayoutsGates", () => {
  const gate = {
    search_id: "d9266de5-7578-418f-9ddc-6b176ae45923",
    meta: { gates: [{ id: 20 }] },
    gates_info: { "20": { label: "Agence Test" } },
    airports: {
      TUN: { name: "Tunis-Carthage", city: "Tunis", country: "Tunisie", time_zone: "Africa/Tunis" },
      IST: { name: "Istanbul", city: "Istanbul", country: "Turquie", time_zone: "Europe/Istanbul" },
    },
    airlines: { TU: { name: "Tunisair" } },
    proposals: [
      {
        sign: "abc123",
        total_duration: 195,
        segment: [
          {
            flight: [
              {
                departure: "TUN",
                arrival: "IST",
                departure_date: "2026-06-01",
                departure_time: "10:00",
                arrival_date: "2026-06-01",
                arrival_time: "14:15",
                duration: 195,
                number: 712,
                marketing_carrier: "TU",
              },
            ],
          },
        ],
        terms: {
          "20": {
            price: 250,
            currency: "eur",
            url: 18000000,
            flights_baggage: [[false]],
            flights_handbags: [["1PC10"]],
          },
        },
      },
    ],
  };

  it("maps prices, times, baggage and affiliate link", () => {
    const offers = normalizeTravelpayoutsGates([gate], params);
    expect(offers).toHaveLength(1);
    const offer = offers[0]!;

    expect(offer.totalPrice).toBe(250);
    expect(offer.currency).toBe("EUR");
    expect(offer.isDemo).toBe(false);
    expect(offer.isEstimated).toBe(false);
    expect(offer.stops).toBe(0);
    expect(offer.durationMinutes).toBe(195);
    expect(offer.airline?.name).toBe("Tunisair");
    expect(offer.departureTime).toBe("2026-06-01T09:00:00.000Z");
    expect(offer.arrivalTime).toBe("2026-06-01T11:15:00.000Z");
    expect(offer.baggage?.checkedBags).toBe(0);
    expect(offer.baggage?.cabinBags).toBe(1);
    expect(offer.providerOfferId).toContain("18000000");
    expect(offer.expiresAt).not.toBeNull();
    expect(offer.bookingUrl!.startsWith("/api/booking/travelpayouts?code=")).toBe(true);

    const code = new URL(offer.bookingUrl!, "https://example.test").searchParams.get("code");
    expect(code).toBeTruthy();
    expect(decodeTravelpayoutsBookingCode(code!)).toMatchObject({
      s: "d9266de5-7578-418f-9ddc-6b176ae45923",
      u: "18000000",
      o: "TUN",
      d: "IST",
      dd: "2026-06-01",
      a: 1,
    });
  });

  it("keeps only purchasable terms with a URL", () => {
    const withoutUrl = structuredClone(gate) as typeof gate;
    delete (withoutUrl.proposals[0]!.terms["20"] as { url?: number }).url;
    expect(normalizeTravelpayoutsGates([withoutUrl], params)).toHaveLength(0);

    const noProposals = structuredClone(gate) as typeof gate;
    noProposals.proposals = [];
    expect(normalizeTravelpayoutsGates([noProposals], params)).toHaveLength(0);
  });
});
