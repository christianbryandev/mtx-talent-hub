export type ClientStatus =
  | "lead"
  | "qualificado"
  | "proposta_enviada"
  | "negociacao"
  | "fechado"
  | "onboarding"
  | "ativo"
  | "pausado"
  | "encerrado";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  proposta_enviada: "Proposta enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
  onboarding: "Onboarding",
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export const CLIENT_STATUS_LIST: ClientStatus[] = [
  "lead",
  "qualificado",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "onboarding",
  "ativo",
  "pausado",
  "encerrado",
];

export const COMPANY_SIZES = ["Micro", "Pequena", "Média", "Grande"] as const;

export const CLIENT_HISTORY_TYPES = [
  { value: "reuniao", label: "Reunião" },
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "nota", label: "Nota" },
  { value: "mudanca_status", label: "Mudança de status" },
] as const;
