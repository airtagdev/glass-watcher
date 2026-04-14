export type ConfidenceLevel = "strong" | "neutral" | "risky";

export interface ConfidenceResult {
  score: number; // 0-100
  level: ConfidenceLevel;
  label: string;
  emoji: string;
}

/**
 * Computes a simple confidence score based on available market data.
 * Factors: momentum (change%), volatility (day range), 52-week position.
 */
export function computeConfidence(opts: {
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  high52w?: number;
  low52w?: number;
  price?: number;
}): ConfidenceResult {
  let score = 50; // start neutral

  // 1. Momentum: positive change is bullish
  const cp = opts.changePercent ?? 0;
  if (cp > 3) score += 20;
  else if (cp > 1) score += 12;
  else if (cp > 0) score += 5;
  else if (cp > -1) score -= 5;
  else if (cp > -3) score -= 12;
  else score -= 20;

  // 2. Volatility: tight day range = stable
  if (opts.dayHigh && opts.dayLow && opts.price) {
    const dayRange = ((opts.dayHigh - opts.dayLow) / opts.price) * 100;
    if (dayRange < 1) score += 10;
    else if (dayRange < 2.5) score += 5;
    else if (dayRange > 5) score -= 10;
    else if (dayRange > 3) score -= 5;
  }

  // 3. 52-week position: higher in range = stronger
  if (opts.high52w && opts.low52w && opts.price) {
    const range = opts.high52w - opts.low52w;
    if (range > 0) {
      const position = (opts.price - opts.low52w) / range; // 0-1
      score += Math.round((position - 0.5) * 20); // -10 to +10
    }
  }

  score = Math.max(0, Math.min(100, score));

  let level: ConfidenceLevel;
  let label: string;
  let emoji: string;

  if (score >= 60) {
    level = "strong";
    label = "Strong";
    emoji = "🟢";
  } else if (score >= 40) {
    level = "neutral";
    label = "Neutral";
    emoji = "🟡";
  } else {
    level = "risky";
    label = "Risky";
    emoji = "🔴";
  }

  return { score, level, label, emoji };
}
