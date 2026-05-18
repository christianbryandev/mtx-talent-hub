import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

    // Verify caller is super_admin
    const { data: rows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (roleErr) throw roleErr;
    const isSuperAdmin = (rows ?? []).some((r) => r.role === "super_admin");
    if (!isSuperAdmin) throw new Error("Apenas super_admin pode excluir usuários.");

    // Delete auth user (cascades nothing automatically — clean app tables first)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
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
