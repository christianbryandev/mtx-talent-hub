import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({ meta: [{ title: "Serviços — MTX Hub" }] }),
  component: () => (
    <ComingSoon title="Serviços" description="Catálogo de serviços oferecidos pela MTX" icon={<Briefcase className="h-6 w-6" />} />
  ),
});
