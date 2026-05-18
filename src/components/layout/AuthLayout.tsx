import { ReactNode } from "react";
import mtxLogo from "@/assets/mtx-hub-logo.png";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="mtx-ambient relative min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex items-center justify-center">
        <img
          src={mtxLogo}
          alt="MTX Hub"
          className="h-14 w-auto drop-shadow-[0_0_24px_rgba(192,38,211,0.45)]"
          draggable={false}
        />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-8 shadow-mtx-glow backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "var(--gradient-mtx)" }}
        />
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
