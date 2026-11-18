import { describe, expect, it } from "vitest";
import {
  addMinutes,
  formatDurationLabel,
  minutesBetween,
  parseIsoDurationMinutes,
  totalItineraryMinutes,
} from "./duration";

describe("parseIsoDurationMinutes", () => {
  it("parses hours and minutes", () => {
    expect(parseIsoDurationMinutes("PT12H35M")).toBe(755);
  });

  it("parses days", () => {
    expect(parseIsoDurationMinutes("P1DT2H")).toBe(1560);
  });

  it("returns zero for empty or invalid input", () => {
    expect(parseIsoDurationMinutes(null)).toBe(0);
    expect(parseIsoDurationMinutes("")).toBe(0);
    expect(parseIsoDurationMinutes("12h")).toBe(0);
  });
});

describe("minutesBetween", () => {
  it("returns rounded positive differences", () => {
    expect(minutesBetween("2026-01-01T10:00:00Z", "2026-01-01T12:30:00Z")).toBe(150);
  });

  it("never returns a negative duration", () => {
    expect(minutesBetween("2026-01-01T12:00:00Z", "2026-01-01T10:00:00Z")).toBe(0);
  });
});

describe("totalItineraryMinutes", () => {
  it("sums explicit durations", () => {
    expect(
      totalItineraryMinutes([
        {
          durationMinutes: 120,
          departureTime: "2026-01-01T10:00:00Z",
          arrivalTime: "2026-01-01T12:00:00Z",
          stops: 0,
          segments: [],
        },
        {
          durationMinutes: 90,
          departureTime: "2026-01-05T10:00:00Z",
          arrivalTime: "2026-01-05T11:30:00Z",
          stops: 0,
          segments: [],
        },
      ]),
    ).toBe(210);
  });

  it("falls back to timestamps then segment durations", () => {
    expect(
      totalItineraryMinutes([
        {
          durationMinutes: 0,
          departureTime: "2026-01-01T10:00:00Z",
          arrivalTime: "2026-01-01T13:00:00Z",
          stops: 0,
          segments: [],
        },
        {
          durationMinutes: 0,
          departureTime: "",
          arrivalTime: "",
          stops: 1,
          segments: [{ durationMinutes: 60 }, { durationMinutes: 40 }],
        },
      ]),
    ).toBe(280);
  });

  it("returns zero for no itineraries", () => {
    expect(totalItineraryMinutes([])).toBe(0);
  });
});

describe("formatDurationLabel", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationLabel(755)).toBe("12h35");
    expect(formatDurationLabel(120)).toBe("2h");
    expect(formatDurationLabel(30)).toBe("30min");
  });
});

describe("addMinutes", () => {
  it("adds minutes and returns an ISO string", () => {
    expect(addMinutes("2026-01-01T10:00:00.000Z", 90)).toBe("2026-01-01T11:30:00.000Z");
  });
});
