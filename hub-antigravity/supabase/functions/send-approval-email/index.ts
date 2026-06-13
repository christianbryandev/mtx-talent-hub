import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getEmailHtml } from "../_shared/templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configurações do Supabase ausentes");
    }

    // --- AuthN/AuthZ: only admins/super_admins may approve applications ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles, error: rolesError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = !rolesError && (roles ?? []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- end auth check ---

    const body = await req.json();
    console.log("Recebendo requisição:", JSON.stringify(body, null, 2));
    const { candidato_id, email, nome } = body;

    if (!email || !nome) {
      console.error("Erro: E-mail e nome são obrigatórios");
      throw new Error("E-mail e nome são obrigatórios");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const appUrl = "https://mtxmarketing.com";
    const redirectTo = `${appUrl}/criar-senha`;

    let inviteData: any;
    let { data, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { 
        redirectTo,
        data: { full_name: nome }
      },
    });

    if (inviteError && /already.*registered|already exists/i.test(inviteError.message)) {
      console.log("Usuário já existe, gerando magic link para:", email);
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { 
          redirectTo,
          data: { full_name: nome }
        },
      });
      if (retry.error) throw retry.error;
      inviteData = retry.data;
    } else if (inviteError) {
      throw inviteError;
    } else {
      inviteData = data;
    }

    if (candidato_id) {
      const { error: updateError } = await supabaseAdmin
        .from("young_applications")
        .update({ status: "aprovado" })
        .eq("id", candidato_id);
      if (updateError) throw updateError;
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurada. E-mail não enviado.");
    } else {
      const html = getEmailHtml({
        nome,
        title: `Parabéns, ${nome}!`,
        body: `
          <p>É com grande alegria que informamos que sua inscrição no programa da <span class="highlight">MTX Multiplicando Talentos</span> foi aprovada!</p>
          <p>Você agora faz parte da nossa trilha de transformação. Clique no botão abaixo para <span class="highlight">definir sua senha de acesso</span> e começar sua jornada no MTX Hub.</p>
        `,
        buttonText: "Criar Senha e Acessar →",
        buttonUrl: inviteData.properties.action_link,
        warning: "Este link de acesso é pessoal e expira em 24 horas.",
        appUrl
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "MTX Multiplicando Talentos <noreply@mtxmarketing.com>",
          to: [email],
          subject: "🎉 Você foi aprovado! Acesse o MTX Hub",
          html: html,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(`Erro Resend (${res.status}): ${JSON.stringify(responseData)}`);
      }
      
      return new Response(JSON.stringify({ success: true, resend_response: responseData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Modo de teste ou ID não fornecido" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função send-approval-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
