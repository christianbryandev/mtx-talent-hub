import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: [{ title: "CRM — MTX Hub" }] }),
  component: () => (
    <ComingSoon title="CRM Comercial" description="Funil, leads, oportunidades e propostas" icon={<Target className="h-6 w-6" />} />
  ),
});
