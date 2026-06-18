import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
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
  GripVertical,
  Video,
  FileText,
  ArrowLeft,
  Loader2,
  Upload,
  CheckCircle2,
  Link2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

export const Route = createFileRoute("/_authenticated/admin/journey-catalog")({
  head: () => ({ meta: [{ title: "Admin · Catálogo Jornada — MTX Hub" }] }),
  component: AdminJourneyCatalogPage,
  ssr: false,
});

interface Phase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  xp_reward: number;
  has_quiz: boolean;
  status: "publicado" | "rascunho";
  modules_count?: number;
}

interface ModuleLink {
  label: string;
  url: string;
}

interface Module {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_body: string | null;
  order_index: number;
  duration_minutes?: number | null;
  links?: ModuleLink[] | null;
  visibility_type?: "all" | "selected" | "admin_only";
  assigned_users?: string[];
  supplementary_text?: string | null;
  thumbnail_url?: string | null;
}

function AdminJourneyCatalogPage() {
  const { isAdmin, loading } = usePermissions();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Catálogo da Jornada
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie fases e módulos (vídeos, quizzes e textos) para a jornada dos jovens.
          </p>
        </div>
      </header>

      <Tabs defaultValue="fases">
        <TabsList>
          <TabsTrigger value="fases">Fases & Módulos</TabsTrigger>
          <TabsTrigger value="atribuicoes">Atribuições</TabsTrigger>
        </TabsList>
        <TabsContent value="fases" className="mt-4">
          <PhasesTab 
            selectedPhaseId={selectedPhaseId} 
            onSelectPhase={setSelectedPhaseId} 
          />
        </TabsContent>
        <TabsContent value="atribuicoes" className="mt-4">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Phases Tab ----------------------------- */

function PhasesTab({ 
  selectedPhaseId, 
  onSelectPhase 
}: { 
  selectedPhaseId: string | null;
  onSelectPhase: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const phases = useQuery<Phase[]>({
    queryKey: ["catalog-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_catalog")
        .select(`
          *,
          journey_modules (count)
        `)
        .order("order_index");
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        modules_count: (p as any).journey_modules?.[0]?.count || 0
      })) as Phase[];
    },
  });

  const reorderPhases = useMutation({
    mutationFn: async (newPhases: Phase[]) => {
      for (let i = 0; i < newPhases.length; i++) {
        await supabase
          .from("journey_phase_catalog")
          .update({ order_index: i + 1 })
          .eq("id", newPhases[i].id);
      }
    },
    onMutate: async (newPhases) => {
      await qc.cancelQueries({ queryKey: ["catalog-phases"] });
      const previousPhases = qc.getQueryData(["catalog-phases"]);
      qc.setQueryData(["catalog-phases"], newPhases);
      return { previousPhases };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["catalog-phases"] }),
    onError: (e: Error, _, context: any) => {
      if (context?.previousPhases) qc.setQueryData(["catalog-phases"], context.previousPhases);
      toast.error(e.message);
    },
  });

  const createPhase = useMutation({
    mutationFn: async () => {
      const nextOrder = (phases.data?.length ?? 0) + 1;
      const { data, error } = await supabase.from("journey_phase_catalog").insert({
        title: `Nova fase ${nextOrder}`,
        order_index: nextOrder,
        xp_reward: 0,
        has_quiz: false,
        status: "rascunho"
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Fase criada");
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
      onSelectPhase(data.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !phases.data) return;
    const items = Array.from(phases.data);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderPhases.mutate(items);
  };

  const selectedPhase = phases.data?.find(p => p.id === selectedPhaseId);

  if (phases.isLoading) return <Skeleton className="h-48 w-full" />;

  if (selectedPhase) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => onSelectPhase(null)} className="p-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para fases
        </Button>
        <PhaseEditor phase={selectedPhase} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Fases da Jornada</h3>
        <Button onClick={() => createPhase.mutate()} disabled={createPhase.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Nova fase
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="phases">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {(phases.data ?? []).map((p, index) => (
                <Draggable key={p.id} draggableId={p.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={provided.draggableProps.style as React.CSSProperties}
                      className="group"
                    >
                      <Card 
                        className="cursor-pointer hover:border-primary/40 transition-all border-border/60 bg-card"
                        onClick={() => onSelectPhase(p.id)}
                      >
                        <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-primary">FASE {p.order_index.toString().padStart(2, "0")}</span>
                              <Badge variant={p.status === "publicado" ? "secondary" : "outline"} className="text-[10px]">
                                {(p.status || "rascunho").toUpperCase()}
                              </Badge>
                            </div>
                            <CardTitle className="text-base truncate mt-0.5">{p.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {p.modules_count || 0} módulos
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                        </CardHeader>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(phases.data ?? []).length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma fase no catálogo. Crie a primeira.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

function PhaseEditor({ phase }: { phase: Phase }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Phase>(phase);
  const dirty = JSON.stringify(draft) !== JSON.stringify(phase);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journey_phase_catalog")
        .update({
          title: draft.title,
          description: draft.description,
          status: draft.status,
          xp_reward: draft.xp_reward,
        })
        .eq("id", phase.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fase salva");
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Configurações da Fase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Título da Fase</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select 
                value={draft.status || "rascunho"} 
                onValueChange={(v: "publicado" | "rascunho") => setDraft({ ...draft, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea 
                value={draft.description ?? ""} 
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} 
                rows={2}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => confirm("Excluir esta fase?") && remove.mutate()}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Fase
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModulesEditor phaseId={phase.id} />
    </div>
  );
}

/* ------------------------------- Modules -------------------------------- */

function ModulesEditor({ phaseId }: { phaseId: string }) {
  const qc = useQueryClient();
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const modules = useQuery<Module[]>({
    queryKey: ["catalog-modules", phaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_modules")
        .select("*")
        .eq("phase_id", phaseId)
        .order("order_index");
      if (error) throw error;
      return (data || []) as unknown as Module[];
    },
  });

  const createModule = useMutation({
    mutationFn: async (type: "video" | "quiz" | "texto") => {
      const nextOrder = (modules.data?.length ?? 0) + 1;
      const { data, error } = await supabase.from("journey_modules").insert({
        phase_id: phaseId,
        title: type === "video" ? "Novo Vídeo" : type === "quiz" ? "Novo Quiz" : "Novo Texto",
        content_type: type,
        order_index: nextOrder
      }).select().single();
      if (error) throw error;
      return data;
    },

    onSuccess: (data) => {
      toast.success("Módulo criado");
      qc.invalidateQueries({ queryKey: ["catalog-modules", phaseId] });
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
      setEditingModule(data as unknown as Module);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderModules = useMutation({
    mutationFn: async (newModules: Module[]) => {
      for (let i = 0; i < newModules.length; i++) {
        await supabase
          .from("journey_modules")
          .update({ order_index: i + 1 })
          .eq("id", newModules[i].id);
      }
    },
    onMutate: async (newModules) => {
      await qc.cancelQueries({ queryKey: ["catalog-modules", phaseId] });
      const previousModules = qc.getQueryData(["catalog-modules", phaseId]);
      qc.setQueryData(["catalog-modules", phaseId], newModules);
      return { previousModules };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["catalog-modules", phaseId] }),
    onError: (e: Error, _, context: any) => {
      if (context?.previousModules) qc.setQueryData(["catalog-modules", phaseId], context.previousModules);
      toast.error(e.message);
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !modules.data) return;
    const items = Array.from(modules.data);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderModules.mutate(items);
  };

  if (modules.isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Módulos da Fase</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => createModule.mutate("quiz")}>
            <Plus className="h-4 w-4 mr-2" />
            + Quiz
          </Button>
          <Button variant="outline" size="sm" onClick={() => createModule.mutate("texto")}>
            <Plus className="h-4 w-4 mr-2" />
            + Texto
          </Button>
          <Button size="sm" onClick={() => createModule.mutate("video")}>
            <Plus className="h-4 w-4 mr-2" />
            + Vídeo
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="modules">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {(modules.data ?? []).map((m, index) => (
                <Draggable key={m.id} draggableId={m.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg group hover:border-primary/20 transition-all"
                    >
                      <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted/50 rounded flex items-center justify-center shrink-0">
                          {m.content_type === "quiz" ? (
                            <FileText className="h-5 w-5 text-primary" />
                          ) : m.content_type === "texto" ? (
                            <FileText className="h-5 w-5 text-primary" />
                          ) : (
                            <Video className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] h-4">
                              {m.content_type.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">#{m.order_index}</span>
                          </div>
                          <h4 className="text-sm font-bold truncate">{m.title}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingModule(m)}>Editar</Button>
                        <ModuleDeleteButton moduleId={m.id} phaseId={phaseId} />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(modules.data ?? []).length === 0 && (
                <p className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">
                  Nenhum módulo adicionado ainda.
                </p>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {editingModule && (
        <ModuleEditDialog 
          module={editingModule} 
          onClose={() => setEditingModule(null)} 
          phaseId={phaseId}
        />
      )}
    </div>
  );
}

function ModuleDeleteButton({ moduleId, phaseId }: { moduleId: string; phaseId: string }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("journey_modules").delete().eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo removido");
      qc.invalidateQueries({ queryKey: ["catalog-modules", phaseId] });
      qc.invalidateQueries({ queryKey: ["catalog-phases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-destructive" 
      onClick={() => confirm("Remover este módulo?") && remove.mutate()}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function ModuleEditDialog({ module, onClose, phaseId }: { module: Module; onClose: () => void; phaseId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Module>({ 
    ...module, 
    links: module.links ?? [],
    visibility_type: module.visibility_type ?? "all",
    assigned_users: module.assigned_users ?? [],
    thumbnail_url: module.thumbnail_url ?? null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify({ 
    ...module, 
    links: module.links ?? [],
    visibility_type: module.visibility_type ?? "all",
    assigned_users: module.assigned_users ?? [],
    thumbnail_url: module.thumbnail_url ?? null
  });

  const links = draft.links ?? [];

  const updateLinks = (next: ModuleLink[]) => setDraft((prev) => ({ ...prev, links: next }));

  const addLink = () => updateLinks([...links, { label: "", url: "" }]);

  const removeLink = (index: number) =>
    updateLinks(links.filter((_, i) => i !== index));

  const patchLink = (index: number, patch: Partial<ModuleLink>) =>
    updateLinks(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const moveLink = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    updateLinks(next);
  };

  const invalidLinks = links.some(
    (l) => !l.label.trim() || !l.url.trim() || !isValidUrl(l.url.trim()),
  );

  const save = useMutation({
    mutationFn: async () => {
      if (invalidLinks) {
        throw new Error("Verifique os links: título e URL válida (http/https) são obrigatórios.");
      }
      const { error } = await supabase
        .from("journey_modules")
        .update({
          title: draft.title,
          description: draft.description,
          content_body: draft.content_body,
          duration_minutes: draft.duration_minutes,
          links: links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
          visibility_type: draft.visibility_type,
          assigned_users: draft.assigned_users,
          supplementary_text: draft.supplementary_text,
          thumbnail_url: draft.thumbnail_url,
        } as never)
        .eq("id", module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo salvo");
      qc.invalidateQueries({ queryKey: ["catalog-modules", phaseId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo de 5GB.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Formato inválido. Selecione apenas arquivos de vídeo.");
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("journey-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("journey-videos")
        .getPublicUrl(filePath);

      setDraft(prev => ({ ...prev, content_body: publicUrl }));
      toast.success("Vídeo enviado com sucesso");
    } catch (error: any) {
      toast.error("Erro ao enviar vídeo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Formato inválido. Selecione apenas imagens.");
      return;
    }

    try {
      setUploadingThumb(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("journey-videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("journey-videos")
        .getPublicUrl(fileName);

      setDraft(prev => ({ ...prev, thumbnail_url: publicUrl }));
      toast.success("Thumbnail enviada");
    } catch (error: any) {
      toast.error("Erro ao enviar thumbnail: " + error.message);
    } finally {
      setUploadingThumb(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {draft.content_type === "video" ? "Vídeo" : draft.content_type === "quiz" ? "Quiz" : "Texto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Título</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>

            {module.content_type === "video" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Arquivo de Vídeo</Label>
                <div className="mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/60 rounded-lg hover:border-primary/40 transition-colors">
                  {draft.content_body ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Vídeo carregado
                      </div>
                      <video 
                        src={draft.content_body} 
                        className="max-h-32 rounded border bg-black mt-2"
                        controls
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Substituir vídeo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">Clique para fazer upload</p>
                        <p className="text-muted-foreground text-xs mt-1">Formatos suportados: MP4, MOV, WebM</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Selecionar arquivo
                      </Button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="video/*"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            ) : draft.content_type === "texto" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Conteúdo do Texto</Label>
                <RichTextEditor 
                  value={draft.content_body ?? ""} 
                  onChange={(val) => setDraft({ ...draft, content_body: val })} 
                />
              </div>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Quiz Selecionado</Label>
                  <div className="p-4 border rounded-md bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-4">
                      Para editar as perguntas deste quiz, vá para a aba "Quizzes" no menu lateral.
                    </p>
                    {/* We could add a dropdown here if we loaded quizzesQuery, but for now just show the UUID or ID */}
                    <Input disabled value={draft.content_body || "Sem quiz"} />
                  </div>
                </div>
              )}
            
            {module.content_type === "video" && (
              <div className="space-y-1.5 sm:col-span-2 mt-4">
                <Label>Capa Personalizada (Thumbnail)</Label>
                <div className="mt-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-border/60 rounded-lg hover:border-primary/40 transition-colors">
                  {draft.thumbnail_url ? (
                     <div className="flex flex-col items-center gap-2">
                       <img src={draft.thumbnail_url} alt="Capa" className="h-32 object-cover rounded border" />
                       <Button variant="ghost" size="sm" onClick={() => thumbInputRef.current?.click()}>
                         Trocar capa
                       </Button>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center gap-2 text-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {uploadingThumb ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                        </div>
                        <Button 
                          type="button"
                          variant="secondary" 
                          size="sm" 
                          disabled={uploadingThumb}
                          onClick={() => thumbInputRef.current?.click()}
                        >
                          Fazer upload da capa
                        </Button>
                     </div>
                  )}
                  <input 
                    type="file" 
                    ref={thumbInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleThumbUpload}
                  />
                </div>
              </div>
            )}
            
            {module.content_type === "video" && (
              <div className="space-y-1.5 sm:col-span-2 mt-4">
                <Label>Texto Suplementar (Instruções, Logins, etc)</Label>
                <RichTextEditor 
                  value={draft.supplementary_text ?? ""} 
                  onChange={(val) => setDraft({ ...draft, supplementary_text: val })} 
                />
              </div>
            )}
          </div>
          
          <div className="space-y-4 rounded-lg border border-border/60 p-4 mt-4">
             <div className="flex items-center gap-2 mb-2">
                <Label className="text-sm font-semibold">Configurações de Acesso / Visibilidade</Label>
             </div>
             <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-1.5">
                  <Label>Quem pode ver este módulo?</Label>
                  <Select 
                    value={draft.visibility_type} 
                    onValueChange={(v: any) => setDraft({ ...draft, visibility_type: v, assigned_users: v === "selected" ? draft.assigned_users : [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Jovens</SelectItem>
                      <SelectItem value="selected">Jovens Selecionados</SelectItem>
                      <SelectItem value="admin_only">Apenas Administradores</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               
               {draft.visibility_type === "selected" && (
                  <div className="space-y-1.5">
                    <Label>Adicionar Jovem</Label>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <YoungSearchSelect 
                             value={null}
                             onChange={(id) => {
                               if (id && !draft.assigned_users?.includes(id)) {
                                 setDraft({ ...draft, assigned_users: [...(draft.assigned_users || []), id] });
                               }
                             }}
                          />
                       </div>
                    </div>
                  </div>
               )}
             </div>
             
             {draft.visibility_type === "selected" && (draft.assigned_users?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/60 rounded-md">
                   {draft.assigned_users?.map((id) => (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1 px-2 text-xs">
                         ID: {id.slice(0, 6)}...
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-4 w-4 p-0 ml-1 rounded-full text-muted-foreground hover:text-destructive"
                           onClick={() => setDraft({
                             ...draft, 
                             assigned_users: draft.assigned_users?.filter(uid => uid !== id)
                           })}
                         >
                           <X className="h-3 w-3" />
                         </Button>
                      </Badge>
                   ))}
                </div>
             )}
          </div>

          {/* Links associados */}
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Links associados</Label>
                <Badge variant="outline" className="text-[10px]">{links.length}</Badge>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar link
              </Button>
            </div>

            {links.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border/60 rounded-md">
                Nenhum link adicionado. Clique em "Adicionar link" para incluir materiais de apoio.
              </p>
            ) : (
              <div className="space-y-3">
                {links.map((link, index) => {
                  const urlInvalid = !!link.url.trim() && !isValidUrl(link.url.trim());
                  return (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto] items-start rounded-md bg-muted/20 border border-border/60 p-3"
                    >
                      <div className="space-y-1">
                        <Input
                          value={link.label}
                          onChange={(e) => patchLink(index, { label: e.target.value })}
                          placeholder="Título (ex: YouTube)"
                        />
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="url"
                          value={link.url}
                          onChange={(e) => patchLink(index, { url: e.target.value })}
                          placeholder="https://exemplo.com"
                          className={urlInvalid ? "border-destructive" : ""}
                        />
                        {urlInvalid && (
                          <p className="text-[11px] text-destructive">URL inválida (use http:// ou https://).</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveLink(index, -1)}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={index === links.length - 1}
                          onClick={() => moveLink(index, 1)}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeLink(index)}
                          aria-label="Remover link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending || uploading || invalidLinks}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        .select("*")
        .order("order_index");
      if (error) throw error;
      return (data || []) as unknown as Phase[];
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
    <Card className="border-border/60">
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
                <div className="divide-y rounded-md border border-border/60">
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
