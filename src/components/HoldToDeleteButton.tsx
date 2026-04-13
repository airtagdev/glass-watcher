import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";

interface HoldToDeleteButtonProps {
  onDelete: () => void;
  label: string;
  holdDuration?: number;
}

export function HoldToDeleteButton({ onDelete, label, holdDuration = 3000 }: HoldToDeleteButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startTime = useRef(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTime.current;
    const pct = Math.min(elapsed / holdDuration, 1);
    setProgress(pct);
    if (pct >= 1) {
      setHolding(false);
      setProgress(0);
      onDelete();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [holdDuration, onDelete]);

  const handleStart = useCallback(() => {
    startTime.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handleEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      className="relative w-full py-2.5 rounded-xl text-sm font-semibold overflow-hidden select-none"
      style={{ background: "hsl(var(--loss) / 0.2)", color: "hsl(var(--loss))" }}
    >
      {/* Progress fill */}
      <div
        className="absolute inset-0 rounded-xl transition-none"
        style={{
          background: "hsl(0 80% 50%)",
          width: `${progress * 100}%`,
          opacity: holding ? 1 : 0,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-1.5">
        <Trash2 className="w-3.5 h-3.5" />
        {holding ? "Hold to confirm…" : label}
      </span>
    </button>
  );
}
