import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Save, Trash2, UserCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordInput } from "@/components/ui/password-input";
import { ROLE_LABELS } from "@/types";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — MTX Hub" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, updateAvatar } = useAuth();
  const { role } = usePermissions();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [uploading, setUploading] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: young } = useQuery({
    queryKey: ["my-young-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("young_people")
        .select("id")
        .eq("profile_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  const saveName = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Nome não pode ficar vazio");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nome atualizado!");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleAvatarUpload(file: File) {
    if (!user) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/profile-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;

      // Sincroniza com young_people se existir
      if (young?.id) {
        await supabase.from("young_people").update({ photo_url: url }).eq("id", young.id);
        qc.invalidateQueries({ queryKey: ["my-young-profile"] });
      }
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["my-profile-avatar"] });
      toast.success("Foto atualizada!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (young?.id) {
      await supabase.from("young_people").update({ photo_url: null }).eq("id", young.id);
      qc.invalidateQueries({ queryKey: ["my-young-profile"] });
    }
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    qc.invalidateQueries({ queryKey: ["my-profile-avatar"] });
    toast.success("Foto removida");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error("Nova senha precisa ter ao menos 8 caracteres");
    if (newPwd !== confirmPwd) return toast.error("As senhas não coincidem");
    if (!user?.email) return;
    setChangingPwd(true);
    try {
      // Revalida senha atual
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signErr) throw new Error("Senha atual incorreta");

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "password_changed",
        entity_type: "profiles",
        entity_id: user.id,
        description: "Usuário alterou a própria senha",
      });

      toast.success("Senha alterada com sucesso!");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChangingPwd(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const initials = (profile.full_name ?? profile.email ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-primary/40">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-mtx text-xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
              title="Trocar foto"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.full_name ?? "Sem nome"}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {role && <Badge variant="outline">{ROLE_LABELS[role]}</Badge>}
              {profile.avatar_url && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveAvatar}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover foto
                </Button>
              )}
            </div>
          </div>
        </div>

        {young?.id && (
          <Link
            to="/meu-perfil"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <UserCircle className="h-4 w-4" />
            Ver meu perfil completo na área de Jovens →
          </Link>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Dados básicos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={profile.email ?? ""} disabled />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => saveName.mutate()} disabled={saveName.isPending}>
            {saveName.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Alterar senha</h2>
        <form onSubmit={handleChangePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Senha atual</Label>
            <PasswordInput value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} autoComplete="current-password" required />
          </div>
          <div>
            <Label>Nova senha (mín. 8)</Label>
            <PasswordInput value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" required />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <PasswordInput value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={changingPwd}>
              {changingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar senha
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
