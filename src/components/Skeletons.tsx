import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton — matches glass-card aesthetic.
 * Use as placeholders for loading lists/cards.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-r from-glass/40 via-glass-border/40 to-glass/40 bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

export function TickerCardSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-2.5 w-28" />
      </div>
      <div className="space-y-2 items-end flex flex-col">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  );
}

export function TickerListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in">
          <TickerCardSkeleton />
        </div>
      ))}
    </div>
  );
}
