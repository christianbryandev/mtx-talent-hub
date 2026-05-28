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
    const { candidato_id, email, nome } = await req.json();

    if (!email || !nome) {
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

    // 1. Gerar link de convite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${new URL(req.url).origin}/dashboard`,
      },
    });

    if (inviteError) throw inviteError;

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
          from: "MTX Multiplicando Talentos <noreply@mtxhub.com.br>",
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

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro Resend:", errorText);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
