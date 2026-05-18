import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — MTX Hub" }] }),
  component: () => (
    <ComingSoon
      title="Clientes"
      description="Empresas atendidas pela operação MTX"
      icon={<Building2 className="h-6 w-6" />}
    />
  ),
});
