import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      {/* Subtle gold glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute left-1/2 top-0 h-[480px] w-[680px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.78 0.14 80 / 0.5) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="mb-8 flex items-center gap-2 text-foreground">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight">MTX Hub</span>
      </div>

      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {children}

        {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        MTX — Multiplicando Talentos · Transformação socioeconômica
      </p>
    </div>
  );
}
