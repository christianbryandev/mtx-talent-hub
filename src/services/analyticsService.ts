import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export type AreaFilter = "geral" | "comercial" | "operacional" | "social" | "reunioes";
export type RangeOption = "3m" | "6m" | "12m";

export interface IndicadoresFilters {
  range: RangeOption;
  area: AreaFilter;
  responsavelId?: string | null;
}

export const FUNNEL_STAGES_CANONICAL = [
  "prospeccao",
  "contato",
  "qualificacao",
  "diagnostico",
  "proposta",
  "fechamento",
] as const;
export type CanonicalStage = (typeof FUNNEL_STAGES_CANONICAL)[number];

export const FUNNEL_STAGE_LABELS: Record<CanonicalStage, string> = {
  prospeccao: "Prospecção",
  contato: "Contato",
  qualificacao: "Qualificação",
  diagnostico: "Diagnóstico",
  proposta: "Proposta",
  fechamento: "Fechamento",
};

// Maps legacy / alternate stage names to the canonical 6-stage funnel.
function mapStage(raw: string | null | undefined): CanonicalStage | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === "prospeccao" || s === "prospecção") return "prospeccao";
  if (s === "contato") return "contato";
  if (s === "qualificacao" || s === "qualificação") return "qualificacao";
  if (s === "diagnostico" || s === "diagnóstico") return "diagnostico";
  if (s === "proposta" || s === "negociacao" || s === "negociação") return "proposta";
  if (s === "fechamento" || s === "ganha" || s === "perdida") return "fechamento";
  return null;
}

export function rangeMonths(r: RangeOption): number {
  return r === "3m" ? 3 : r === "6m" ? 6 : 12;
}

export async function fetchIndicadoresData(filters: IndicadoresFilters) {
  const months = rangeMonths(filters.range);
  const since = startOfMonth(subMonths(new Date(), months - 1)).toISOString();

  const [clients, opps, tasks, youngs, meetings, services, proposals, mParticipants, mTasks] =
    await Promise.all([
      supabase.from("clients").select("id, status, monthly_value, created_at, commercial_responsible, young_responsible").limit(3000),
      supabase.from("opportunities").select("id, status, funnel_stage, estimated_value, proposal_value, created_at, loss_reason, commercial_responsible").limit(3000),
      supabase.from("tasks").select("id, status, kanban_column, created_at, completed_at, due_date, young_responsible").limit(3000),
      supabase.from("young_people").select("id, status, trail_phase, has_cnpj, total_income_generated, first_client_attended, created_at, last_progress_at").limit(3000),
      supabase.from("meetings").select("id, type, status, date").gte("date", since.slice(0, 10)).limit(1000),
      supabase.from("client_services").select("id, client_id, monthly_value, status, billing_type, start_date, total_value, installments").limit(2000),
      supabase.from("proposals").select("id, value, status, sent_at, created_at").limit(2000),
      supabase.from("meeting_participants").select("id, meeting_id, present").limit(5000),
      supabase.from("meeting_tasks").select("id, meeting_id, task_id").limit(5000),
    ]);

  return {
    clients: clients.data ?? [],
    opps: opps.data ?? [],
    tasks: tasks.data ?? [],
    youngs: youngs.data ?? [],
    meetings: meetings.data ?? [],
    services: services.data ?? [],
    proposals: proposals.data ?? [],
    meetingParticipants: mParticipants.data ?? [],
    meetingTasks: mTasks.data ?? [],
    months,
    since,
  };
}

export type RawData = Awaited<ReturnType<typeof fetchIndicadoresData>>;

export function computeAnalytics(data: RawData, filters: IndicadoresFilters) {
  const { months } = data;
  const now = new Date();
  const monthStart = startOfMonth(now);

  // optional responsible filter
  const opps = filters.responsavelId
    ? data.opps.filter((o: any) => o.commercial_responsible === filters.responsavelId)
    : data.opps;
  const clients = filters.responsavelId
    ? data.clients.filter((c: any) => c.commercial_responsible === filters.responsavelId)
    : data.clients;

  // KPIs TOP
  const activeClients = clients.filter((c: any) => c.status === "ativo");

  // Build revenue map per client from active client_services
  const serviceRevenueByClient: Record<string, number> = {};
  (data.services ?? []).forEach((s: any) => {
    if (s.status === "ativo" && s.client_id && s.monthly_value) {
      serviceRevenueByClient[s.client_id] = (serviceRevenueByClient[s.client_id] ?? 0) + Number(s.monthly_value);
    }
  });

  const mrr = activeClients.reduce((a: number, c: any) =>
    a + (serviceRevenueByClient[c.id] ?? Number(c.monthly_value ?? 0)), 0);
  const newClientsMonth = clients.filter((c: any) => c.created_at && new Date(c.created_at) >= monthStart).length;

  const oppsClosed = opps.filter((o: any) => o.status === "ganha" || o.status === "perdida");
  const oppsWon = opps.filter((o: any) => o.status === "ganha");
  const conversionRate = oppsClosed.length > 0 ? (oppsWon.length / oppsClosed.length) * 100 : 0;
  const ticketMedio = activeClients.length > 0 ? mrr / activeClients.length : 0;
  const receitaPrevista = opps
    .filter((o: any) => o.status === "aberta")
    .reduce((a: number, o: any) => a + Number(o.proposal_value ?? o.estimated_value ?? 0), 0);

  // Funnel — only count open opportunities (same as CRM Kanban)
  const funnelCounts: Record<CanonicalStage, { qtd: number; valor: number }> = {
    prospeccao: { qtd: 0, valor: 0 },
    contato: { qtd: 0, valor: 0 },
    qualificacao: { qtd: 0, valor: 0 },
    diagnostico: { qtd: 0, valor: 0 },
    proposta: { qtd: 0, valor: 0 },
    fechamento: { qtd: 0, valor: 0 },
  };
  opps.filter((o: any) => o.status === "aberta").forEach((o: any) => {
    const s = mapStage(o.funnel_stage);
    if (!s) return;
    funnelCounts[s].qtd += 1;
    funnelCounts[s].valor += Number(o.estimated_value ?? 0);
  });
  const funnel = FUNNEL_STAGES_CANONICAL.map((stage, idx) => {
    const prev = idx > 0 ? funnelCounts[FUNNEL_STAGES_CANONICAL[idx - 1]].qtd : 0;
    const current = funnelCounts[stage].qtd;
    const conv = idx > 0 && prev > 0 ? (current / prev) * 100 : null;
    return {
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      qtd: current,
      valor: funnelCounts[stage].valor,
      conversao: conv,
    };
  });
  // Bottleneck = stage with biggest drop after the first non-empty
  let bottleneck: string | null = null;
  let worstDrop = 0;
  funnel.forEach((f) => {
    if (f.conversao !== null && f.conversao < 100 - worstDrop) {
      const drop = 100 - f.conversao;
      if (drop > worstDrop) {
        worstDrop = drop;
        bottleneck = f.label;
      }
    }
  });

  // Alerts
  const today = new Date();
  const tasksLate = data.tasks.filter(
    (t: any) => t.due_date && new Date(t.due_date) < today && t.status !== "concluida" && t.kanban_column !== "concluida",
  );
  const followupsLate = opps.filter(
    (o: any) => o.status === "aberta" && (o as any).next_followup_date && new Date((o as any).next_followup_date) < today,
  );
  const inactiveYoungs = data.youngs.filter((y: any) => {
    if (y.status !== "ativo") return false;
    const last = y.last_progress_at ?? y.created_at;
    return last ? differenceInDays(today, new Date(last)) > 30 : false;
  });
  const clientsPending = clients.filter((c: any) => c.status === "lead" || c.status === "onboarding");

  // Operação
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const tasksDoneWeek = data.tasks.filter(
    (t: any) => t.completed_at && new Date(t.completed_at) >= weekAgo,
  ).length;
  const tasksDone = data.tasks.filter((t: any) => t.status === "concluida" || t.kanban_column === "concluida");
  const tasksOnTime = tasksDone.filter(
    (t: any) => !t.due_date || (t.completed_at && new Date(t.completed_at) <= new Date(t.due_date)),
  );
  const onTimeRate = tasksDone.length > 0 ? (tasksOnTime.length / tasksDone.length) * 100 : 0;
  const projetosAndamento = data.services.filter((s: any) => s.status === "ativo").length;
  const projetosRisco = clients.filter((c: any) => c.status === "ativo" && !c.monthly_value).length;

  // Impacto Social
  const youngsAtivos = data.youngs.filter((y: any) => y.status === "ativo").length;
  const phaseCount = (p: string) => data.youngs.filter((y: any) => y.trail_phase === p).length;
  const gerandoRenda = data.youngs.filter((y: any) => Number(y.total_income_generated ?? 0) > 0);
  const rendaTotal = data.youngs.reduce((a: number, y: any) => a + Number(y.total_income_generated ?? 0), 0);
  const rendaMedia = gerandoRenda.length > 0 ? rendaTotal / gerandoRenda.length : 0;
  const primeiroCliente = data.youngs.filter((y: any) => y.first_client_attended).length;

  // Evolução
  const buckets: Record<string, { month: string; clientes: number; oportunidades: number; receita: number }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    const key = format(d, "yyyy-MM");
    buckets[key] = { month: format(d, "MMM", { locale: ptBR }), clientes: 0, oportunidades: 0, receita: 0 };
  }

  // Count new clients per month
  clients.forEach((c: any) => {
    const k = c.created_at?.slice(0, 7);
    if (buckets[k]) buckets[k].clientes++;
  });

  // Revenue: for each month, sum active services revenue
  const allServices = data.services ?? [];
  Object.keys(buckets).forEach((monthKey) => {
    let monthRevenue = 0;
    allServices.forEach((s: any) => {
      if (s.status !== "ativo" || !s.client_id) return;
      const billing = s.billing_type ?? "mensal";
      const sStart = s.start_date?.slice(0, 7) ?? s.created_at?.slice(0, 7) ?? monthKey;

      if (billing === "mensal") {
        // Monthly: count if service was active during this month
        const sEnd = s.end_date?.slice(0, 7);
        if (sStart <= monthKey && (!sEnd || sEnd >= monthKey)) {
          monthRevenue += Number(s.monthly_value ?? 0);
        }
      } else {
        // Pontual: distribute based on payment method
        const installments = Number(s.installments ?? 1) || 1;
        const totalVal = Number(s.total_value ?? s.monthly_value ?? 0);
        if (installments <= 1) {
          // À vista: full value in the start month
          if (sStart === monthKey) monthRevenue += totalVal;
        } else {
          // Parcelado: one installment per month starting from start_date
          const parcelValue = totalVal / installments;
          const startDate = new Date(sStart + "-01");
          for (let p = 0; p < installments; p++) {
            const parcelMonth = format(new Date(startDate.getFullYear(), startDate.getMonth() + p, 1), "yyyy-MM");
            if (parcelMonth === monthKey) {
              monthRevenue += parcelValue;
              break;
            }
          }
        }
      }
    });
    buckets[monthKey].receita = Math.round(monthRevenue * 100) / 100;
  });

  // Only count open opportunities (matching CRM Kanban)
  opps.filter((o: any) => o.status === "aberta").forEach((o: any) => {
    const k = o.created_at?.slice(0, 7);
    if (buckets[k]) buckets[k].oportunidades++;
  });
  const evolution = Object.values(buckets);

  // Loss reasons
  const lossMap: Record<string, number> = { preco: 0, sem_urgencia: 0, sem_resposta: 0, ja_tem_fornecedor: 0, sem_confianca: 0, outros: 0 };
  const normalizeLoss = (raw: string): keyof typeof lossMap => {
    const s = raw.toLowerCase();
    if (s.includes("preç") || s.includes("preco") || s.includes("caro")) return "preco";
    if (s.includes("urg")) return "sem_urgencia";
    if (s.includes("respond") || s.includes("sumiu") || s.includes("contato")) return "sem_resposta";
    if (s.includes("fornecedor") || s.includes("concorr")) return "ja_tem_fornecedor";
    if (s.includes("confian")) return "sem_confianca";
    return "outros";
  };
  opps.filter((o: any) => o.status === "perdida" && o.loss_reason).forEach((o: any) => {
    lossMap[normalizeLoss(o.loss_reason)]++;
  });
  const lossLabels: Record<string, string> = {
    preco: "Preço",
    sem_urgencia: "Sem urgência",
    sem_resposta: "Não respondeu",
    ja_tem_fornecedor: "Já tem fornecedor",
    sem_confianca: "Sem confiança",
    outros: "Outros",
  };
  const lossData = Object.entries(lossMap)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: lossLabels[k], value: v }));

  // Reuniões
  const meetingsRealized = data.meetings.filter((m: any) => m.status === "realizada");
  const meetingIds = new Set(meetingsRealized.map((m: any) => m.id));
  const parts = data.meetingParticipants.filter((p: any) => meetingIds.has(p.meeting_id));
  const presentCount = parts.filter((p: any) => p.present).length;
  const presenceRate = parts.length > 0 ? (presentCount / parts.length) * 100 : 0;
  const meetingTaskIds = data.meetingTasks.filter((mt: any) => meetingIds.has(mt.meeting_id)).map((mt: any) => mt.task_id);
  const tasksGenerated = meetingTaskIds.length;
  const tasksGeneratedDone = data.tasks.filter(
    (t: any) => meetingTaskIds.includes(t.id) && (t.status === "concluida" || t.kanban_column === "concluida"),
  ).length;

  return {
    kpisTop: { mrr, newClientsMonth, conversionRate, ticketMedio, receitaPrevista },
    funnel,
    bottleneck,
    alerts: {
      tasksLate: tasksLate.length,
      followupsLate: followupsLate.length,
      inactiveYoungs: inactiveYoungs.length,
      clientsPending: clientsPending.length,
    },
    operacao: {
      tasksDoneWeek,
      tasksLate: tasksLate.length,
      onTimeRate,
      projetosAndamento,
      projetosRisco,
    },
    social: {
      ativos: youngsAtivos,
      formacao: phaseCount("fase_1") + phaseCount("fase_2"),
      pratica: phaseCount("fase_3") + phaseCount("fase_4"),
      gerandoRenda: gerandoRenda.length,
      rendaTotal,
      rendaMedia,
      primeiroCliente,
    },
    evolution,
    lossData,
    reunioes: {
      realizadas: meetingsRealized.length,
      presencaMedia: presenceRate,
      tarefasGeradas: tasksGenerated,
      tarefasConcluidas: tasksGeneratedDone,
    },
  };
}

export type Analytics = ReturnType<typeof computeAnalytics>;
