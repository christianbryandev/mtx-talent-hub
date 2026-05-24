import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  UserPlus,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";

export const Route = createFileRoute("/_authenticated/admin/journey-catalog")({
  head: () => ({ meta: [{ title: "Admin · Catálogo Jornada — MTX Hub" }] }),
  component: AdminJourneyCatalogPage,
});

interface Phase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  xp_reward: number;
  has_quiz: boolean;
}

interface Card {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  order_index: number;
  xp_reward: number;
}

interface Item {
  id: string;
  card_id: string;
  module_id: string | null;
  title: string;
  required: boolean;
  order_index: number;
}

interface Module {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_body: string | null;
  order_index: number;
}

function AdminJourneyCatalogPage() {
  const { isAdmin, loading } = usePermissions();
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Catálogo da Jornada
        </h1>
        <p className="text-sm text-muted-foreground">
          Edite fases, cards e checklists. Atribua fases a jovens específicos.
        </p>
      </div>
      <Tabs defaultValue="fases">
        <TabsList>
          <TabsTrigger value="fases">Fases & Conteúdo</TabsTrigger>
          <TabsTrigger value="atribuicoes">Atribuições</TabsTrigger>
        </TabsList>
        <TabsContent value="fases" className="mt-4">
          <PhasesTab />
        </TabsContent>
        <TabsContent value="atribuicoes" className="mt-4">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Phases Tab ----------------------------- */

function PhasesTab() {
  const qc = useQueryClient();
  const phases = useQuery<Phase[]>({
    queryKey: ["catalog-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_catalog")
        .select("id,title,description,order_index,xp_reward,has_quiz")
        .order("order_index");
      if (error) throw error;
      return data as Phase[];
    },
  });

  const createPhase = useMutation({
    mutationFn: async () => {
      const nextOrder = (phases.data?.length ?? 0) + 1;
      const { error } = await supabase.from("journey_phase_catalog").insert({
        title: `Nova fase ${nextOrder}`,
        order_index: nextOrder,
        xp_reward: 0,
        has_quiz: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase criada");
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (phases.isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => createPhase.mutate()} disabled={createPhase.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Nova fase
        </Button>
      </div>
      {(phases.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma fase no catálogo. Crie a primeira.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(phases.data ?? []).map((p) => (
            <PhaseRow key={p.id} phase={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseRow({ phase }: { phase: Phase }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Phase>(phase);
  const dirty = JSON.stringify(draft) !== JSON.stringify(phase);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journey_phase_catalog")
        .update({
          title: draft.title,
          description: draft.description,
          order_index: draft.order_index,
          xp_reward: draft.xp_reward,
          has_quiz: draft.has_quiz,
        })
        .eq("id", phase.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase salva");
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
      qc.invalidateQueries({ queryKey: ["catalog-phases-metadata"] });
      qc.invalidateQueries({ queryKey: ["user-journey"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journey_phase_catalog")
        .delete()
        .eq("id", phase.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase removida");
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            className="h-8 w-8 shrink-0"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <CardTitle className="text-base flex-1 truncate">
            #{phase.order_index} · {phase.title}
          </CardTitle>
          {phase.has_quiz && <Badge variant="secondary">Quiz</Badge>}
          <Badge variant="outline">{phase.xp_reward} XP</Badge>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={draft.order_index}
                onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label>XP de recompensa</Label>
              <Input
                type="number"
                value={draft.xp_reward}
                onChange={(e) => setDraft({ ...draft, xp_reward: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                id={`quiz-${phase.id}`}
                checked={draft.has_quiz}
                onCheckedChange={(v) => setDraft({ ...draft, has_quiz: v })}
              />
              <Label htmlFor={`quiz-${phase.id}`}>Possui quiz</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar fase
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm("Remover esta fase e todos os cards/itens dela?")) remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <ModulesEditor phaseId={phase.id} />
            <CardsEditor phaseId={phase.id} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------- Cards -------------------------------- */

function CardsEditor({ phaseId }: { phaseId: string }) {
  const qc = useQueryClient();
  const cards = useQuery<Card[]>({
    queryKey: ["catalog-cards", phaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_cards")
        .select("id,phase_id,title,description,order_index,xp_reward")
        .eq("phase_id", phaseId)
        .order("order_index");
      if (error) throw error;
      return data as Card[];
    },
  });

  const createCard = useMutation({
    mutationFn: async () => {
      const nextOrder = (cards.data?.length ?? 0) + 1;
      const { error } = await supabase.from("journey_cards").insert({
        phase_id: phaseId,
        title: `Novo card ${nextOrder}`,
        order_index: nextOrder,
        xp_reward: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Card criado");
      qc.invalidateQueries({ queryKey: ["catalog-cards", phaseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Cards desta fase</h4>
        <Button size="sm" variant="outline" onClick={() => createCard.mutate()} disabled={createCard.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Novo card
        </Button>
      </div>
      {cards.isLoading ? (
        <Skeleton className="h-24" />
      ) : (cards.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum card ainda.</p>
      ) : (
        <div className="space-y-2">
          {(cards.data ?? []).map((c) => (
            <CardRow key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Card>(card);
  const dirty = JSON.stringify(draft) !== JSON.stringify(card);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journey_cards")
        .update({
          title: draft.title,
          description: draft.description,
          order_index: draft.order_index,
          xp_reward: draft.xp_reward,
        })
        .eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Card salvo");
      qc.invalidateQueries({ queryKey: ["catalog-cards", card.phase_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("journey_cards").delete().eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Card removido");
      qc.invalidateQueries({ queryKey: ["catalog-cards", card.phase_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border bg-muted/30">
      <div className="flex items-center gap-2 p-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
        <span className="text-sm flex-1 truncate">
          #{card.order_index} · {card.title}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {card.xp_reward} XP
        </Badge>
      </div>
      {open && (
        <div className="space-y-3 p-3 pt-0">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input
                type="number"
                value={draft.order_index}
                onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">XP</Label>
              <Input
                type="number"
                value={draft.xp_reward}
                onChange={(e) => setDraft({ ...draft, xp_reward: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar card
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm("Remover este card e seus itens?")) remove.mutate();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
          </div>
          <ItemsEditor cardId={card.id} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Items -------------------------------- */

function ItemsEditor({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const items = useQuery<Item[]>({
    queryKey: ["catalog-items", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_checklist_items")
        .select("id,card_id,module_id,title,required,order_index")
        .eq("card_id", cardId)
        .order("order_index");
      if (error) throw error;
      return data as Item[];
    },
  });

  const [newTitle, setNewTitle] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const title = newTitle.trim();
      if (!title) throw new Error("Informe o título do item");
      const nextOrder = (items.data?.length ?? 0) + 1;
      const { error } = await supabase.from("journey_checklist_items").insert({
        card_id: cardId,
        title,
        required: true,
        order_index: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      qc.invalidateQueries({ queryKey: ["catalog-items", cardId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (it: Item) => {
      const { error } = await supabase
        .from("journey_checklist_items")
        .update({ 
          title: it.title, 
          required: it.required, 
          order_index: it.order_index,
          module_id: it.module_id 
        })
        .eq("id", it.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-items", cardId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journey_checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-items", cardId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold text-muted-foreground">Itens do checklist</h5>
      {items.isLoading ? (
        <Skeleton className="h-16" />
      ) : (
        <div className="space-y-1.5">
          {(items.data ?? []).map((it) => (
            <ItemRow key={it.id} item={it} onSave={update.mutate} onRemove={remove.mutate} />
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Input
          placeholder="Novo item do checklist"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create.mutate()}
        />
        <Button size="sm" variant="outline" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: Item;
  onSave: (it: Item) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Item>(item);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);

  return (
    <div className="flex items-center gap-2 rounded border bg-background p-2">
      <Input
        className="h-8"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={draft.required}
          onCheckedChange={(v) => setDraft({ ...draft, required: v })}
        />
        <span className="text-xs text-muted-foreground">obrigatório</span>
      </div>
      <Input
        type="number"
        className="h-8 w-16"
        value={draft.order_index}
        onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) || 0 })}
      />
      {dirty && (
        <Button size="sm" variant="ghost" onClick={() => onSave(draft)}>
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* --------------------------- Assignments Tab -------------------------- */

function AssignmentsTab() {
  const qc = useQueryClient();
  const [youngId, setYoungId] = useState<string | null>(null);
  const [phaseToAssign, setPhaseToAssign] = useState<string>("");

  const phases = useQuery<Phase[]>({
    queryKey: ["catalog-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_catalog")
        .select("id,title,description,order_index,xp_reward,has_quiz")
        .order("order_index");
      if (error) throw error;
      return data as Phase[];
    },
  });

  const assignments = useQuery({
    queryKey: ["phase-assignees", youngId],
    enabled: !!youngId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_assignees")
        .select("id,phase_id,created_at")
        .eq("young_id", youngId!);
      if (error) throw error;
      return data as { id: string; phase_id: string; created_at: string }[];
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!youngId || !phaseToAssign) throw new Error("Selecione jovem e fase.");
      const { error } = await supabase
        .from("journey_phase_assignees")
        .insert({ young_id: youngId, phase_id: phaseToAssign });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase atribuída");
      setPhaseToAssign("");
      qc.invalidateQueries({ queryKey: ["phase-assignees", youngId] });
    },
    onError: (e: Error) =>
      toast.error(
        /duplicate|unique/i.test(e.message)
          ? "Esta fase já está atribuída a este jovem."
          : e.message,
      ),
  });

  const unassign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journey_phase_assignees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atribuição removida");
      qc.invalidateQueries({ queryKey: ["phase-assignees", youngId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const phaseMap = new Map((phases.data ?? []).map((p) => [p.id, p] as const));
  const assignedIds = new Set((assignments.data ?? []).map((a) => a.phase_id));
  const available = (phases.data ?? []).filter((p) => !assignedIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atribuir fases a um jovem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use para conceder acesso a fases específicas além das fases globais do catálogo.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5 max-w-md">
          <Label>Jovem</Label>
          <YoungSearchSelect value={youngId} onChange={setYoungId} placeholder="Selecionar jovem" />
        </div>

        {youngId && (
          <>
            <div className="space-y-2">
              <Label>Atribuir nova fase</Label>
              <div className="flex gap-2">
                <Select value={phaseToAssign} onValueChange={setPhaseToAssign}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Selecione uma fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">
                        Todas as fases já atribuídas.
                      </div>
                    ) : (
                      available.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          #{p.order_index} · {p.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={() => assign.mutate()} disabled={!phaseToAssign || assign.isPending}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Atribuir
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fases atribuídas</Label>
              {assignments.isLoading ? (
                <Skeleton className="h-24" />
              ) : (assignments.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atribuição individual.</p>
              ) : (
                <div className="divide-y rounded-md border">
                  {(assignments.data ?? []).map((a) => {
                    const p = phaseMap.get(a.phase_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p ? `#${p.order_index} · ${p.title}` : "Fase removida"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Atribuída em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => unassign.mutate(a.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
