import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  GripVertical,
  ExternalLink,
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAIL_PHASE_LABELS, TRAIL_PHASE_LIST, type TrailPhase } from "@/types";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type CardStatus = "pendente" | "em_andamento" | "concluida";

const STATUS_META: Record<CardStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-zinc-500/15 text-zinc-300" },
  em_andamento: { label: "Em andamento", color: "bg-amber-500/15 text-amber-400" },
  concluida: { label: "Concluída", color: "bg-emerald-500/15 text-emerald-400" },
};

interface ChecklistItem {
  text: string;
  done: boolean;
}
interface TrainingLink {
  label: string;
  url: string;
}

export interface JourneyCard {
  id: string;
  young_id: string;
  phase: TrailPhase;
  position: number;
  title: string;
  description: string | null;
  status: CardStatus;
  checklist: ChecklistItem[];
  training_links: TrainingLink[];
  created_at: string;
  updated_at: string;
}

interface Props {
  youngId: string;
  canEdit: boolean;
  canReassign?: boolean;
  title?: string;
}

export function JourneyKanban({ youngId, canEdit, canReassign = false, title }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<JourneyCard | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState<TrailPhase | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["journey-phases", youngId],
    enabled: !!youngId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phases")
        .select("*")
        .eq("young_id", youngId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((d) => ({
        ...d,
        checklist: Array.isArray(d.checklist) ? d.checklist : [],
        training_links: Array.isArray(d.training_links) ? d.training_links : [],
      })) as unknown as JourneyCard[];
    },
  });

  const cardsByPhase = useMemo(() => {
    const map: Record<TrailPhase, JourneyCard[]> = {
      fase_1: [], fase_2: [], fase_3: [], fase_4: [], fase_5: [],
    };
    cards.forEach((c) => {
      if (map[c.phase]) map[c.phase].push(c);
    });
    return map;
  }, [cards]);

  const moveMutation = useMutation({
    mutationFn: async (updates: { id: string; phase: TrailPhase; position: number }[]) => {
      // batch updates sequentially (small N)
      for (const u of updates) {
        const { error } = await supabase
          .from("journey_phases")
          .update({ phase: u.phase, position: u.position } as never)
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["journey-phases", youngId] });
    },
  });

  const handleDragStart = (e: DragStartEvent) => {
    const found = cards.find((c) => c.id === e.active.id);
    if (found) setActiveCard(found);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over || !canEdit) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeCardData = cards.find((c) => c.id === activeId);
    if (!activeCardData) return;

    // dropped over a phase column directly
    const isPhaseTarget = TRAIL_PHASE_LIST.includes(overId as TrailPhase);
    const targetPhase: TrailPhase = isPhaseTarget
      ? (overId as TrailPhase)
      : cards.find((c) => c.id === overId)?.phase ?? activeCardData.phase;

    // build new arrays for source and target
    const srcList = [...cardsByPhase[activeCardData.phase]];
    const tgtList = activeCardData.phase === targetPhase
      ? srcList
      : [...cardsByPhase[targetPhase]];

    if (activeCardData.phase === targetPhase) {
      if (isPhaseTarget) {
        // drop in same phase but no specific position → end
      } else {
        const oldIdx = srcList.findIndex((c) => c.id === activeId);
        const newIdx = srcList.findIndex((c) => c.id === overId);
        if (oldIdx === -1 || newIdx === -1) return;
        const reordered = arrayMove(srcList, oldIdx, newIdx);
        const updates = reordered.map((c, i) => ({
          id: c.id, phase: targetPhase, position: i,
        }));
        // optimistic update
        qc.setQueryData<JourneyCard[]>(["journey-phases", youngId], (prev) => {
          if (!prev) return prev;
          return prev.map((c) => {
            const u = updates.find((x) => x.id === c.id);
            return u ? { ...c, position: u.position } : c;
          });
        });
        moveMutation.mutate(updates);
        return;
      }
    }

    // move between phases
    const srcFiltered = srcList.filter((c) => c.id !== activeId);
    const insertAt = isPhaseTarget
      ? tgtList.length
      : tgtList.findIndex((c) => c.id === overId);
    const newTgt = [...tgtList];
    newTgt.splice(insertAt < 0 ? newTgt.length : insertAt, 0, {
      ...activeCardData,
      phase: targetPhase,
    });
    const srcUpdates = srcFiltered.map((c, i) => ({
      id: c.id, phase: activeCardData.phase, position: i,
    }));
    const tgtUpdates = newTgt.map((c, i) => ({
      id: c.id, phase: targetPhase, position: i,
    }));
    const updates = [...srcUpdates, ...tgtUpdates];

    qc.setQueryData<JourneyCard[]>(["journey-phases", youngId], (prev) => {
      if (!prev) return prev;
      return prev.map((c) => {
        const u = updates.find((x) => x.id === c.id);
        return u ? { ...c, phase: u.phase, position: u.position } : c;
      });
    });
    moveMutation.mutate(updates);
  };

  const openCard = cards.find((c) => c.id === openCardId) ?? null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {TRAIL_PHASE_LIST.map((p) => (
          <Skeleton key={p} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {TRAIL_PHASE_LIST.map((phase) => (
            <PhaseColumn
              key={phase}
              phase={phase}
              cards={cardsByPhase[phase]}
              canEdit={canEdit}
              onOpenCard={(id) => setOpenCardId(id)}
              onAddCard={() => setShowNew(phase)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && <CardPreview card={activeCard} />}
        </DragOverlay>
      </DndContext>

      {openCard && (
        <CardDrawer
          card={openCard}
          canEdit={canEdit}
          onClose={() => setOpenCardId(null)}
          onUpdated={() =>
            qc.invalidateQueries({ queryKey: ["journey-phases", youngId] })
          }
        />
      )}

      {showNew && canEdit && (
        <NewCardDialog
          youngId={youngId}
          phase={showNew}
          nextPosition={cardsByPhase[showNew].length}
          onClose={() => setShowNew(null)}
          onCreated={() =>
            qc.invalidateQueries({ queryKey: ["journey-phases", youngId] })
          }
        />
      )}
    </div>
  );
}

/* -------------------- Phase Column -------------------- */
function PhaseColumn({
  phase,
  cards,
  canEdit,
  onOpenCard,
  onAddCard,
}: {
  phase: TrailPhase;
  cards: JourneyCard[];
  canEdit: boolean;
  onOpenCard: (id: string) => void;
  onAddCard: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card/60 p-3 flex flex-col gap-2 min-h-[12rem] transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {phase.replace("_", " ")}
          </p>
          <p className="text-sm font-semibold leading-tight">
            {TRAIL_PHASE_LABELS[phase]}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {cards.length}
        </Badge>
      </div>

      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 flex-1">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onOpen={() => onOpenCard(c.id)} />
          ))}
          {cards.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              Sem cards
            </p>
          )}
        </div>
      </SortableContext>

      {canEdit && (
        <Button size="sm" variant="ghost" onClick={onAddCard} className="justify-start">
          <Plus className="h-4 w-4 mr-1" /> Novo card
        </Button>
      )}
    </div>
  );
}

/* -------------------- Sortable Card -------------------- */
function SortableCard({ card, onOpen }: { card: JourneyCard; onOpen: () => void }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const done = card.checklist.filter((i) => i.done).length;
  const total = card.checklist.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-background p-2 flex gap-2 cursor-pointer hover:border-primary/40 transition"
      onClick={onOpen}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-foreground touch-none"
        aria-label="Mover card"
      >
        <GripVertical className="h-4 w-4 mt-0.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{card.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", STATUS_META[card.status].color)}>
            {STATUS_META[card.status].label}
          </span>
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {done}/{total} checklist
            </span>
          )}
          {card.training_links.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              🎓 {card.training_links.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CardPreview({ card }: { card: JourneyCard }) {
  return (
    <div className="rounded-md border bg-background p-2 shadow-lg max-w-xs">
      <p className="text-sm font-medium">{card.title}</p>
    </div>
  );
}

/* -------------------- Drawer -------------------- */
function CardDrawer({
  card,
  canEdit,
  onClose,
  onUpdated,
}: {
  card: JourneyCard;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [status, setStatus] = useState<CardStatus>(card.status);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist);
  const [links, setLinks] = useState<TrainingLink[]>(card.training_links);
  const [newItem, setNewItem] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("journey_phases")
        .update({
          title,
          description: description || null,
          status,
          checklist,
          training_links: links,
        } as never)
        .eq("id", card.id);
      if (error) throw error;
      await logActivity({
        action: "journey_card_updated",
        entity_type: "journey_phase",
        entity_id: card.id,
        description: `Card "${title}" atualizado`,
      });
      toast.success("Card atualizado");
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Excluir este card?")) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("journey_phases")
        .delete()
        .eq("id", card.id);
      if (error) throw error;
      await logActivity({
        action: "journey_card_deleted",
        entity_type: "journey_phase",
        entity_id: card.id,
        description: `Card "${card.title}" excluído`,
      });
      toast.success("Card excluído");
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{TRAIL_PHASE_LABELS[card.phase]}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CardStatus)}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_META) as CardStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Checklist</Label>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) return;
                      const next = [...checklist];
                      next[idx] = { ...item, done: !item.done };
                      setChecklist(next);
                    }}
                    className="text-muted-foreground"
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                  <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>
                    {item.text}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Novo item"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItem.trim()) {
                        e.preventDefault();
                        setChecklist([...checklist, { text: newItem.trim(), done: false }]);
                        setNewItem("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!newItem.trim()) return;
                      setChecklist([...checklist, { text: newItem.trim(), done: false }]);
                      setNewItem("");
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Links de treinamento</Label>
            <div className="space-y-1.5">
              {links.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 truncate"
                  >
                    <ExternalLink className="h-3 w-3" /> {l.label}
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Título"
                  />
                  <div className="flex gap-1">
                    <Input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
                        setLinks([...links, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
                        setNewLinkLabel("");
                        setNewLinkUrl("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="destructive" size="sm" onClick={remove} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Excluir
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------- New Card Dialog -------------------- */
function NewCardDialog({
  youngId, phase, nextPosition, onClose, onCreated,
}: {
  youngId: string;
  phase: TrailPhase;
  nextPosition: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("journey_phases")
        .insert({
          young_id: youngId,
          phase,
          position: nextPosition,
          title: title.trim(),
          description: description || null,
          status: "pendente",
          checklist: [],
          training_links: [],
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await logActivity({
        action: "journey_card_created",
        entity_type: "journey_phase",
        entity_id: data.id as string,
        description: `Card "${title}" criado em ${TRAIL_PHASE_LABELS[phase]}`,
      });
      toast.success("Card criado");
      onCreated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo card · {TRAIL_PHASE_LABELS[phase]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handle} disabled={submitting || !title.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
