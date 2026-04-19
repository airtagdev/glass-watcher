import { useState, useRef, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface PullToRefreshProps {
  children: ReactNode;
  queryKeys?: string[][];
}

export function PullToRefresh({ children, queryKeys }: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.5, 120));
      }
    },
    [pulling, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold);
      if (queryKeys && queryKeys.length > 0) {
        await Promise.all(queryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
      } else {
        await queryClient.invalidateQueries();
      }
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, refreshing, queryKeys, queryClient]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: refreshing ? 56 : pullDistance }}
        >
          {/* Branded spinner — three pulsing dots in primary color */}
          <div
            className="flex items-center gap-1.5"
            style={{
              opacity: progress,
              transform: `scale(${0.6 + progress * 0.4})`,
              transition: refreshing ? "none" : "transform 0.1s",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full bg-primary ${refreshing ? "animate-bounce" : ""}`}
                style={{
                  animationDelay: refreshing ? `${i * 0.12}s` : undefined,
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.6)",
                }}
              />
            ))}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
