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

const INVITE_TTL_HOURS = 48;

async function assertSuperAdmin(supabase: any, callerId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (error) throw error;
  const isSuper = (data ?? []).some((r: { role: string }) => r.role === "super_admin");
  if (!isSuper) throw new Error("Apenas super_admin pode executar esta ação.");
}

function generateToken(): string {
  // 256 bits of entropy
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * Create a new invite. Returns the token so the caller can render the link.
 */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        fullName: z.string().min(1).max(120),
        role: z.enum(APP_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    await assertSuperAdmin(supabase, callerId);

    const email = data.email.trim().toLowerCase();

    // Block if there is already an active user with this email
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const token = generateToken();
    const expires_at = buildExpiry();

    const { data: inserted, error } = await supabaseAdmin
      .from("user_invites")
      .insert({
        token,
        email,
        full_name: data.fullName.trim(),
        role: data.role,
        invited_by: callerId,
        expires_at,
      })
      .select("id, token, email, full_name, role, expires_at")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "invite_created",
      entity_type: "user_invite",
      entity_id: inserted.id,
      description: `Convite criado para ${email} com permissão ${data.role}`,
    });

    return { invite: inserted };
  });

/**
 * Resend an invite — generates a new token and pushes expiry to +48h.
 */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    await assertSuperAdmin(supabase, callerId);

    const { data: invite, error: fetchErr } = await supabaseAdmin
      .from("user_invites")
      .select("id, used, email")
      .eq("id", data.inviteId)
      .single();
    if (fetchErr) throw fetchErr;
    if (invite.used) throw new Error("Convite já utilizado.");

    const token = generateToken();
    const expires_at = buildExpiry();

    const { data: updated, error } = await supabaseAdmin
      .from("user_invites")
      .update({ token, expires_at })
      .eq("id", data.inviteId)
      .select("id, token, email, full_name, role, expires_at")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "invite_resent",
      entity_type: "user_invite",
      entity_id: updated.id,
      description: `Convite reenviado para ${invite.email}`,
    });

    return { invite: updated };
  });

/**
 * Revoke an invite without creating an account.
 */
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ inviteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    await assertSuperAdmin(supabase, callerId);

    const { data: invite, error } = await supabaseAdmin
      .from("user_invites")
      .delete()
      .eq("id", data.inviteId)
      .select("id, email")
      .single();
    if (error) throw error;

    await supabaseAdmin.from("activity_logs").insert({
      user_id: callerId,
      action: "invite_revoked",
      entity_type: "user_invite",
      entity_id: invite.id,
      description: `Convite revogado para ${invite.email}`,
    });

    return { ok: true };
  });

/**
 * Public endpoint — accept an invite. Creates the auth user + profile.
 * Returns nothing sensitive; the client then signs in with the chosen password.
 */
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(16).max(128),
        password: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: invite, error: invErr } = await supabaseAdmin
      .from("user_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) throw new Error("Convite inválido.");
    if (invite.used) throw new Error("Convite já utilizado.");
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error("Convite expirado.");
    }

    // Create the auth user (email confirmed so they can sign in immediately).
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: invite.full_name },
      });
    if (createErr) throw createErr;

    const newUserId = created.user?.id;
    if (!newUserId) throw new Error("Falha ao criar conta.");

    // Ensure profile + role match the invite (handle_new_user trigger created defaults).
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: invite.full_name, email: invite.email, is_active: true })
      .eq("id", newUserId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: invite.role });

    await supabaseAdmin
      .from("user_invites")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", invite.id);

    await supabaseAdmin.from("activity_logs").insert({
      user_id: newUserId,
      action: "invite_accepted",
      entity_type: "user_invite",
      entity_id: invite.id,
      description: `Conta criada a partir de convite (${invite.email})`,
    });

    // Notificação especial para jovem_aprendizes completarem o perfil
    if (invite.role === "jovem_aprendiz") {
      await supabaseAdmin.from("notifications").insert({
        user_id: newUserId,
        title: "Complete seu perfil na MTX!",
        message:
          "Clique aqui para preencher suas informações na área de Jovens. Quanto mais completo seu perfil, melhor sua equipe te conhece!",
        type: "geral",
        entity_type: "self_profile",
        entity_id: null,
        read: false,
      });
    }

    return { ok: true, email: invite.email };
  });
