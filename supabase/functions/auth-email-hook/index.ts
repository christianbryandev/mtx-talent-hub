import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getEmailHtml } from "../_shared/templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, email_data } = await req.json();
    const { token, token_hash, redirect_to, type } = email_data;
    const email = user.email;
    const nome = user.user_metadata?.full_name || email.split("@")[0];

    console.log(`Enviando e-mail de auth tipo: ${type} para: ${email}`);

    let title = "";
    let body = "";
    let buttonText = "";
    let buttonUrl = "";
    let warning = "";
    let subject = "";

    const appUrl = "https://mtxmarketing.com";

    // Build button URL - Supabase provides site_url/redirect_to
    // For some types, we need to append the token or use the hash
    const siteUrl = Deno.env.get("SITE_URL") || appUrl;
    
    // Default button URL based on Supabase Auth standard
    // Usually Supabase handles the confirmation link generation if not using a hook, 
    // but in a hook we get the token/hash to build it.
    // However, Supabase often provides the full link in some contexts.
    // Let's assume we build it following the standard pattern or using the provided one.
    
    // In many cases, redirect_to is where the user should end up, but the confirmation link
    // is often `${siteUrl}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${redirect_to}`
    // But since we are in a hook, we might just want to use what Supabase intended.
    
    // For simplicity and matching the user request for "Criar Senha e Acessar", 
    // we'll adapt based on type.
    
    const confirmationUrl = `${siteUrl}/auth/v1/verify?token=${token_hash}&type=${type === 'invite' ? 'signup' : type}&redirect_to=${redirect_to || appUrl}`;

    switch (type) {
      case "signup":
        subject = "🎉 Bem-vindo ao MTX Hub!";
        title = "Bem-vindo ao MTX Hub!";
        body = `<p>Sua conta foi criada com sucesso na plataforma da <span class="highlight">MTX Multiplicando Talentos</span>.</p><p>Para começar a sua jornada e acessar todos os conteúdos, por favor confirme seu e-mail clicando no botão abaixo.</p>`;
        buttonText = "Confirmar E-mail e Acessar →";
        buttonUrl = confirmationUrl;
        break;
      case "invite":
        subject = "📩 Você foi convidado para o MTX Hub";
        title = "Você foi convidado!";
        body = `<p>Você foi convidado para participar da <span class="highlight">MTX Multiplicando Talentos</span>.</p><p>Clique no botão abaixo para definir sua senha e começar a utilizar o MTX Hub agora mesmo.</p>`;
        buttonText = "Criar Senha e Acessar →";
        buttonUrl = confirmationUrl;
        warning = "Este convite é pessoal e expira em breve.";
        break;
      case "magiclink":
        subject = "🔗 Seu link de acesso ao MTX Hub";
        title = "Link de Acesso";
        body = `<p>Recebemos uma solicitação de acesso rápido para sua conta no <span class="highlight">MTX Hub</span>.</p><p>Clique no botão abaixo para entrar automaticamente sem precisar de senha.</p>`;
        buttonText = "Acessar Agora →";
        buttonUrl = confirmationUrl;
        break;
      case "recovery":
        subject = "🔑 Redefinição de senha - MTX Hub";
        title = "Redefinição de Senha";
        body = `<p>Recebemos uma solicitação para redefinir a senha da sua conta no <span class="highlight">MTX Hub</span>.</p><p>Se você não solicitou isso, pode ignorar este e-mail. Caso contrário, clique no botão abaixo para criar uma nova senha.</p>`;
        buttonText = "Redefinir Senha →";
        buttonUrl = confirmationUrl;
        break;
      case "email_change":
        subject = "📧 Confirmação de alteração de e-mail";
        title = "Alteração de E-mail";
        body = `<p>Você solicitou a alteração do seu e-mail no <span class="highlight">MTX Hub</span>.</p><p>Por favor, confirme o novo e-mail clicando no botão abaixo para completar a atualização.</p>`;
        buttonText = "Confirmar Novo E-mail →";
        buttonUrl = confirmationUrl;
        break;
      default:
        subject = "Notificação MTX Hub";
        title = "Notificação";
        body = `<p>Você tem uma nova notificação da <span class="highlight">MTX Multiplicando Talentos</span>.</p><p>Clique no botão abaixo para acessar o sistema.</p>`;
        buttonText = "Acessar Sistema →";
        buttonUrl = confirmationUrl;
    }

    const html = getEmailHtml({
      nome,
      title,
      body,
      buttonText,
      buttonUrl,
      warning,
      appUrl
    });

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurada.");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MTX Multiplicando Talentos <noreply@mtxmarketing.com>",
        to: [email],
        subject: subject,
        html: html,
      }),
    });

    const resData = await res.json();
    console.log("Resposta do Resend:", resData);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro no auth-email-hook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
