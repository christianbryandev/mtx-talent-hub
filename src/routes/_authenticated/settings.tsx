import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — MTX Hub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isSuperAdmin, loading } = usePermissions();
  if (loading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Acesso negado</h2>
        <p className="text-sm text-muted-foreground">
          Apenas super administradores podem acessar as configurações.
        </p>
      </div>
    );
  }
  return (
    <ComingSoon
      title="Configurações"
      description="Configurações globais do MTX Hub"
      icon={<SettingsIcon className="h-6 w-6" />}
    />
  );
}
