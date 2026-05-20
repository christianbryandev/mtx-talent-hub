/**
 * Normaliza URLs externas:
 * - Se já começar com http:// ou https://, retorna como está
 * - Se for "mailto:" ou "tel:", mantém
 * - Caso contrário (ex: "mtxmarketing.com.br"), adiciona "https://"
 * Garante que nunca seja concatenada com a URL do app.
 */
export function normalizeExternalUrl(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // remove leading slashes that would make it relative
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Propriedades padrão para abrir link externo em nova aba com segurança. */
export const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
};
