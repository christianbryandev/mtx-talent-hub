# Sistema de Quizzes por Fase

## Objetivo
Adicionar quizzes interativos por fase da jornada, com nota mínima 80%, retries permitidos apenas em caso de falha, e XP concedido apenas ao passar (uma única vez por quiz). Backend permanece como SSOT.

## 1. Banco de dados (migration)

Novas tabelas:

- **`quiz_templates`** — `id`, `phase_id` (FK `journey_phase_catalog`), `title`, `description`, `passing_score` (default 80), `is_active` (default true), `version` (default 1), `created_at`. UNIQUE parcial em `(phase_id) WHERE is_active`.
- **`quiz_questions`** — `id`, `quiz_id`, `question`, `type` (default `multiple_choice`), `order_index`.
- **`quiz_options`** — `id`, `question_id`, `text`, `is_correct`, `order_index`.

Extensão de `journey_quiz_attempts` (já existe — não recriar):
- Adicionar coluna `quiz_id uuid` (nullable, FK para `quiz_templates`)
- Adicionar coluna `attempt_number int default 1`
- Manter `phase_id`, `score`, `passed`, `user_id` intactos (compat com `submit_quiz_attempt` atual).

**RLS:**
- `quiz_templates`, `quiz_questions`, `quiz_options`: SELECT para `authenticated`; ALL para admin/super_admin.
- `journey_quiz_attempts`: já tem policy `jqa_self` adequada.

## 2. Backend — RPCs

- **`get_phase_quiz(_phase_id)`** — retorna quiz ativo com perguntas e opções (sem `is_correct`) + flag `already_passed` para o usuário corrente.
- **`submit_phase_quiz(_phase_id, _answers jsonb)`** — `_answers` = `[{question_id, option_id}]`. SECURITY DEFINER:
  1. Bloqueia se já passou (`passed=true` em qualquer tentativa anterior do `quiz_id` ativo).
  2. Calcula score = `correct/total * 100`.
  3. Determina `passed = score >= passing_score`.
  4. Calcula `attempt_number = MAX(attempt_number)+1` para o `(user_id, quiz_id)`.
  5. Insere em `journey_quiz_attempts` (com `quiz_id` e `attempt_number`).
  6. Se passou: reusa fluxo já existente — atualiza `user_phase_status` para `concluido` (apenas se cards completos, igual ao `submit_quiz_attempt`), chama `process_xp_event('phase_completed', phase_id, xp)` (idempotente — XP nunca duplica), desbloqueia próxima fase.
  7. Retorna `{score, passed, attempt_number, already_passed_before}`.

**Importante:** `submit_quiz_attempt` antigo (entrada manual de nota) permanece intacto para não quebrar o admin/legacy.

## 3. Frontend

**Serviço (`src/services/quizService.ts`)** — `getPhaseQuiz`, `submitPhaseQuiz`.

**Hook (`src/hooks/useQuiz.ts`)** — `useQuiz(phaseId)` retorna quiz + mutation `submit`. Invalida `["user-journey"]` em sucesso.

**Rota `/jornada/quiz/$phaseId` (`src/routes/_authenticated/jornada.quiz.$phaseId.tsx`)**:
- `QuizPlayer` — renderiza perguntas (radio group por pergunta), valida que todas foram respondidas, botão enviar.
- `QuizResult` — mostra score, passou/falhou. Se passou: badge "Concluído", link voltar. Se falhou: botão "Tentar novamente".
- Se `already_passed` no fetch inicial → mostra apenas estado bloqueado.

**Integração com `/jornada`**: substituir o input manual de nota dentro de `PhaseCard` por um botão `Fazer quiz` que navega para a rota acima, **apenas quando existe quiz_template ativo para a fase**. Quando não existe template, mantém o input legado (compatibilidade). Para isso, `get_user_journey` já retorna `has_quiz`; adicionamos no payload da fase um flag `has_quiz_template` (consulta a `quiz_templates`).

## 4. Admin (`/admin/quizzes` ou aba em `/minha-jornada`)

**Rota `src/routes/_authenticated/admin.quizzes.tsx`** (apenas admin/super_admin):
- Lista fases do catálogo.
- Para cada fase: criar/editar quiz (título, descrição, passing_score), gerenciar perguntas (texto + opções com flag correta), ativar/desativar.
- CRUD via `supabase.from('quiz_templates'/'quiz_questions'/'quiz_options')` — RLS admin já cobre.

Link no sidebar admin (se houver) ou botão na página `/minha-jornada`.

## Detalhes técnicos

- Tipos do Supabase serão regenerados após a migration.
- Idempotência de XP: já garantida pelo `UNIQUE (user_id, event_type, reference_id)` em `xp_events` — reaproveitada via `process_xp_event`.
- Não tocar em: `mark_checklist_item`, `toggle_checklist_item`, `submit_quiz_attempt`, `get_user_journey` (apenas leitura adicional via novo RPC), fluxo de auth, fluxo de XP existente.
- Bloqueio de retry após aprovação: garantido no backend (RPC bloqueia) **e** na UI (estado `already_passed`).

## Arquivos

Criar:
- `supabase/migrations/<timestamp>_quiz_system.sql`
- `src/services/quizService.ts`
- `src/hooks/useQuiz.ts`
- `src/routes/_authenticated/jornada.quiz.$phaseId.tsx`
- `src/routes/_authenticated/admin.quizzes.tsx`

Editar (cirúrgico):
- `src/routes/_authenticated/jornada.tsx` — botão "Fazer quiz" condicional.
- `src/services/journeyService.ts` — tipo `JourneyPhase` ganha `has_quiz_template?: boolean`.
