
# Plano — CRM + Serviços (Prompt A)

Vou dividir em **4 fases**. Cada fase é entregável de forma independente e você pode validar antes de eu seguir para a próxima.

---

## Fase 1 — CRM: Funil reduzido para 6 etapas

**Banco (migration):**
- Renomear/consolidar `funnel_stage` para 6 valores: `prospeccao`, `contato`, `qualificacao`, `diagnostico`, `proposta`, `fechamento`
- Mapeamento dos dados existentes:
  - `icp_definido`, `segmentacao` → `prospeccao`
  - `contato_realizado`, `follow_up` → `contato`
  - `proposta_enviada`, `negociacao` → `proposta`
  - `onboarding` → remove (oportunidades viram clientes)
- Adicionar colunas em `opportunities`: `city`, `is_icp` (bool), `segment_validated` (bool), `temperature` (frio/morno/quente), `has_demand`, `has_budget`, `has_urgency`, `qualification_score` (0–10), `problem_identified`, `improvement_needed`, `solution_opportunity`, `proposal_value`, `proposal_sent_date`, `proposal_status`

**Frontend:**
- Atualizar `src/types/crm.ts` (`FUNNEL_STAGES` com 6 etapas)
- `crm.index.tsx`: kanban com 6 colunas
- `crm.lista.tsx`: filtros atualizados
- Adicionar filtros novos no topo do kanban: responsável, temperatura, segmento, mês de criação, botão limpar
- Métricas do dashboard: já existem 4, adicionar **Ticket médio** e **Tempo médio de fechamento**

---

## Fase 2 — CRM: Card de oportunidade detalhado (8 blocos)

**Refatorar `OpportunityFormDialog.tsx` e `crm.$id.tsx`** em painel lateral (`Sheet`) com seções colapsáveis:

- Bloco 1: Dados básicos
- Bloco 2: Classificação (ICP, segmento validado, origem, responsável)
- Bloco 3: Status (etapa read-only + temperatura com botões 🔵🟡🔴)
- Bloco 4: Interação (datas + histórico cronológico — já existe `opportunity_interactions`, vamos reusar como log)
- Bloco 5: Qualificação (3 toggles + slider 0–10)
- Bloco 6: Diagnóstico (3 textareas)
- Bloco 7: Proposta (multi-serviços via `opportunity_services` já existente, valor, data, status)
- Bloco 8: Fechamento (ganha/perdida + motivo + botão "Mover para Clientes" se ganha)

Botão "copiar" no telefone/WhatsApp.

---

## Fase 3 — Aba Serviços: Lista + Formulário expandido

**Banco (migration):**
- Adicionar em `services`: `service_type` (recorrente/pontual/consultoria), `responsible_area` (social_media/trafego/design/dev/comercial), `executor_profile`, `frequency` (semanal/quinzenal/mensal/projeto_unico), `frequency_note`, `pct_mtx` (default 10), `pct_commercial` (default 10), `pct_executor` (default 80)
- Nova tabela `service_task_templates`: `id`, `service_id`, `name`, `task_type` (onboarding/recorrente), `responsible_area`, `default_deadline` (texto livre tipo "D+3", "Semanal", "Todo dia 28"), `position`
- Nova tabela `service_onboarding_checklist`: `id`, `service_id`, `item`, `position`

**Frontend:**
- `servicos.index.tsx`: lista com colunas (nome, categoria, tipo, preço, área, status toggle inline, clientes em uso — count)
- Filtros: busca, tipo, área
- `ServiceFormDialog.tsx`: 6 blocos
  - Bloco 4 (template): lista drag-and-drop com + adicionar tarefa
  - Bloco 5: cálculo de distribuição em tempo real
  - Bloco 6: checklist de onboarding editável
- **Seed**: inserir templates pré-cadastrados para "Gestão de Redes Sociais" e "Gestão de Tráfego" (via migration condicional — só insere se o serviço existir; senão, deixo helper para criar)

---

## Fase 4 — Ativação automática: Serviço → Tarefas

**Banco:**
- Trigger ou função RPC `activate_client_service(client_service_id)` que:
  1. Valida responsável e template (raise exception com mensagem clara)
  2. Lê `service_task_templates` do serviço
  3. Insere em `tasks` cada item, vinculando `client_id`, `service_id`, calculando `due_date` a partir de `start_date` + parsing de `default_deadline` (`D+N`, `Semanal`, `Todo dia X`)
  4. Tarefas recorrentes: cria a primeira ocorrência agora; geração contínua via `daily_notifications_job` estendido (ou job separado)
- Coluna em `client_services`: `recurrence_paused` (bool) para pausa/cancelamento

**Frontend:**
- Em `clientes.$id.tsx` (vínculo de serviços), botão "Ativar serviço" chama o RPC e trata erros
- Toggle pausar/cancelar com a regra: pausa suspende futuras, cancela mantém histórico

**Distribuição financeira:**
- Ao ativar, registrar em uma nova tabela `service_revenue_distribution` (client_service_id, mtx_value, commercial_value, executor_value, period) — base para indicadores futuros

---

## Itens fora deste escopo (confirmo no final)
- Geração automática contínua de tarefas recorrentes mês após mês: implemento a **primeira** ocorrência na ativação; a geração mensal/semanal recorrente via cron exige `pg_cron` — posso adicionar se você confirmar, ou deixar como "próximo passo".
- Reordenação drag-and-drop do template: implemento com `@dnd-kit` (já usado no projeto).

---

## Como prefiro entregar
Sugiro fazer **Fase 1 + Fase 2** num primeiro turno (CRM completo), e **Fase 3 + Fase 4** num segundo turno (Serviços + automação). Cada fase termina com migration aprovada por você antes do código.

**Posso começar pela Fase 1?**
