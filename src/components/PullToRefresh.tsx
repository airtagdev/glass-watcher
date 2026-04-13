import { useState, useRef, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

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
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <RefreshCw
            className={`w-5 h-5 text-primary transition-transform ${refreshing ? "animate-spin" : ""}`}
            style={{ opacity: progress, transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
