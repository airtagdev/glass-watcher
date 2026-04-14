import { ConfidenceResult } from "@/lib/confidenceScore";

const levelStyles = {
  strong: "bg-gain/15 text-gain",
  neutral: "bg-yellow-500/15 text-yellow-400",
  risky: "bg-loss/15 text-loss",
};

export function ConfidenceBadge({ confidence, compact }: { confidence: ConfidenceResult; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${levelStyles[confidence.level]}`}>
      <span>{confidence.emoji}</span>
      {!compact && <span>{confidence.label}</span>}
      {!compact && <span className="opacity-70">{confidence.score}</span>}
    </span>
  );
}
