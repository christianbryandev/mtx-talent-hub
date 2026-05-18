export type FunnelStage =
  | "icp_definido"
  | "segmentacao"
  | "prospeccao"
  | "contato_realizado"
  | "follow_up"
  | "qualificacao"
  | "diagnostico"
  | "proposta_enviada"
  | "negociacao"
  | "fechamento"
  | "onboarding";

export const FUNNEL_STAGES: { id: FunnelStage; label: string }[] = [
  { id: "icp_definido", label: "ICP Definido" },
  { id: "segmentacao", label: "Segmentação" },
  { id: "prospeccao", label: "Prospecção" },
  { id: "contato_realizado", label: "Contato Realizado" },
  { id: "follow_up", label: "Follow-up" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "proposta_enviada", label: "Proposta Enviada" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechamento", label: "Fechamento" },
  { id: "onboarding", label: "Onboarding" },
];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> =
  FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.id] = s.label;
    return acc;
  }, {} as Record<FunnelStage, string>);

export type OpportunityPriority = "baixa" | "media" | "alta";
export type OpportunityStatus = "aberta" | "ganha" | "perdida";

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const INTERACTION_TYPES = [
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "nota", label: "Nota" },
] as const;

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export interface Opportunity {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  niche: string | null;
  company_size: string | null;
  main_pain: string | null;
  suggested_solution: string | null;
  offered_service: string | null;
  estimated_value: number | null;
  closing_probability: number | null;
  funnel_stage: FunnelStage;
  commercial_responsible: string | null;
  lead_origin: string | null;
  priority: OpportunityPriority;
  last_contact_date: string | null;
  next_followup_date: string | null;
  status: OpportunityStatus;
  loss_reason: string | null;
  converted_client_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
