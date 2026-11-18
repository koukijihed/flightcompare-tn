import type { PricePredictionDTO } from "@/types/flight";

export type PriceObservation = { price: number; recordedAt: Date | string };

/**
 * Statistical baseline (no machine learning): median, observed range and a
 * least-squares trend fitted on the daily minimum price.
 * Confidence reflects sample size and coverage — never a guarantee.
 */
export function computePricePrediction(
  observations: PriceObservation[],
  currency = "TND",
  now: Date = new Date(),
): PricePredictionDTO {
  const cleaned = observations
    .map((observation) => ({
      price: Number(observation.price),
      recordedAt: new Date(observation.recordedAt),
    }))
    .filter(
      (observation) =>
        Number.isFinite(observation.price) &&
        observation.price > 0 &&
        !Number.isNaN(observation.recordedAt.getTime()),
    )
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  const base: PricePredictionDTO = {
    currentPrice: null,
    currency,
    observedMin: null,
    observedMax: null,
    observedMedian: null,
    trend: "UNKNOWN",
    estimatedChangePct: null,
    confidence: "LOW",
    sampleCount: 0,
    coverageDays: 0,
    modelUpdatedAt: now.toISOString(),
    disclaimer:
      "Projection statistique indicative — ne constitue pas une garantie de prix.",
  };

  if (cleaned.length === 0) return base;

  // Daily minimum to avoid over-weighting days with many checks.
  const daily = new Map<string, number>();
  for (const observation of cleaned) {
    const key = observation.recordedAt.toISOString().slice(0, 10);
    const existing = daily.get(key);
    daily.set(key, existing === undefined ? observation.price : Math.min(existing, observation.price));
  }

  const points = [...daily.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, price], index) => ({
      index,
      price,
      time: new Date(`${day}T00:00:00.000Z`).getTime(),
    }));

  const prices = points.map((point) => point.price).sort((a, b) => a - b);
  const min = prices[0]!;
  const max = prices[prices.length - 1]!;
  const median =
    prices.length % 2 === 1
      ? prices[(prices.length - 1) / 2]!
      : (prices[prices.length / 2 - 1]! + prices[prices.length / 2]!) / 2;

  const current = cleaned[cleaned.length - 1]!.price;
  const coverageDays =
    points.length > 1
      ? Math.max(
          1,
          Math.round(
            (points[points.length - 1]!.time - points[0]!.time) / (24 * 60 * 60 * 1000),
          ) + 1,
        )
      : 1;

  let trend: PricePredictionDTO["trend"] = "UNKNOWN";
  let estimatedChangePct: number | null = null;

  if (points.length >= 3) {
    // Least squares slope in price units per day.
    const n = points.length;
    const meanX = points.reduce((sum, point) => sum + point.index, 0) / n;
    const meanY = points.reduce((sum, point) => sum + point.price, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (const point of points) {
      numerator += (point.index - meanX) * (point.price - meanY);
      denominator += (point.index - meanX) ** 2;
    }
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const relative = meanY === 0 ? 0 : slope / meanY;

    trend = relative < -0.015 ? "DOWN" : relative > 0.015 ? "UP" : "STABLE";
    estimatedChangePct = Math.max(
      -40,
      Math.min(40, Math.round(((slope * 7) / Math.max(current, 1)) * 1000) / 10),
    );
  }

  const confidence: PricePredictionDTO["confidence"] =
    points.length >= 12 && coverageDays >= 7
      ? "HIGH"
      : points.length >= 5 && coverageDays >= 3
        ? "MEDIUM"
        : "LOW";

  return {
    currentPrice: Math.round(current * 100) / 100,
    currency,
    observedMin: Math.round(min * 100) / 100,
    observedMax: Math.round(max * 100) / 100,
    observedMedian: Math.round(median * 100) / 100,
    trend,
    estimatedChangePct,
    confidence,
    sampleCount: cleaned.length,
    coverageDays,
    modelUpdatedAt: cleaned[cleaned.length - 1]!.recordedAt.toISOString(),
    disclaimer: base.disclaimer,
  };
}
