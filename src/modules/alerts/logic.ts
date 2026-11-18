/**
 * Decides whether a price observation should create a notification.
 * A notification is created only when:
 *  - the observed price is at or below the target,
 *  - and the same price was not already notified (deduplication).
 */
export function shouldNotifyPrice(input: {
  observedPrice: number;
  targetPrice: number;
  lastNotifiedPrice: number | null;
  enabled?: boolean;
}): boolean {
  const { observedPrice, targetPrice, lastNotifiedPrice, enabled = true } = input;

  if (!enabled) return false;
  if (!Number.isFinite(observedPrice) || observedPrice <= 0) return false;
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return false;
  if (observedPrice > targetPrice) return false;
  if (lastNotifiedPrice !== null && Math.abs(lastNotifiedPrice - observedPrice) < 0.001) {
    return false;
  }
  return true;
}

export function alertProgress(observedPrice: number | null, targetPrice: number): number {
  if (!observedPrice || observedPrice <= 0) return 0;
  if (targetPrice <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((targetPrice / observedPrice) * 100)));
}
