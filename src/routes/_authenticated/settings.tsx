import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Plus, Trash2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — MTX Hub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isSuperAdmin, loading } = usePermissions();
  if (loading) return <Skeleton className="h-64 w-full" />;
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie perfil, sistema e categorias.</p>
      </div>
      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
          <TabsTrigger value="categorias">Categorias de Serviços</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="perfil"><ProfileTab /></TabsContent>
        <TabsContent value="categorias"><CategoriesTab /></TabsContent>
        <TabsContent value="notificacoes"><NotificationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const name = fullName || profile?.full_name || "";
  const avatar = avatarUrl || profile?.avatar_url || "";

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, avatar_url: avatar })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar perfil");
    else {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>Atualize seus dados pessoais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={name} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL do avatar</Label>
          <Input value={avatar} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("category").not("category", "is", null);
      const unique = Array.from(new Set((data ?? []).map((d: any) => d.category).filter(Boolean)));
      return unique as string[];
    },
  });
  const [newCat, setNewCat] = useState("");
  const [editing, setEditing] = useState<{ old: string; value: string } | null>(null);

  const create = async () => {
    if (!newCat.trim()) return;
    const { error } = await supabase
      .from("services")
      .insert({ name: `(Categoria) ${newCat}`, category: newCat, is_active: false });
    if (error) toast.error("Erro ao criar categoria");
    else {
      toast.success("Categoria criada");
      setNewCat("");
      qc.invalidateQueries({ queryKey: ["service-categories"] });
    }
  };

  const rename = async () => {
    if (!editing || !editing.value.trim()) return;
    const { error } = await supabase
      .from("services")
      .update({ category: editing.value })
      .eq("category", editing.old);
    if (error) toast.error("Erro ao renomear");
    else {
      toast.success("Categoria atualizada");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["service-categories"] });
    }
  };

  const remove = async (cat: string) => {
    if (!confirm(`Remover categoria "${cat}" de todos os serviços?`)) return;
    const { error } = await supabase.from("services").update({ category: null }).eq("category", cat);
    if (error) toast.error("Erro ao remover");
    else {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["service-categories"] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias de Serviços</CardTitle>
        <CardDescription>Organize os serviços do catálogo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nova categoria"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <Button onClick={create}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="divide-y rounded-md border">
            {(data ?? []).length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma categoria cadastrada</div>
            )}
            {(data ?? []).map((cat) => (
              <div key={cat} className="flex items-center justify-between p-3">
                {editing?.old === cat ? (
                  <div className="flex flex-1 gap-2">
                    <Input
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      autoFocus
                    />
                    <Button size="sm" onClick={rename}>Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{cat}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing({ old: cat, value: cat })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(cat)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { user } = useAuth();
  const key = `mtx-notifs-${user?.id}`;
  const initial =
    typeof window !== "undefined" && localStorage.getItem(key)
      ? JSON.parse(localStorage.getItem(key)!)
      : { tarefas: true, reunioes: true, oportunidades: false };
  const [prefs, setPrefs] = useState(initial);

  const update = (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(key, JSON.stringify(next));
    toast.success("Preferências salvas");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Receba alertas dos módulos que você acompanha</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        {[
          { k: "tarefas", label: "Novas tarefas atribuídas a mim" },
          { k: "reunioes", label: "Lembretes de reuniões agendadas" },
          { k: "oportunidades", label: "Atualizações em oportunidades" },
        ].map((item) => (
          <div key={item.k} className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor={item.k}>{item.label}</Label>
            <Switch id={item.k} checked={!!prefs[item.k]} onCheckedChange={(v) => update(item.k, v)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
