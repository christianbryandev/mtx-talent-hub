import { supabase } from "@/integrations/supabase/client";

const BUCKET = "notificacoes-anexos";
const SIGNED_TTL_SECONDS = 60 * 60; // 1h

/**
 * Resolve um valor de `notifications.attachment_url` para uma URL acessível.
 * - Se for um path do bucket (ex.: "notificacoes/abc.png"), gera URL assinada.
 * - Se for uma URL http(s) legada (anterior à privatização do bucket), retorna como está.
 */
export async function resolveNotificationAttachmentUrl(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(value, SIGNED_TTL_SECONDS);
  if (error) {
    console.error("[notification-attachment] sign failed", error);
    return null;
  }
  return data.signedUrl;
}
