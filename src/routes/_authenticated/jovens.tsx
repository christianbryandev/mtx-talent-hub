import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/jovens")({
  head: () => ({ meta: [{ title: "Jovens — MTX Hub" }] }),
  component: () => (
    <ComingSoon
      title="Jovens"
      description="Gestão de jovens em formação, trilhas e desenvolvimento"
      icon={<Users className="h-6 w-6" />}
    />
  ),
});
