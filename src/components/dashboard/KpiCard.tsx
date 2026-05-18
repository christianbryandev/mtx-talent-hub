import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  trend?: { value: string; positive?: boolean };
  accent?: "primary" | "info" | "success" | "warning";
}

const ACCENTS: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-mtx-glow",
  info: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-mtx-glow",
  success: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
  warning: "bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-mtx-glow-orange",
};

export function KpiCard({ label, value, hint, icon, trend, accent = "primary" }: KpiCardProps) {
  return (
    <Card className="group relative overflow-hidden border-white/5 bg-card/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-mtx-glow">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: "var(--gradient-mtx)" }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("grid h-10 w-10 place-items-center rounded-xl", ACCENTS[accent])}>
            {icon}
          </div>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive",
              )}
            >
              {trend.positive ? "▲" : "▼"} {trend.value}
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          {hint && <div className="mt-2 text-[11px] text-muted-foreground/70">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
