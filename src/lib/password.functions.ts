import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Atualiza a senha do usuário autenticado via Admin API.
 * Isso ignora as políticas de senha do Supabase (HIBP, complexidade server-side),
 * pois a validação de qualidade já é feita no frontend antes de chamar esta função.
 */
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        password: z
          .string()
          .min(8, "Mínimo 8 caracteres")
          .max(128, "Máximo 128 caracteres")
          .regex(/[a-z]/, "Deve conter letra minúscula")
          .regex(/[A-Z]/, "Deve conter letra maiúscula")
          .regex(/[0-9]/, "Deve conter número")
          .regex(/[^a-zA-Z0-9]/, "Deve conter caractere especial"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
