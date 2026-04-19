import { ConfidenceResult } from "@/lib/confidenceScore";

const levelStyles = {
  strong: "text-gain",
  neutral: "text-yellow-400",
  risky: "text-loss",
};

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceResult; compact?: boolean }) {
  return (
    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${levelStyles[confidence.level]} ${
          confidence.level === "strong" ? "animate-dot-pulse" : ""
        }`}
        style={{ backgroundColor: "currentColor" }}
      />
      Confidence: <span className={`font-semibold ${levelStyles[confidence.level]}`}>{confidence.label}</span>
    </p>
  );
}
