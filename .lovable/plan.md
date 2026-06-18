Remover o item **"Mídia da Jornada"** do sidebar, pois a funcionalidade foi descontinuada.

- **Arquivo afetado:** `src/components/layout/AppSidebar.tsx`
- **Mudança:** Excluir a linha do item `{ title: "Mídia da Jornada", url: "/admin/journey-media", icon: Film, roles: ["super_admin"] }` do grupo `adminGroups` (dentro do grupo "Conteúdo").
- **Limpeza:** Remover o ícone `Film` dos imports do `lucide-react` caso não seja mais usado em nenhum outro lugar do componente.