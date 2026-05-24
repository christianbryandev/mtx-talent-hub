## Plano de Busca Global

1. **Schema da busca**: Criar um componente `GlobalSearch` usando o `CommandDialog` do `cmdk`.
2. **Lógica**: Implementar uma função que busca em paralelo em múltiplas tabelas Supabase (usando `Promise.all` e `supabase.from().select()`).
   - Tabelas: `young_people` (+`profiles` join), `clients` (+`profiles` join), `opportunities`, `services`, `tasks`, `journey_phase_catalog`, `journey_modules`, `quiz_templates`, `quiz_questions`, `notifications`, `meetings`, `profiles`, `proposals`, `client_briefings`.
3. **UI do Modal**:
   - Componente `GlobalSearch` com `CommandDialog`.
   - Categorias e ícones definidos para cada tipo.
   - Histórico recente salvo no localStorage (`localStorage.getItem('global-search-history')`).
4. **Permissões**: Filtrar por `isAdmin`.
5. **Integração no Header**:
   - Adicionar o botão/input da busca ao `AppTopbar`.
   - Adicionar o listener global `Ctrl+K` ou `Cmd+K`.
6. **Otimizações**:
   - Debounce de 300ms.
   - Limitar 5 resultados por categoria.
   - Skeleton loading.

## detalhes técnicos
- O `GlobalSearch` será um novo componente em `src/components/shared/GlobalSearch.tsx`.
- Usaremos o `cmdk` para a interface (já instalado no projeto).
- As queries serão disparadas em paralelo.
- Os resultados serão processados para exibição uniforme.
- O histórico será persistido no `localStorage`.
- O acesso será protegido validando `usePermissions()` para exibir o componente.
