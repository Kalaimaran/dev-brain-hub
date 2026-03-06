import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ title, value, delta, deltaLabel = "vs yesterday", icon: Icon, iconColor = "text-violet-400", iconBg = "bg-violet-500/10", loading = false }) {
  const isPositive = delta > 0;
  const isNeutral  = delta === 0 || delta == null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-7 w-20 rounded bg-muted animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-foreground tabular-nums">{value ?? "—"}</p>
      )}

      {delta != null && !loading && (
        <div className="flex items-center gap-1">
          {isNeutral ? (
            <Minus className="h-3 w-3 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={cn("text-[11px] font-medium", isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-400" : "text-red-400")}>
            {isPositive ? "+" : ""}{delta} {deltaLabel}
          </span>
        </div>
      )}
    </div>
  );
}
