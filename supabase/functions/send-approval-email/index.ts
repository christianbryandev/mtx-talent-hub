import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { email, full_name } = await req.json();

    if (!email || !full_name) {
      throw new Error("Email and full_name are required");
    }

    console.log(`Sending approval email to ${email}`);

    // This is a placeholder for when the user has configured Resend or Lovable Emails
    // If they have a RESEND_API_KEY, we use it directly.
    // Otherwise, we log that we are ready.
    
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "MTX Hub <contato@mtxhub.com.br>", // This will only work if the domain is verified in Resend
          to: [email],
          subject: "Sua inscrição na MTX foi aprovada! 🎉",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <h1 style="color: #c026d3;">Parabéns, ${full_name}!</h1>
              <p style="font-size: 16px; line-height: 1.5;">
                Temos o prazer de informar que sua inscrição no programa da <strong>MTX Multiplicando Talentos</strong> foi aprovada!
              </p>
              <p style="font-size: 16px; line-height: 1.5;">
                Você agora faz parte da nossa trilha de transformação. Em breve, nossa equipe entrará em contato via WhatsApp ou E-mail para orientar sobre os próximos passos e o início das suas atividades.
              </p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">O que fazer agora?</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Fique atento ao seu WhatsApp</li>
                  <li>Prepare-se para uma jornada incrível</li>
                  <li>Seja bem-vindo(a) à família MTX!</li>
                </ul>
              </div>
              <p style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                Equipe MTX • Multiplicando Talentos<br>
                <a href="https://mtxhub.com.br" style="color: #c026d3;">mtxhub.com.br</a>
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Error from Resend:", error);
        return new Response(JSON.stringify({ error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("RESEND_API_KEY not found. Email not sent, but logic is ready.");
    }

    return new Response(JSON.stringify({ message: "Email logic executed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-approval-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
