import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "re_WnMrGQb9_5WLbGYytSN71N5wicb1vB1rD";
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
    const body = await req.json();
    console.log("Recebendo requisição:", JSON.stringify(body, null, 2));
    const { candidato_id, email, nome } = body;

    if (!email || !nome) {
      console.error("Erro: E-mail e nome são obrigatórios");
      throw new Error("E-mail e nome são obrigatórios");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configurações do Supabase ausentes");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Gerar link de acesso (invite para novos, magiclink para existentes)
    const redirectTo = `${new URL(req.url).origin}/dashboard`;
    let inviteData: any;
    let { data, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (inviteError && /already.*registered|already exists/i.test(inviteError.message)) {
      // Usuário já existe → gerar magic link
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (retry.error) throw retry.error;
      inviteData = retry.data;
    } else if (inviteError) {
      throw inviteError;
    } else {
      inviteData = data;
    }

    // 2. Atualizar status na tabela (apenas se candidato_id for fornecido)
    if (candidato_id) {
      const { error: updateError } = await supabaseAdmin
        .from("young_applications")
        .update({ status: "aprovado" })
        .eq("id", candidato_id);

      if (updateError) throw updateError;
    }

    // 3. Enviar e-mail via Resend
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurada. E-mail não enviado.");
    } else {
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
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: sans-serif; background-color: #0f0f0f; color: #ffffff; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .card { background-color: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #333; }
                h1 { color: #10b981; font-size: 24px; margin-bottom: 20px; }
                p { font-size: 16px; line-height: 1.6; color: #cccccc; }
                .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 30px; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; font-size: 14px; color: #666; }
                .warning { font-size: 12px; color: #888; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <h1>Parabéns, ${nome}!</h1>
                  <p>É com grande alegria que informamos que sua inscrição no programa da <strong>MTX Multiplicando Talentos</strong> foi aprovada!</p>
                  <p>Você agora faz parte da nossa trilha de transformação. Clique no botão abaixo para criar seu acesso e começar sua jornada no MTX Hub.</p>
                  
                  <a href="${inviteData.properties.action_link}" class="btn">Acessar o MTX Hub →</a>
                  
                  <p class="warning">Este link de convite é pessoal e expira em 24 horas.</p>
                  
                  <div class="footer">
                    Equipe MTX • Multiplicando Talentos<br>
                    <a href="https://mtxhub.com.br" style="color: #10b981;">mtxhub.com.br</a>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      console.log("Status da resposta da API do Resend:", res.status);
      const responseData = await res.json();
      console.log("Corpo da resposta da API do Resend:", JSON.stringify(responseData, null, 2));

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
