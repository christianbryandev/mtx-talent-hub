## Entrega 2 — CRUD completo em todos os módulos admin

### A) Minha Jornada — atribuição na criação do card
Hoje a reatribuição de jovem só aparece ao **editar** um card (já implementado na Entrega 1). Vou adicionar o mesmo `YoungSearchSelect` no **NewCardDialog** (visível só pra admin/super_admin) — assim ao criar o card já dá pra escolher pra qual jovem ele vai. Comportamento: se nenhum jovem for escolhido, usa o `youngId` da página atual (o próprio).

### B) CRUD padronizado em todos os módulos
Padrão único: cada linha de lista / card / item de tabela ganha um menu "..." (DropdownMenu) com **Visualizar · Editar · Duplicar · Excluir**. Excluir usa `ConfirmDialog` (hard delete com confirmação). Duplicar copia o registro com sufixo "(cópia)". Editar abre o FormDialog existente em modo edição. Visualizar leva à rota de detalhe.

Módulos cobertos (lista → ação):

| Módulo | Lista | FormDialog | Cascade |
|---|---|---|---|
| **Clientes** | `clientes.index.tsx` | `ClientFormDialog` ✓ | `deleteClientCascade` ✓ |
| **Jovens** | `jovens.index.tsx` | `YoungFormDialog` ✓ | hard delete |
| **Serviços** | `servicos.index.tsx` | `ServiceFormDialog` ✓ | `deleteServiceCascade` ✓ |
| **CRM/Oportunidades** | `crm.lista.tsx` + `crm.index.tsx` (kanban) | `OpportunityFormDialog` ✓ | hard delete + limpar `opportunity_services` |
| **Tarefas/Kanban** | `tarefas.tsx` | `TaskFormDialog` ✓ | hard delete + limpar `task_*` |
| **Reuniões** | `reunioes.index.tsx` | `MeetingFormDialog` ✓ | hard delete + limpar `meeting_*` |
| **Usuários** | `users.tsx` | já tem invite/delete ✓ | já ok |

Para cada módulo eu adiciono um componente local `<RowActionsMenu />` reutilizável (ou um único compartilhado em `src/components/shared/RowActionsMenu.tsx`) com as 4 ações.

### C) Helpers compartilhados
- `src/components/shared/RowActionsMenu.tsx` — menu "..." com props `onView/onEdit/onDuplicate/onDelete` e flags de visibilidade. Só renderiza ações cujos handlers forem passados.
- Estender `src/lib/cascade-delete.ts` com:
  - `deleteOpportunityCascade(id)` — apaga `opportunity_services`, `opportunity_interactions`, `proposals` da oportunidade, e a `opportunities`.
  - `deleteTaskCascade(id)` — apaga `task_checklists`, `task_attachments`, `task_comments`, `meeting_tasks`, `tasks`.
  - `deleteMeetingCascade(id)` — apaga `meeting_participants`, `meeting_agenda_items`, `meeting_tasks`, `young_attendance` da reunião, `meetings`.
  - `deleteYoungCascade(id)` — apaga `service_young_people`, `young_attendance`, `young_evolution`, `journey_phases`, `meeting_participants`, detach em `tasks.young_responsible`, `clients.young_responsible`, e a `young_people`.

### D) Duplicação
Função genérica `duplicateRow(table, id, exclude: string[])`:
1. SELECT * WHERE id=$1
2. Remove `id`, `created_at`, `updated_at` + colunas únicas
3. Acrescenta " (cópia)" no campo principal (`title`/`full_name`/`company_name`/`name`)
4. INSERT
5. `logActivity` + `toast` + `refetch`

Aplicada em: Clientes (`company_name`), Jovens (`full_name`), Serviços (`name`), Oportunidades (`company_name`), Tarefas (`title`), Reuniões (`title`).

### E) Acesso
Todas as ações de Editar / Excluir / Duplicar usam `usePermissions().isAdmin` (super_admin + admin). Comercial mantém o que já pode (CRM/clientes). Colaborador só visualiza. Não muda nenhuma RLS — as policies já cobrem.

### F) UX
- Toast de sucesso/erro em todas as ações.
- `ConfirmDialog` em todos os Excluir, com nome do registro embedded na mensagem.
- Loading nos botões via `loading` prop do ConfirmDialog.
- `logActivity` em create/update/delete/duplicate.

### Não inclui (vai pra Entrega 3)
- Padronizar os Selects relacionais (clientes, serviços, jovens) com autocomplete em **todos** os FormDialogs. Já existe `YoungSearchSelect` e `ServiceMultiSelect`; faltam `ClientSearchSelect`, `ServiceSearchSelect` etc. — isso é o foco da Entrega 3.
