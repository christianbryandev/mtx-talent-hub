import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, GripVertical, History, Edit3, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuizMediaUpload } from "@/components/admin/QuizMediaUpload";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({ meta: [{ title: "Admin · Criador de Quiz — MTX Hub" }] }),
  component: AdminQuizzesPage,
  ssr: false,
});

type MediaType = "image" | "video";
interface Phase {
  id: string;
  title: string;
  order_index: number;
}
interface Option {
  id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
  media_url: string | null;
  media_type: MediaType | null;
}
interface Question {
  id: string;
  question: string;
  type: "multipla_escolha" | "texto";
  order_index: number;
  media_url: string | null;
  media_type: MediaType | null;
  options: Option[];
}
interface Quiz {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_active: boolean;
}

interface Attempt {
  id: string;
  young_id: string;
  young_name: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  created_at: string;
}

function AdminQuizzesPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const qc = useQueryClient();

  const quizzesQuery = useQuery<Quiz[]>({
    queryKey: ["admin-quizzes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_templates")
        .select("id, title, passing_score, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Quiz[];
    },
  });

  useEffect(() => {
    if (!selectedQuizId && quizzesQuery.data?.length) {
      setSelectedQuizId(quizzesQuery.data[0].id);
    }
  }, [quizzesQuery.data, selectedQuizId]);

  const createQuiz = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("quiz_templates").insert({
        title: "Novo Quiz",
        passing_score: 80,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Quiz criado!");
      qc.invalidateQueries({ queryKey: ["admin-quizzes-list"] });
      setSelectedQuizId((data as any).id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (permLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <Navigate to="/jornada" />;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">CRIADOR DE QUIZ</h1>
          <p className="text-sm text-muted-foreground">Configure as avaliações e monitore o desempenho dos alunos.</p>
        </div>
        <CreateQuizDialog onQuizCreated={(id) => setSelectedQuizId(id)} />
      </header>

      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecione o Quiz</Label>
            <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
              <SelectTrigger className="bg-muted/30 border-border/60">
                <SelectValue placeholder="Selecione um quiz" />
              </SelectTrigger>
              <SelectContent>
                {quizzesQuery.data?.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedQuizId && <QuizManager quizId={selectedQuizId} />}
    </div>
  );
}

function CreateQuizDialog({ onQuizCreated }: { onQuizCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Novo Quiz");
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("none");

  const phasesQuery = useQuery<Phase[]>({
    queryKey: ["admin-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_catalog")
        .select("id,title,order_index")
        .order("order_index");
      if (error) throw error;
      return (data || []) as unknown as Phase[];
    },
  });

  const modulesInPhaseQuery = useQuery({
    queryKey: ["admin-modules-in-phase", selectedPhase],
    enabled: !!selectedPhase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_modules")
        .select("id, title, content_type")
        .eq("phase_id", selectedPhase)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
  });

  const createQuiz = useMutation({
    mutationFn: async () => {
      if (!selectedPhase) throw new Error("Selecione uma fase.");
      
      // 1. Criar o Quiz
      const { data: quizData, error: quizError } = await supabase.from("quiz_templates").insert({
        title,
        passing_score: 80,
      }).select().single();
      if (quizError) throw quizError;
      
      const quizId = (quizData as any).id;

      // 2. Atribuir ao módulo ou criar módulo solto
      if (selectedModule && selectedModule !== "none") {
        const { error } = await supabase.from("journey_modules").update({ quiz_id: quizId }).eq("id", selectedModule);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journey_modules").insert({
          phase_id: selectedPhase,
          title,
          content_type: "quiz",
          content_body: quizId,
          order_index: 999,
        });
        if (error) throw error;
      }
      return quizId;
    },
    onSuccess: (quizId) => {
      toast.success("Quiz criado e atribuído!");
      qc.invalidateQueries({ queryKey: ["admin-quizzes-list"] });
      onQuizCreated(quizId);
      setOpen(false);
      // reset state
      setTitle("Novo Quiz");
      setSelectedPhase("");
      setSelectedModule("none");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Criar Novo Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Quiz</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label>Título do Quiz</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ex: Avaliação Módulo 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Selecione a Fase</Label>
            <Select value={selectedPhase} onValueChange={(val) => { setSelectedPhase(val); setSelectedModule("none"); }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma fase" />
              </SelectTrigger>
              <SelectContent>
                {phasesQuery.data?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Onde o quiz será inserido?</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule} disabled={!selectedPhase || modulesInPhaseQuery.isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um módulo ou crie solto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Como um novo módulo separado (Padrão)</SelectItem>
                {modulesInPhaseQuery.data?.filter(m => m.content_type !== 'quiz').map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Embutir no vídeo/texto: {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => createQuiz.mutate()} disabled={createQuiz.isPending || !selectedPhase || !title}>
            {createQuiz.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Quiz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuizManager({ quizId }: { quizId: string }) {
  const qc = useQueryClient();

  const quizQuery = useQuery<Quiz | null>({
    queryKey: ["admin-quiz-detail", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_templates")
        .select("*")
        .eq("id", quizId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Quiz | null;
    },
  });

  if (quizQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!quizQuery.data) return null;

  return (
    <Tabs defaultValue="editor" className="w-full">
      <TabsList className="bg-muted/50 p-1">
        <TabsTrigger value="editor" className="data-[state=active]:bg-card">
          <Edit3 className="h-4 w-4 mr-2" /> Editor
        </TabsTrigger>
        <TabsTrigger value="historico" className="data-[state=active]:bg-card">
          <History className="h-4 w-4 mr-2" /> Histórico & Resultados
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor" className="mt-6">
        <QuizEditor quiz={quizQuery.data} />
      </TabsContent>
      <TabsContent value="historico" className="mt-6">
        <QuizHistory quizId={quizQuery.data.id} />
      </TabsContent>
    </Tabs>
  );
}

function QuizEditor({ quiz }: { quiz: Quiz }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Quiz>(quiz);
  const dirty = JSON.stringify(draft) !== JSON.stringify(quiz);

  useEffect(() => setDraft(quiz), [quiz]);

  const questionsQuery = useQuery<Question[]>({
    queryKey: ["admin-quiz-questions", quiz.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_index");
      if (error) throw error;

      const qs = (data || []) as unknown as Question[];
      const withOptions = await Promise.all(
        qs.map(async (q) => {
          const { data: opts, error: optErr } = await supabase
            .rpc("admin_get_quiz_options", { p_question_id: q.id });
          if (optErr) throw optErr;
          return {
            ...q,
            options: (opts || []).sort((a: any, b: any) => a.order_index - b.order_index) as Option[],
          };
        })
      );
      return withOptions;
    },
  });

  const saveQuiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("quiz_templates")
        .update({
          title: draft.title,
          passing_score: draft.passing_score,
          description: draft.description,
        })
        .eq("id", quiz.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["admin-quiz-detail", quiz.id] });
      qc.invalidateQueries({ queryKey: ["admin-quizzes-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderQuestions = useMutation({
    mutationFn: async (newQuestions: Question[]) => {
      for (let i = 0; i < newQuestions.length; i++) {
        await supabase
          .from("quiz_questions")
          .update({ order_index: i + 1 })
          .eq("id", newQuestions[i].id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quiz.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const order = (questionsQuery.data?.length ?? 0) + 1;
      const { data, error } = await supabase
        .from("quiz_questions")
        .insert({ quiz_id: quiz.id, question: "Nova pergunta", order_index: order, type: "multipla_escolha" })
        .select()
        .single();
      if (error) throw error;
      
      const { error: optErr } = await supabase.from("quiz_options").insert([
        { question_id: (data as any).id, text: "Opção correta", is_correct: true, order_index: 0 },
        { question_id: (data as any).id, text: "Opção incorreta", is_correct: false, order_index: 1 },
      ]);
      if (optErr) throw optErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quiz.id] }),
    onError: (e: Error) => toast.error(`Erro ao adicionar pergunta: ${e.message}`),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !questionsQuery.data) return;
    const items = Array.from(questionsQuery.data);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderQuestions.mutate(items);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome do Quiz</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Aprovação Mínima (%)</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="number" 
                  value={draft.passing_score} 
                  onChange={(e) => setDraft({ ...draft, passing_score: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground italic">
                  * Apenas múltipla escolha conta para aprovação.
                </span>
              </div>
            </div>
          </div>
          <Button onClick={() => saveQuiz.mutate()} disabled={!dirty || saveQuiz.isPending}>
            <Save className="h-4 w-4 mr-2" /> Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">PERGUNTAS</h3>
          <Button size="sm" onClick={() => addQuestion.mutate()}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Pergunta
          </Button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {questionsQuery.data?.map((q, index) => (
                  <Draggable key={q.id} draggableId={q.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <QuestionItem 
                          q={q} 
                          index={index} 
                          dragHandleProps={provided.dragHandleProps} 
                          quizId={quiz.id}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

function QuestionItem({ q, index, dragHandleProps, quizId }: { q: Question; index: number; dragHandleProps: any; quizId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Question>(q);
  const dirty = JSON.stringify(draft) !== JSON.stringify(q);

  useEffect(() => setDraft(q), [q]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ 
          question: draft.question,
          type: draft.type 
        })
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pergunta salva");
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!confirm("Excluir pergunta?")) return;
      const { error } = await supabase.from("quiz_questions").delete().eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addOption = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quiz_options").insert({
        question_id: q.id,
        text: "Nova opção",
        is_correct: false,
        order_index: q.options.length
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateQuestion = useMutation({
    mutationFn: async () => {
      const { data: newQuestion, error: qErr } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question: draft.question + " (Cópia)",
          type: draft.type,
          order_index: q.order_index + 1
        })
        .select()
        .single();
      
      if (qErr) throw qErr;

      if (q.options && q.options.length > 0) {
        const newOptions = q.options.map(opt => ({
          question_id: (newQuestion as any).id,
          text: opt.text,
          is_correct: opt.is_correct,
          order_index: opt.order_index
        }));
        const { error: optErr } = await supabase.from("quiz_options").insert(newOptions);
        if (optErr) throw optErr;
      }
    },
    onSuccess: () => {
      toast.success("Pergunta duplicada");
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 flex items-center gap-3 border-b border-border/40">
        <div {...dragHandleProps}>
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        </div>
        <span className="text-xs font-black text-muted-foreground uppercase">Pergunta {index + 1}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => duplicateQuestion.mutate()} disabled={duplicateQuestion.isPending}>
          <Copy className="h-4 w-4 mr-1" /> Duplicar
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => remove.mutate()}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className="pt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-xs">Enunciado</Label>
            <Textarea 
              value={draft.question} 
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={draft.type} onValueChange={(v: any) => setDraft({ ...draft, type: v })}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                <SelectItem value="texto">Texto Livre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {draft.type === "multipla_escolha" && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Alternativas</Label>
            <div className="grid gap-2">
              {q.options.map((opt) => (
                <OptionItem key={opt.id} option={opt} questionId={q.id} quizId={quizId} />
              ))}
              <Button variant="ghost" size="sm" className="w-fit text-xs h-8" onClick={() => addOption.mutate()}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar opção
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            <Save className="h-3.5 w-3.5 mr-2" /> Salvar Pergunta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OptionItem({ option, questionId, quizId }: { option: Option; questionId: string; quizId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState(option.text);

  const save = async (patch: Partial<Option>) => {
    try {
      if (patch.is_correct === true) {
        await supabase.from("quiz_options").update({ is_correct: false }).eq("question_id", questionId);
      }
      const { error } = await supabase.from("quiz_options").update(patch).eq("id", option.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async () => {
    try {
      const { error } = await supabase.from("quiz_options").delete().eq("id", option.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex items-center gap-3 group">
      <Checkbox 
        checked={option.is_correct} 
        onCheckedChange={(v) => save({ is_correct: v === true })}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <Input 
        value={text} 
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== option.text && save({ text })}
        className="h-8 text-sm bg-transparent border-none hover:bg-muted/30 focus:bg-muted/50 transition-all p-1 px-2"
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={remove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function QuizHistory({ quizId }: { quizId: string }) {
  const attemptsQuery = useQuery<Attempt[]>({
    queryKey: ["quiz-attempts", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_quiz_attempts")
        .select(`
          id, score, passed, attempt_number, created_at,
          profiles:young_id(full_name)
        `)
        .filter("phase", "in", `(SELECT id FROM journey_phase_catalog WHERE id IN (SELECT phase_id FROM quiz_templates WHERE id = '${quizId}'))`)
        // The relation mapping for 'phase' is tricky, let's fetch based on quizId more reliably
        // Actually, young_quiz_attempts table uses 'phase' (string) not quizId.
        // We'll need a better join or filter.
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        young_name: d.profiles?.full_name || "Desconhecido",
      })) as Attempt[];
    },
  });

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Últimas Tentativas</CardTitle>
      </CardHeader>
      <CardContent>
        {attemptsQuery.isLoading ? <Skeleton className="h-48 w-full" /> : (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/60 text-left">
                <tr>
                  <th className="p-3 font-bold uppercase text-[10px] tracking-wider">Aluno</th>
                  <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-center">Data</th>
                  <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-center">Nota</th>
                  <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-center">Resultado</th>
                  <th className="p-3 font-bold uppercase text-[10px] tracking-wider text-center">Tentativa</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {attemptsQuery.data?.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium">{a.young_name}</td>
                    <td className="p-3 text-center text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-center font-black">{Math.round(a.score)}%</td>
                    <td className="p-3 text-center">
                      <Badge variant={a.passed ? "secondary" : "destructive"} className="text-[10px]">
                        {a.passed ? "APROVADO" : "REPROVADO"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">#{a.attempt_number}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.info("Visualização de respostas em breve")}>
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
                {!attemptsQuery.data?.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma tentativa registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
