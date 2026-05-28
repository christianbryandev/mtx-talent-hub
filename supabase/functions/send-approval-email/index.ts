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
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  background-color: #050505; 
                  color: #ffffff; 
                  margin: 0; 
                  padding: 0; 
                  -webkit-font-smoothing: antialiased;
                }
                .wrapper {
                  width: 100%;
                  table-layout: fixed;
                  background-color: #050505;
                  padding-bottom: 40px;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 40px 20px; 
                }
                .logo-container {
                  text-align: center;
                  margin-bottom: 40px;
                }
                .logo {
                  height: 48px;
                  width: auto;
                }
                .card { 
                  background-color: #0B0B12; 
                  border-radius: 16px; 
                  padding: 40px; 
                  border: 1px solid rgba(255, 255, 255, 0.06);
                  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.5);
                }
                h1 { 
                  color: #ffffff; 
                  font-size: 24px; 
                  font-weight: 700;
                  margin-bottom: 24px; 
                  margin-top: 0;
                  letter-spacing: -0.02em;
                }
                p { 
                  font-size: 16px; 
                  line-height: 1.6; 
                  color: #A1A1AA; 
                  margin-bottom: 20px;
                }
                .highlight {
                  color: #ffffff;
                  font-weight: 600;
                }
                .btn-container {
                  text-align: center;
                  margin: 32px 0;
                }
                .btn { 
                  display: inline-block; 
                  background-color: #10b981; 
                  color: #ffffff !important; 
                  padding: 16px 32px; 
                  text-decoration: none; 
                  border-radius: 10px; 
                  font-weight: 600; 
                  font-size: 16px;
                  transition: all 0.2s ease;
                }
                .footer { 
                  margin-top: 40px; 
                  padding-top: 24px; 
                  border-top: 1px solid rgba(255, 255, 255, 0.06); 
                  font-size: 14px; 
                  color: #71717a; 
                  text-align: center;
                }
                .footer a {
                  color: #10b981;
                  text-decoration: none;
                }
                .warning { 
                  font-size: 12px; 
                  color: #52525b; 
                  margin-top: 24px; 
                  text-align: center;
                }
                @media only screen and (max-width: 480px) {
                  .card { padding: 32px 24px; }
                  h1 { font-size: 20px; }
                  .btn { width: 100%; box-sizing: border-box; }
                }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="logo-container">
                    <img src="https://https-mtx-talent-hub-vercel-app.lovable.app/mtx-hub-logo.png" alt="MTX Hub Logo" class="logo">
                  </div>
                  <div class="card">
                    <h1>Parabéns, ${nome}!</h1>
                    <p>É com grande alegria que informamos que sua inscrição no programa da <span class="highlight">MTX Multiplicando Talentos</span> foi aprovada!</p>
                    <p>Você agora faz parte da nossa trilha de transformação. Clique no botão abaixo para criar seu acesso e começar sua jornada no MTX Hub.</p>
                    
                    <div class="btn-container">
                      <a href="${inviteData.properties.action_link}" class="btn">Acessar o MTX Hub →</a>
                    </div>
                    
                    <p class="warning">Este link de convite é pessoal e expira em 24 horas.</p>
                    
                    <div class="footer">
                      <span class="highlight">Equipe MTX • Multiplicando Talentos</span><br>
                      <a href="https://mtxhub.com.br">mtxhub.com.br</a>
                    </div>
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
