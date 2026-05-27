import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = 18,
}: {
  rating: number; // 0-5
  size?: number;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= rating
              ? "text-[var(--tradex-orange-500)] fill-[var(--tradex-orange-500)]"
              : "text-[var(--neutral-700)]",
          )}
          fill={i <= rating ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function computeRating(args: {
  pnlPct: number;
  winRate: number;
  closedTrades: number;
}): { stars: number; verdict: string; subtext: string } {
  const { pnlPct, winRate, closedTrades } = args;
  if (closedTrades < 3) {
    return {
      stars: 0,
      verdict: "Too early to call",
      subtext: `${closedTrades} closed trade${closedTrades === 1 ? "" : "s"} so far — needs at least 3 to score.`,
    };
  }
  const trades = `Based on ${closedTrades} closed paper trade${closedTrades === 1 ? "" : "s"}`;
  if (pnlPct > 5 && winRate >= 60) {
    return { stars: 5, verdict: "Excellent", subtext: `${trades}. Past performance is not a guarantee of future results.` };
  }
  if (pnlPct > 0 && winRate >= 50) {
    return { stars: 4, verdict: "Good", subtext: `${trades}. Past performance is not a guarantee of future results.` };
  }
  if (pnlPct > 0) {
    return { stars: 3, verdict: "Mixed", subtext: `${trades}. Net positive but inconsistent.` };
  }
  if (winRate >= 40) {
    return { stars: 2, verdict: "Below par", subtext: `${trades}. Net negative — the subscription may not be worth its cost.` };
  }
  return {
    stars: 1,
    verdict: "Poor",
    subtext: `${trades}. Strongly negative — recommend dropping this channel.`,
  };
}
