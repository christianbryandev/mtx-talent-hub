import type { AppRole } from "@/types";

export interface TourStep {
  element?: string; // CSS selector; omit for centered modal
  title: string;
  description: string;
}

const finalStep: TourStep = {
  title: "Tudo pronto! 🎉",
  description:
    "Você já conhece o MTX Hub. Agora é só explorar. Se precisar rever, abra o dashboard e clique em 'Rever tour'.",
};

export const WELCOME_MESSAGES: Record<AppRole, string> = {
  super_admin:
    "Você tem acesso total ao sistema. Aqui você gerencia jovens, clientes, operação comercial, usuários e muito mais. Vamos te mostrar tudo em poucos passos.",
  admin:
    "Você tem acesso à gestão completa da operação. Jovens, clientes, tarefas, reuniões e indicadores estão ao seu alcance.",
  comercial:
    "Seu espaço é o CRM comercial. Aqui você prospecta, acompanha oportunidades e converte leads em clientes da MTX.",
  colaborador:
    "Bem-vindo(a) à sua área! Aqui você acompanha suas tarefas, sua trilha de evolução e os clientes em que você atua.",
  cliente:
    "Bem-vindo(a) ao seu portal! Aqui você acompanha os serviços contratados, suas demandas e o progresso do seu projeto com a MTX.",
};

const SUPER_ADMIN_STEPS: TourStep[] = [
  { element: '[data-tour="sidebar"]', title: "Navegação principal", description: "Aqui estão todos os módulos do MTX Hub. Você tem acesso total ao sistema." },
  { element: '[data-tour="dashboard-kpis"]', title: "Dashboard executivo", description: "Aqui você acompanha os principais indicadores da operação em tempo real — jovens, clientes, faturamento e muito mais." },
  { element: '[data-tour="nav-jovens"]', title: "Gestão de jovens", description: "Cadastre, acompanhe a trilha, evolução e o impacto gerado por cada jovem do projeto." },
  { element: '[data-tour="nav-clientes"]', title: "Gestão de clientes", description: "Cadastre empresas, acompanhe contratos, serviços contratados e o histórico de relacionamento." },
  { element: '[data-tour="nav-crm"]', title: "Funil de vendas", description: "Acompanhe todas as oportunidades comerciais em um Kanban visual. Arraste os cards conforme o negócio avança." },
  { element: '[data-tour="nav-servicos"]', title: "Catálogo de serviços", description: "Gerencie os serviços que a MTX oferece e vincule jovens aptos a executar cada um." },
  { element: '[data-tour="nav-tarefas"]', title: "Kanban operacional", description: "Crie e acompanhe tarefas vinculadas a clientes e serviços. Atribua aos jovens e monitore o progresso." },
  { element: '[data-tour="nav-reunioes"]', title: "Reuniões e pautas", description: "Agende reuniões, registre a presença dos jovens e gere tarefas direto da ata." },
  { element: '[data-tour="nav-indicadores"]', title: "Relatórios e indicadores", description: "Relatórios detalhados de impacto social, performance comercial e operacional da MTX." },
  { element: '[data-tour="nav-users"]', title: "Gestão de usuários", description: "Convide novos usuários, altere permissões e gerencie quem tem acesso ao sistema." },
  { element: '[data-tour="notification-bell"]', title: "Notificações", description: "Fique por dentro de tudo — tarefas atribuídas, prazos, novas inscrições e muito mais em tempo real." },
  finalStep,
];

const ADMIN_STEPS: TourStep[] = [
  { element: '[data-tour="dashboard-kpis"]', title: "Seu painel de controle", description: "Aqui você tem uma visão geral da operação — jovens ativos, clientes, tarefas e indicadores." },
  { element: '[data-tour="nav-jovens"]', title: "Gestão de jovens", description: "Acompanhe cada jovem — sua fase na trilha, evolução, presença e clientes atendidos." },
  { element: '[data-tour="nav-clientes"]', title: "Gestão de clientes", description: "Veja todos os clientes, seus contratos, serviços e histórico de relacionamento." },
  { element: '[data-tour="nav-crm"]', title: "Funil comercial", description: "Acompanhe as oportunidades em andamento e o progresso do time comercial." },
  { element: '[data-tour="nav-tarefas"]', title: "Kanban operacional", description: "Monitore todas as entregas da equipe, atribua tarefas e acompanhe prazos." },
  { element: '[data-tour="nav-reunioes"]', title: "Reuniões", description: "Gerencie as reuniões de quarta e sábado, registre presença e gere atas." },
  { element: '[data-tour="nav-indicadores"]', title: "Relatórios", description: "Acesse relatórios completos de impacto, performance e operação." },
  { element: '[data-tour="notification-bell"]', title: "Fique atualizado", description: "Suas notificações aparecem aqui — novas inscrições, briefings preenchidos e muito mais." },
  finalStep,
];

const COMERCIAL_STEPS: TourStep[] = [
  { element: '[data-tour="dashboard-kpis"]', title: "Seu painel comercial", description: "Acompanhe seus KPIs comerciais — oportunidades, pipeline e taxa de conversão." },
  { element: '[data-tour="nav-crm"]', title: "Seu principal módulo", description: "Aqui você gerencia todo o funil de vendas da MTX. Cadastre leads, registre interações e avance as oportunidades." },
  { element: '[data-tour="nav-crm"]', title: "Funil de vendas visual", description: "Cada coluna do Kanban representa uma etapa do processo comercial. Arraste os cards conforme o negócio evolui." },
  { element: '[data-tour="nav-clientes"]', title: "Clientes convertidos", description: "Aqui você visualiza os leads que se tornaram clientes. Ao fechar um negócio, converta a oportunidade com um clique." },
  { element: '[data-tour="notification-bell"]', title: "Não perca nenhum follow-up", description: "O sistema te avisa quando um follow-up está atrasado. Fique de olho nas notificações." },
  { element: '[data-tour="notification-bell"]', title: "Seus alertas comerciais", description: "Briefings preenchidos, follow-ups atrasados e oportunidades atualizadas aparecem aqui." },
  finalStep,
];

const COLABORADOR_STEPS: TourStep[] = [
  { element: '[data-tour="dashboard-kpis"]', title: "Seu espaço no MTX Hub", description: "Aqui você acompanha suas tarefas, sua evolução na trilha e tudo que está acontecendo." },
  { element: '[data-tour="nav-jovens"]', title: "Seu perfil", description: "Aqui estão seus dados, sua fase na trilha MTX e sua jornada de desenvolvimento." },
  { element: '[data-tour="nav-tarefas"]', title: "Suas tarefas", description: "Aqui aparecem todas as tarefas atribuídas a você. Atualize o status conforme avança e registre observações." },
  { element: '[data-tour="nav-reunioes"]', title: "Reuniões", description: "Veja as reuniões em que você participa — as de quarta e sábado e outras que forem agendadas." },
  { element: '[data-tour="notification-bell"]', title: "Suas notificações", description: "Quando uma tarefa for atribuída a você ou um prazo estiver chegando, você será avisado aqui." },
  finalStep,
];

const CLIENTE_STEPS: TourStep[] = [
  { title: "Seu portal exclusivo", description: "Esse é o seu espaço dentro do MTX Hub. Aqui você acompanha tudo relacionado ao seu projeto." },
  { element: '[data-tour="nav-clientes"]', title: "Seu briefing", description: "Se ainda não preencheu, complete seu briefing aqui. Essas informações guiam todo o trabalho da equipe MTX." },
  { element: '[data-tour="nav-servicos"]', title: "Seus serviços", description: "Acompanhe os serviços que você contratou, o status de cada um e os responsáveis pela entrega." },
  { element: '[data-tour="nav-tarefas"]', title: "Demandas do seu projeto", description: "Veja o andamento das tarefas relacionadas à sua empresa e aprove entregas quando necessário." },
  finalStep,
];

export function getTourSteps(role: AppRole | null): TourStep[] {
  switch (role) {
    case "super_admin": return SUPER_ADMIN_STEPS;
    case "admin": return ADMIN_STEPS;
    case "comercial": return COMERCIAL_STEPS;
    case "cliente": return CLIENTE_STEPS;
    case "colaborador":
    default: return COLABORADOR_STEPS;
  }
}
