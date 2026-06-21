export type FunnelStage =
  | "prospeccao"
  | "contato"
  | "qualificacao"
  | "diagnostico"
  | "proposta"
  | "fechamento"
  | "perdida";

export const FUNNEL_STAGES: { id: FunnelStage; label: string }[] = [
  { id: "prospeccao", label: "Prospecção" },
  { id: "contato", label: "Contato" },
  { id: "qualificacao", label: "Qualificação" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "proposta", label: "Proposta" },
  { id: "fechamento", label: "Fechamento" },
  { id: "perdida", label: "Perdida" },
];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> =
  FUNNEL_STAGES.reduce((acc, s) => {
    acc[s.id] = s.label;
    return acc;
  }, {} as Record<FunnelStage, string>);

export type OpportunityPriority = "baixa" | "media" | "alta";
export type OpportunityStatus = "aberta" | "ganha" | "perdida";
export type OpportunityTemperature = "frio" | "morno" | "quente";
export type ProposalStatus = "nao_enviada" | "enviada" | "em_analise" | "em_negociacao";

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const TEMPERATURE_LABELS: Record<OpportunityTemperature, string> = {
  frio: "🔵 Frio",
  morno: "🟡 Morno",
  quente: "🔴 Quente",
};

export const PROPOSAL_STATUS_FORM_LABELS: Record<ProposalStatus, string> = {
  nao_enviada: "Não enviada",
  enviada: "Enviada",
  em_analise: "Em análise",
  em_negociacao: "Em negociação",
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

export const LEAD_ORIGIN_OPTIONS = [
  "Indicação",
  "Instagram",
  "WhatsApp",
  "LinkedIn",
  "Prospecção ativa",
  "Outro",
] as const;

export interface Opportunity {
  id: string;
  company_name: string;
  trade_name: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
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
  temperature: OpportunityTemperature | null;
  is_icp: boolean | null;
  segment_validated: boolean | null;
  has_demand: boolean | null;
  has_budget: boolean | null;
  has_urgency: boolean | null;
  qualification_score: number | null;
  problem_identified: string | null;
  improvement_needed: string | null;
  solution_opportunity: string | null;
  proposal_value: number | null;
  proposal_sent_date: string | null;
  proposal_status: ProposalStatus | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  status: OpportunityStatus;
  loss_reason: string | null;
  converted_client_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
