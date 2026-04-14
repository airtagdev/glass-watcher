import { ConfidenceResult } from "@/lib/confidenceScore";

const levelStyles = {
  strong: "text-gain",
  neutral: "text-yellow-400",
  risky: "text-loss",
};

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceResult; compact?: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      Confidence Score: <span className={`font-semibold ${levelStyles[confidence.level]}`}>{confidence.label}</span>
    </p>
  );
}
