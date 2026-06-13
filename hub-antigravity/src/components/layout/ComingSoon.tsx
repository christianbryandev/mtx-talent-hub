import { ReactNode } from "react";
import { Hammer } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex min-h-[60vh] items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/40 p-10">
        <div className="max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
            {icon ?? <Hammer className="h-6 w-6" />}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Em construção
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Este módulo será implementado em breve. Estamos preparando algo
            especial para multiplicar ainda mais talentos.
          </p>
        </div>
      </div>
    </div>
  );
}
