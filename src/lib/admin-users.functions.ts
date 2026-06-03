import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const APP_ROLES = [
  "super_admin",
  "admin",
  "comercial",
  "jovem_aprendiz",
  "cliente",
] as const;

async function assertSuperAdmin(supabase: any, callerId: string) {
  const { data: rows, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (error) throw error;
  const isSuper = (rows ?? []).some((r: { role: string }) => r.role === "super_admin");
  if (!isSuper) throw new Error("Apenas super_admin pode executar esta ação.");
}

/**
 * Delete a user (auth + profile). Only super_admin may call this.
 */
export const deleteAuthUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;

    if (data.userId === callerId) {
      throw new Error("Você não pode excluir o próprio usuário.");
    }

    await assertSuperAdmin(supabase, callerId);

    // Sign out user first to disconnect from app
    await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    // Deleting the profile will cascade to young_people if configured
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "user_deleted",
      entity_type: "user",
      entity_id: data.userId,
      description: `Usuário ${data.userId} excluído`,
    });

    return { ok: true };
  });

/**
 * Invite a new user by email and assign an initial role.
 */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().min(1).max(120).optional(),
        role: z.enum(APP_ROLES).default("jovem_aprendiz"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    await assertSuperAdmin(supabase, callerId);

    const redirectTo =
      import.meta.env.VITE_LOVABLE_APP_URL ??
      import.meta.env.VITE_SITE_URL ??
      "https://app.mtxhub.com.br";

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.fullName ?? null },
        redirectTo,
      },
    );
    if (error) throw error;

    const newUserId = invited.user?.id;
    if (!newUserId) throw new Error("Convite enviado, mas usuário não retornado.");

    // Replace default role with the chosen one
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (insErr) throw insErr;

    if (data.fullName) {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.fullName })
        .eq("id", newUserId);
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "user_invited",
      entity_type: "user",
      entity_id: newUserId,
      description: `Convite enviado para ${data.email} com permissão ${data.role}`,
    });

    return { ok: true, userId: newUserId };
  });

/**
 * Activate or deactivate a user. Inactive users cannot sign in.
 */
export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        active: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    if (data.userId === callerId && !data.active) {
      throw new Error("Você não pode desativar o próprio usuário.");
    }
    await assertSuperAdmin(supabase, callerId);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.active })
      .eq("id", data.userId);
    if (error) throw error;

    // Force sign-out for deactivated users
    if (!data.active) {
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: data.active ? "user_activated" : "user_deactivated",
      entity_type: "user",
      entity_id: data.userId,
      description: `Usuário ${data.active ? "ativado" : "desativado"}`,
    });

    return { ok: true };
  });

/**
 * Change a user's role. Only super_admin may call this.
 */
export const changeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        newRole: z.enum(APP_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;

    if (data.userId === callerId) {
      throw new Error("Você não pode alterar sua própria permissão.");
    }

    await assertSuperAdmin(supabase, callerId);

    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw delErr;

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.newRole });
    if (insErr) throw insErr;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "role_changed",
      entity_type: "user",
      entity_id: data.userId,
      description: `Permissão alterada para ${data.newRole}`,
    });

    return { ok: true };
  });

