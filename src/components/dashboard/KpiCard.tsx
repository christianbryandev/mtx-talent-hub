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

const ACCENTS = {
  primary: "text-primary bg-primary/15",
  info: "text-info bg-info/15",
  success: "text-success bg-success/15",
  warning: "text-warning bg-warning/15",
};

export function KpiCard({ label, value, hint, icon, trend, accent = "primary" }: KpiCardProps) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg", ACCENTS[accent])}>
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
