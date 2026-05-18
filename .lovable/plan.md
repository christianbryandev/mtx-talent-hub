## Visão geral

Construir a fundação do MTX Hub: identidade visual dark premium com destaque dourado, autenticação completa (Supabase Auth), sistema de papéis (RBAC), layout shell reutilizável (sidebar + topbar) e páginas iniciais funcionais. Demais módulos ficam como placeholders "Em construção".

## Stack (ajuste importante)

O template usa **TanStack Router/Start** (não React Router DOM). Vou manter esse stack — toda navegação, rotas protegidas e SSR seguirão padrões TanStack. Para o usuário final, a experiência é idêntica.

Demais bibliotecas pedidas (Tailwind, shadcn/ui, RHF + Zod, TanStack Query, Lucide, Recharts, Supabase) já estão instaladas.

## 1. Design system (`src/styles.css`)

Reescrever tokens em `oklch`:
- background: `#0F0F0F`, card/surface: `#1A1A2E`, border: `#2A2A3E`
- primary (dourado): `#D4A017`
- foreground: `#FFFFFF`, muted-foreground: `#A0A0B0`
- success/warning/destructive/info
- raio 10px, dark como padrão

Importar fonte **Inter** via `<link>` no `__root.tsx`.

## 2. Banco de dados (migração)

```text
enum app_role: 'super_admin' | 'admin' | 'comercial' | 'colaborador' | 'cliente'

profiles (
  id uuid PK -> auth.users,
  full_name, avatar_url,
  is_active boolean default true,
  created_at, updated_at
)

user_roles (   -- tabela SEPARADA (segurança)
  id, user_id -> auth.users, role app_role, unique(user_id, role)
)

activity_logs (
  id, user_id, action, entity_type, entity_id, description, created_at
)
```

- Função `has_role(uuid, app_role)` SECURITY DEFINER
- Trigger `on_auth_user_created` → cria profile + role padrão `colaborador`
- RLS habilitado em todas; policies usando `has_role()` (evita recursão)
- `super_admin` lê/edita tudo; usuários leem o próprio profile

## 3. Autenticação

- `/login` — email + senha
- `/forgot-password` — `resetPasswordForEmail` com redirect para `/reset-password`
- `/reset-password` — `updateUser({ password })` ao detectar `type=recovery`
- Listener `onAuthStateChange` no root + `router.invalidate()`
- Sessão persistente via cliente padrão

Sem Google OAuth nesta etapa (não foi pedido explicitamente; pode ser adicionado depois).

## 4. RBAC

- `src/hooks/useAuth.ts` — usuário + sessão + loading
- `src/hooks/usePermissions.ts` — `role`, `can(action)`, `hasRole(roles[])`
- Rotas protegidas via layout `_authenticated.tsx` (`beforeLoad` redireciona para `/login`)
- Subcamadas: `_authenticated/_admin.tsx` para gates por papel (Usuários, Configurações)

## 5. Layout shell

`src/routes/_authenticated.tsx` renderiza:
- **Sidebar** (240px, collapsible via shadcn `Sidebar`): logo MTX Hub, navegação completa com ícones Lucide, item ativo dourado, footer com avatar + logout
- **Topbar** (64px): título do módulo, busca global, sino de notificações, avatar
- **Main**: `<Outlet />` com scroll

Componente `AppSidebar` em `src/components/layout/`.

## 6. Páginas geradas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/login`, `/forgot-password`, `/reset-password` | público | Forms RHF+Zod |
| `/` | redireciona p/ `/dashboard` ou `/login` |
| `/dashboard` | autenticado | KPIs, atividade recente, próximas reuniões, tarefas, 2 mini-charts Recharts |
| `/jovens`, `/clientes`, `/crm`, `/servicos`, `/tarefas`, `/reunioes`, `/indicadores` | autenticado | Placeholder "Em construção" |
| `/users` | super_admin + admin | Lista de usuários, convidar, alterar papel, ativar/desativar |
| `/settings` | super_admin | Placeholder de configurações |
| 404 | — | Já existe no `__root.tsx`, refinar visual |

## 7. Organização de pastas

```text
src/
  components/
    layout/        AppSidebar, AppTopbar, AuthLayout
    dashboard/     KpiCard, RecentActivity, UpcomingMeetings, ...
    ui/            (shadcn existente)
  hooks/           useAuth, usePermissions
  lib/             utils, format
  types/           index.ts (Profile, Role, ActivityLog, ...)
  routes/
    __root.tsx
    index.tsx                  (redireciona)
    login.tsx
    forgot-password.tsx
    reset-password.tsx
    _authenticated.tsx         (gate + shell)
    _authenticated/
      dashboard.tsx
      jovens.tsx
      clientes.tsx
      crm.tsx
      servicos.tsx
      tarefas.tsx
      reunioes.tsx
      indicadores.tsx
      _admin.tsx               (gate por papel)
      _admin/
        users.tsx
        settings.tsx
```

## 8. Detalhes técnicos

- `useAuth` usa `supabase.auth.getSession()` + listener `onAuthStateChange`
- `usePermissions` busca `user_roles` via TanStack Query (cache + invalidação no logout)
- `AppSidebar` usa `useRouterState` para item ativo
- Mutações de gestão de usuários via `createServerFn` + `supabaseAdmin` (RLS bypass controlado)
- Toast: `sonner`
- Todos os textos em pt-BR; `<title>` = "MTX Hub"

## 9. Fora de escopo desta etapa

- Conteúdo real dos módulos Jovens/Clientes/CRM/etc. (apenas placeholders)
- Notificações reais (sino é decorativo)
- Busca global funcional (input decorativo)
- Convite real por e-mail dentro de Usuários (UI pronta, integração no próximo prompt)
- Google/Apple login

Aprove o plano para eu começar a implementação.