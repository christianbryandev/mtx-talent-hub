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
    // Determinando a URL do app a partir do cabeçalho de origem ou referer, ou usando um padrão
    // 1. Gerar link de acesso (invite para novos, magiclink para existentes)
    // Definimos o domínio oficial como padrão conforme solicitado
    const appUrl = "https://mtxmarketing.com";
    
    console.log("App URL determinada:", appUrl);

    // Redireciona para /criar-senha para que o jovem defina a senha
    const redirectTo = `${appUrl}/criar-senha`;

    let inviteData: any;
    let { data, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    if (inviteError && /already.*registered|already exists/i.test(inviteError.message)) {
      console.log("Usuário já existe, gerando magic link para:", email);
      // Usuário já existe → gerar magic link
      // Se o usuário quer que ele defina uma senha, e o usuário já existe mas talvez não tenha senha,
      // poderíamos mandar para reset-password também. Vamos seguir o pedido do usuário e mandar para reset-password.
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (retry.error) {
        console.error("Erro ao gerar magic link:", retry.error);
        throw retry.error;
      }
      inviteData = retry.data;
    } else if (inviteError) {
      console.error("Erro ao gerar link de convite:", inviteError);
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
                  background-color: #0a0a0a; 
                  color: #cccccc; 
                  margin: 0; 
                  padding: 0; 
                  -webkit-font-smoothing: antialiased;
                }
                .wrapper {
                  width: 100%;
                  table-layout: fixed;
                  background-color: #0a0a0a;
                  padding-bottom: 40px;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 40px 20px; 
                }
                .logo-container {
                  text-align: center;
                  margin-bottom: 32px;
                }
                .logo {
                  height: 60px;
                  width: auto;
                }
                .card { 
                  background-color: #111118; 
                  border-radius: 12px; 
                  padding: 40px; 
                  border: 1px solid rgba(255, 255, 255, 0.07);
                }
                h1 { 
                  color: #ffffff; 
                  font-size: 28px; 
                  font-weight: 700;
                  margin-bottom: 24px; 
                  margin-top: 0;
                  text-align: left;
                }
                p { 
                  font-size: 15px; 
                  line-height: 1.7; 
                  color: #cccccc; 
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
                  background: linear-gradient(to right, #DD2A7B, #8131AF); 
                  color: #ffffff !important; 
                  padding: 16px 32px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 700; 
                  font-size: 16px;
                }
                .divider {
                  height: 1px;
                  background-color: rgba(255, 255, 255, 0.06);
                  margin: 32px 0;
                }
                .footer { 
                  font-size: 14px; 
                  color: #ffffff; 
                  text-align: center;
                }
                .footer a {
                  color: #C7288B;
                  text-decoration: none;
                  font-weight: 600;
                }
                .warning { 
                  font-size: 12px; 
                  color: #666666; 
                  margin-top: 24px; 
                  text-align: center;
                }
                .copyright {
                  font-size: 11px;
                  color: #444444;
                  margin-top: 16px;
                  text-align: center;
                }
                @media only screen and (max-width: 480px) {
                  .card { padding: 32px 20px; }
                  h1 { font-size: 24px; }
                  .btn { width: 100%; box-sizing: border-box; text-align: center; }
                }
              </style>
            </head>
            <body>
              <div class="wrapper">
                <div class="container">
                  <div class="logo-container">
                    <img src="${appUrl}/mtx-hub-logo.png" alt="MTX Hub Logo" class="logo">
                  </div>
                  <div class="card">
                    <h1>Parabéns, ${nome}!</h1>
                    <p>É com grande alegria que informamos que sua inscrição no programa da <span class="highlight">MTX Multiplicando Talentos</span> foi aprovada!</p>
                    <p>Você agora faz parte da nossa trilha de transformação. Clique no botão abaixo para <span class="highlight">definir sua senha de acesso</span> e começar sua jornada no MTX Hub.</p>
                    
                    <div class="btn-container">
                      <a href="${inviteData.properties.action_link}" class="btn">Criar Senha e Acessar →</a>
                    </div>
                    
                    <p class="warning">Este link de acesso é pessoal e expira em 24 horas.</p>
                    
                    <div class="divider"></div>
                    
                    <div class="footer">
                      <strong>Equipe MTX • Multiplicando Talentos</strong><br>
                      <a href="https://mtxmarketing.com">mtxmarketing.com</a>
                    </div>
                    
                    <div class="copyright">
                      © 2026 MTX Marketing. Todos os direitos reservados.
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
