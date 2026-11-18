import { describe, expect, it } from "vitest";
import {
  addDays,
  buildSearchHref,
  formatDuration,
  formatMoney,
  intlLocale,
  pluralize,
} from "./utils";

describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45min");
  });

  it("formats whole hours without minutes", () => {
    expect(formatDuration(180)).toBe("3h");
  });

  it("pads minutes to two digits", () => {
    expect(formatDuration(750)).toBe("12h30");
  });

  it("clamps negative input to zero", () => {
    expect(formatDuration(-10)).toBe("0min");
  });
});

describe("formatMoney", () => {
  it("returns an em dash for missing or invalid amounts", () => {
    expect(formatMoney(null, "TND")).toBe("—");
    expect(formatMoney(undefined, "EUR")).toBe("—");
    expect(formatMoney("not-a-number", "EUR")).toBe("—");
  });

  it("formats TND with three decimals and no trailing zeros", () => {
    expect(formatMoney(123.456, "TND", "en-GB")).toContain("123.456");
  });
});

describe("buildSearchHref", () => {
  it("includes the return date only for round trips", () => {
    const href = buildSearchHref({
      origin: "TUN",
      destination: "IST",
      departureDate: "2026-12-20",
      returnDate: "2026-12-27",
      tripType: "ROUND_TRIP",
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "ECONOMY",
    });

    expect(href.startsWith("/search?")).toBe(true);
    expect(href).toContain("origin=TUN");
    expect(href).toContain("destination=IST");
    expect(href).toContain("returnDate=2026-12-27");
    expect(href).toContain("auto=1");
  });

  it("omits the return date for one-way trips", () => {
    const href = buildSearchHref({
      origin: "TUN",
      destination: "CDG",
      departureDate: "2026-12-20",
      returnDate: null,
      tripType: "ONE_WAY",
      adults: 2,
      children: 1,
      infants: 0,
      cabinClass: "BUSINESS",
    });

    expect(href).not.toContain("returnDate");
    expect(href).toContain("adults=2");
  });
});

describe("helpers", () => {
  it("maps locales to Intl locales with a fallback", () => {
    expect(intlLocale("fr")).toBe("fr-FR");
    expect(intlLocale("ar")).toBe("ar-TN");
    expect(intlLocale("xx")).toBe("fr-FR");
  });

  it("pluralizes based on count", () => {
    expect(pluralize(1, "offer", "offers")).toBe("offer");
    expect(pluralize(2, "offer", "offers")).toBe("offers");
  });

  it("adds days without mutating the input date", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const next = addDays(base, 3);
    expect(next.toISOString().slice(0, 10)).toBe("2026-01-04");
    expect(base.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});
