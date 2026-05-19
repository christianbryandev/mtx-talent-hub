import { supabase } from "@/integrations/supabase/client";

/**
 * Duplica um registro de uma tabela. Carrega a linha original, remove
 * colunas auto-geradas/únicas e insere uma cópia. Opcionalmente acrescenta
 * sufixo " (cópia)" ao campo principal de exibição.
 */
export async function duplicateRow<T extends Record<string, unknown>>(
  table: string,
  id: string,
  options: {
    /** Coluna usada para gerar o novo título (ex.: "title", "full_name"). */
    labelField?: string;
    /** Colunas adicionais a remover além de id/created_at/updated_at. */
    excludeFields?: string[];
    /** Overrides aplicados depois da cópia (ex.: status="rascunho"). */
    overrides?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const { labelField, excludeFields = [], overrides = {} } = options;

  const { data: original, error: selErr } = await supabase
    .from(table as never)
    .select("*")
    .eq("id", id)
    .single();
  if (selErr) throw selErr;
  if (!original) throw new Error("Registro não encontrado.");

  const copy: Record<string, unknown> = { ...(original as object) };
  const toRemove = new Set([
    "id",
    "created_at",
    "updated_at",
    "completed_at",
    ...excludeFields,
  ]);
  for (const key of toRemove) delete copy[key];

  if (labelField && typeof copy[labelField] === "string") {
    copy[labelField] = `${copy[labelField] as string} (cópia)`;
  }

  for (const [k, v] of Object.entries(overrides)) copy[k] = v;

  const { data: inserted, error: insErr } = await supabase
    .from(table as never)
    .insert(copy as never)
    .select("*")
    .single();
  if (insErr) throw insErr;
  return inserted as T;
}
