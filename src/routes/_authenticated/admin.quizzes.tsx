import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QuizMediaUpload } from "@/components/admin/QuizMediaUpload";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({ meta: [{ title: "Admin · Quizzes — MTX Hub" }] }),
  component: AdminQuizzesPage,
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
  version: number;
}

function AdminQuizzesPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const qc = useQueryClient();
  const [selectedPhase, setSelectedPhase] = useState<string>("");

  const phases = useQuery<Phase[]>({
    queryKey: ["admin-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_phase_catalog")
        .select("id,title,order_index")
        .order("order_index");
      if (error) throw error;
      return data as Phase[];
    },
  });

  useEffect(() => {
    if (!selectedPhase && phases.data?.length) setSelectedPhase(phases.data[0].id);
  }, [phases.data, selectedPhase]);

  const quiz = useQuery<Quiz | null>({
    queryKey: ["admin-quiz", selectedPhase],
    enabled: !!selectedPhase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_templates")
        .select("*")
        .eq("phase_id", selectedPhase)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Quiz | null;
    },
  });

  const questions = useQuery<Question[]>({
    queryKey: ["admin-quiz-questions", quiz.data?.id],
    enabled: !!quiz.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("id,question,order_index,media_url,media_type, options:quiz_options(id,text,is_correct,order_index,media_url,media_type)")
        .eq("quiz_id", quiz.data!.id)
        .order("order_index");
      if (error) throw error;
      return (data as Question[]).map((q) => ({
        ...q,
        options: [...q.options].sort((a, b) => a.order_index - b.order_index),
      }));
    },
  });

  if (permLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <Navigate to="/jornada" />;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-quiz", selectedPhase] });
    qc.invalidateQueries({ queryKey: ["admin-quiz-questions"] });
  };

  async function createQuiz() {
    if (!selectedPhase) return;
    const { error } = await supabase.from("quiz_templates").insert({
      phase_id: selectedPhase,
      title: "Novo quiz",
      passing_score: 80,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Quiz criado");
    invalidateAll();
  }

  async function saveQuiz(patch: Partial<Quiz>) {
    if (!quiz.data) return;
    const { error } = await supabase
      .from("quiz_templates")
      .update(patch)
      .eq("id", quiz.data.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    invalidateAll();
  }

  async function addQuestion() {
    if (!quiz.data) return;
    const order = (questions.data?.length ?? 0) + 1;
    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({ quiz_id: quiz.data.id, question: "Nova pergunta", order_index: order })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    // 4 default options
    await supabase.from("quiz_options").insert(
      [0, 1, 2, 3].map((i) => ({
        question_id: (data as { id: string }).id,
        text: `Opção ${i + 1}`,
        is_correct: i === 0,
        order_index: i,
      })),
    );
    invalidateAll();
  }

  async function deleteQuestion(id: string) {
    if (!confirm("Excluir pergunta?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  }

  async function saveQuestion(id: string, patch: Partial<Omit<Question, "options">>) {
    const { error } = await supabase
      .from("quiz_questions")
      .update(patch)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  }

  async function saveOption(id: string, patch: Partial<Option>, questionId?: string) {
    // If marking correct, unset siblings first (single-correct radio behavior)
    if (patch.is_correct === true && questionId) {
      await supabase
        .from("quiz_options")
        .update({ is_correct: false })
        .eq("question_id", questionId);
    }
    const { error } = await supabase.from("quiz_options").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  }

  async function addOption(questionId: string, currentCount: number) {
    const { error } = await supabase.from("quiz_options").insert({
      question_id: questionId,
      text: "Nova opção",
      is_correct: false,
      order_index: currentCount,
    });
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  }

  async function deleteOption(id: string) {
    const { error } = await supabase.from("quiz_options").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateAll();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Quizzes (admin)</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quizzes por fase. Apenas um quiz ativo por fase.
        </p>
      </header>

      <Card className="p-4 space-y-3">
        <Label>Fase</Label>
        <Select value={selectedPhase} onValueChange={setSelectedPhase}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma fase" />
          </SelectTrigger>
          <SelectContent>
            {phases.data?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.order_index}. {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {quiz.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !quiz.data ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta fase ainda não tem quiz ativo.
          </p>
          <Button onClick={createQuiz}>
            <Plus className="mr-2 h-4 w-4" /> Criar quiz
          </Button>
        </Card>
      ) : (
        <QuizEditor
          quiz={quiz.data}
          questions={questions.data ?? []}
          loadingQ={questions.isLoading}
          onSaveQuiz={saveQuiz}
          onAddQuestion={addQuestion}
          onDeleteQuestion={deleteQuestion}
          onSaveQuestion={saveQuestion}
          onSaveOption={saveOption}
          onAddOption={addOption}
          onDeleteOption={deleteOption}
        />
      )}
    </div>
  );
}

function QuizEditor({
  quiz,
  questions,
  loadingQ,
  onSaveQuiz,
  onAddQuestion,
  onDeleteQuestion,
  onSaveQuestion,
  onSaveOption,
  onAddOption,
  onDeleteOption,
}: {
  quiz: Quiz;
  questions: Question[];
  loadingQ: boolean;
  onSaveQuiz: (p: Partial<Quiz>) => Promise<unknown>;
  onAddQuestion: () => Promise<unknown>;
  onDeleteQuestion: (id: string) => Promise<unknown>;
  onSaveQuestion: (id: string, patch: Partial<Omit<Question, "options">>) => Promise<unknown>;
  onSaveOption: (id: string, p: Partial<Option>, questionId?: string) => Promise<unknown>;
  onAddOption: (qid: string, count: number) => Promise<unknown>;
  onDeleteOption: (id: string) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [desc, setDesc] = useState(quiz.description ?? "");
  const [passing, setPassing] = useState(quiz.passing_score);
  const [active, setActive] = useState(quiz.is_active);

  useEffect(() => {
    setTitle(quiz.title);
    setDesc(quiz.description ?? "");
    setPassing(quiz.passing_score);
    setActive(quiz.is_active);
  }, [quiz]);

  return (
    <Card className="p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Nota mínima (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={passing}
            onChange={(e) => setPassing(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={active}
          onCheckedChange={(v) => setActive(v === true)}
          id="active"
        />
        <Label htmlFor="active" className="font-normal">Quiz ativo</Label>
      </div>
      <Button
        size="sm"
        onClick={() =>
          onSaveQuiz({
            title,
            description: desc || null,
            passing_score: passing,
            is_active: active,
          })
        }
      >
        <Save className="mr-2 h-4 w-4" /> Salvar quiz
      </Button>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Perguntas</h2>
          <Button size="sm" variant="outline" onClick={onAddQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Pergunta
          </Button>
        </div>
        {loadingQ ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda.</p>
        ) : (
          questions.map((q, idx) => (
            <QuestionEditor
              key={q.id}
              index={idx}
              q={q}
              onDelete={() => onDeleteQuestion(q.id)}
              onSave={(text) => onSaveQuestion(q.id, text)}
              onSaveOption={(oid, p) => onSaveOption(oid, p, q.id)}
              onAddOption={() => onAddOption(q.id, q.options.length)}
              onDeleteOption={onDeleteOption}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function QuestionEditor({
  index,
  q,
  onDelete,
  onSave,
  onSaveOption,
  onAddOption,
  onDeleteOption,
}: {
  index: number;
  q: Question;
  onDelete: () => void;
  onSave: (text: string) => Promise<unknown>;
  onSaveOption: (oid: string, p: Partial<Option>) => Promise<unknown>;
  onAddOption: () => Promise<unknown>;
  onDeleteOption: (oid: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(q.question);
  useEffect(() => setText(q.question), [q.question]);

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <span className="text-sm font-semibold pt-2">{index + 1}.</span>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="outline" onClick={() => onSave(text)}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="space-y-1 pl-6">
        {q.options.map((o) => (
          <OptionEditor
            key={o.id}
            o={o}
            onSave={(p) => onSaveOption(o.id, p)}
            onDelete={() => onDeleteOption(o.id)}
          />
        ))}
        <Button size="sm" variant="ghost" onClick={onAddOption}>
          <Plus className="mr-1 h-3 w-3" /> Opção
        </Button>
      </div>
    </div>
  );
}

function OptionEditor({
  o,
  onSave,
  onDelete,
}: {
  o: Option;
  onSave: (p: Partial<Option>) => Promise<unknown>;
  onDelete: () => void;
}) {
  const [text, setText] = useState(o.text);
  useEffect(() => setText(o.text), [o.text]);
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={o.is_correct}
        onCheckedChange={(v) => onSave({ is_correct: v === true })}
      />
      <Input value={text} onChange={(e) => setText(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => onSave({ text })}>
        <Save className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="outline" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
