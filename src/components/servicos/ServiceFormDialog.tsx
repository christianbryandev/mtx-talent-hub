import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BILLING_MODELS, SERVICE_TYPES, RESPONSIBLE_AREAS, SERVICE_FREQUENCIES,
  type Service, type ServiceTaskTemplate, type ServiceOnboardingItem,
} from "@/types/tasks";
import { ProfileSearchSelect } from "@/components/shared/RelationalSelects";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(150),
  category: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  scope: z.string().max(3000).optional().or(z.literal("")),
  deliverables: z.string().max(3000).optional().or(z.literal("")),
  average_deadline: z.string().optional().or(z.literal("")),
  billing_model: z.string().optional().or(z.literal("")),
  default_value: z.string().optional().or(z.literal("")),
  status: z.string(),
  service_type: z.string().optional().or(z.literal("")),
  responsible_area: z.string().optional().or(z.literal("")),
  executor_profile: z.string().optional().or(z.literal("")),
  frequency: z.string().optional().or(z.literal("")),
  pct_mtx: z.string().optional().or(z.literal("")),
  pct_commercial: z.string().optional().or(z.literal("")),
  pct_executor: z.string().optional().or(z.literal("")),
  default_executor_id: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service?: Service | null;
}

type TplDraft = Omit<ServiceTaskTemplate, "id" | "service_id" | "position"> & {
  id?: string;
  position: number;
};
type ChkDraft = { id?: string; item: string; position: number };

export function ServiceFormDialog({ open, onOpenChange, service }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<TplDraft[]>([]);
  const [checklist, setChecklist] = useState<ChkDraft[]>([]);
  const [executorYoungs, setExecutorYoungs] = useState<Array<{ id?: string; young_id: string; name: string }>>([]);

  // Load linked young executors
  useQuery({
    queryKey: ["service-youngs-form", service?.id, open],
    enabled: !!service?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("service_young_people")
        .select("id, young_id, young_people!inner(full_name)")
        .eq("service_id", service!.id);
      setExecutorYoungs((data ?? []).map((r: any) => ({
        id: r.id,
        young_id: r.young_id,
        name: r.young_people?.full_name ?? "",
      })));
      return true;
    },
  });

  const defaults = useMemo<FormValues>(() => ({
    name: service?.name ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    scope: service?.scope ?? "",
    deliverables: service?.deliverables ?? "",
    average_deadline: service?.average_deadline?.toString() ?? "",
    billing_model: service?.billing_model ?? "",
    default_value: service?.default_value?.toString() ?? "",
    status: service?.status ?? "ativo",
    service_type: service?.service_type ?? "",
    responsible_area: service?.responsible_area ?? "",
    executor_profile: service?.executor_profile ?? "",
    frequency: service?.frequency ?? "",
    pct_mtx: service?.pct_mtx?.toString() ?? "",
    pct_commercial: service?.pct_commercial?.toString() ?? "",
    pct_executor: service?.pct_executor?.toString() ?? "",
    default_executor_id: service?.default_executor_id ?? "",
  }), [service]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults, values: defaults });

  // Load templates and checklist when editing
  useQuery({
    queryKey: ["service-templates", service?.id, open],
    enabled: !!service?.id && open,
    queryFn: async () => {
      const [{ data: tpl }, { data: chk }] = await Promise.all([
        supabase.from("service_task_templates" as never).select("*").eq("service_id", service!.id).order("position"),
        supabase.from("service_onboarding_checklist" as never).select("*").eq("service_id", service!.id).order("position"),
      ]);
      setTemplates(((tpl ?? []) as ServiceTaskTemplate[]).map((t) => ({
        id: t.id, name: t.name, task_type: t.task_type, responsible_area: t.responsible_area,
        default_deadline_days: t.default_deadline_days, position: t.position,
      })));
      setChecklist(((chk ?? []) as ServiceOnboardingItem[]).map((c) => ({
        id: c.id, item: c.item, position: c.position,
      })));
      return true;
    },
  });

  useEffect(() => {
    if (!open && !service) {
      setTemplates([]);
      setChecklist([]);
    }
  }, [open, service]);

  const pctMtx = Number(form.watch("pct_mtx") || 0);
  const pctCom = Number(form.watch("pct_commercial") || 0);
  const pctExe = Number(form.watch("pct_executor") || 0);
  const pctTotal = pctMtx + pctCom + pctExe;
  const baseVal = Number(form.watch("default_value") || 0);

  const mutation = useMutation({
    mutationFn: async (v: FormValues) => {
      setSubmitting(true);
      const payload = {
        name: v.name,
        category: v.category || null,
        description: v.description || null,
        scope: v.scope || null,
        deliverables: v.deliverables || null,
        average_deadline: v.average_deadline ? Number(v.average_deadline) : null,
        billing_model: v.billing_model || null,
        default_value: v.default_value ? Number(v.default_value) : null,
        status: v.status,
        is_active: v.status === "ativo",
        service_type: v.service_type || null,
        responsible_area: v.responsible_area || null,
        executor_profile: v.executor_profile || null,
        frequency: v.frequency || null,
        pct_mtx: v.pct_mtx ? Number(v.pct_mtx) : null,
        pct_commercial: v.pct_commercial ? Number(v.pct_commercial) : null,
        pct_executor: v.pct_executor ? Number(v.pct_executor) : null,
        default_executor_id: v.default_executor_id || null,
      };
      let svcId: string;
      if (service) {
        const { error } = await supabase.from("services").update(payload as never).eq("id", service.id);
        if (error) throw error;
        svcId = service.id;
      } else {
        const { data, error } = await supabase.from("services").insert(payload as never).select("id").single();
        if (error) throw error;
        svcId = (data as { id: string }).id;
      }

      // Replace templates and checklist
      await supabase.from("service_task_templates" as never).delete().eq("service_id", svcId);
      if (templates.length) {
        await supabase.from("service_task_templates" as never).insert(
          templates.map((t, i) => ({
            service_id: svcId,
            name: t.name,
            task_type: t.task_type || null,
            responsible_area: t.responsible_area || null,
            default_deadline_days: t.default_deadline_days ?? null,
            position: i,
          })) as never,
        );
      }
      await supabase.from("service_onboarding_checklist" as never).delete().eq("service_id", svcId);
      if (checklist.length) {
        await supabase.from("service_onboarding_checklist" as never).insert(
          checklist.map((c, i) => ({ service_id: svcId, item: c.item, position: i })) as never,
        );
      }

      // Sync executor youngs (service_young_people)
      await supabase.from("service_young_people").delete().eq("service_id", svcId);
      if (executorYoungs.length > 0) {
        await supabase.from("service_young_people").insert(
          executorYoungs.map((e) => ({ service_id: svcId, young_id: e.young_id })) as never,
        );
      }
      // Set default_executor_id to first one for compatibility
      if (executorYoungs.length > 0) {
        await supabase.from("services").update({ default_executor_id: executorYoungs[0].young_id } as never).eq("id", svcId);
      }

      return svcId;
    },
    onSuccess: () => {
      toast.success(service ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["service", service?.id] });
      qc.invalidateQueries({ queryKey: ["service-templates", service?.id] });
      qc.invalidateQueries({ queryKey: ["service-youngs", service?.id] });
      qc.invalidateQueries({ queryKey: ["service-youngs-form", service?.id] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSubmitting(false),
  });

  const addTpl = () => setTemplates((t) => [...t, { name: "", task_type: null, responsible_area: null, default_deadline_days: 7, position: t.length }]);
  const updTpl = (i: number, patch: Partial<TplDraft>) => setTemplates((t) => t.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmTpl = (i: number) => setTemplates((t) => t.filter((_, j) => j !== i));

  const addChk = () => setChecklist((c) => [...c, { item: "", position: c.length }]);
  const updChk = (i: number, item: string) => setChecklist((c) => c.map((x, j) => j === i ? { ...x, item } : x));
  const rmChk = (i: number) => setChecklist((c) => c.filter((_, j) => j !== i));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{service ? "Editar serviço" : "Novo serviço"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6 mt-4">
          {/* Bloco 1 — Identificação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label>Categoria</Label>
                <Input {...form.register("category")} placeholder="Marketing, Design..." />
              </div>
              <div>
                <Label>Tipo de serviço</Label>
                <Select value={form.watch("service_type") || "_none"} onValueChange={(v) => form.setValue("service_type", v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhum —</SelectItem>
                    {SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} {...form.register("description")} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Bloco 2 — Operação */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Operação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Área responsável</Label>
                <Select value={form.watch("responsible_area") || "_none"} onValueChange={(v) => form.setValue("responsible_area", v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhum —</SelectItem>
                    {RESPONSIBLE_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil do executor</Label>
                <Input {...form.register("executor_profile")} placeholder="Ex: Social media pleno" />
              </div>
              <div>
                <Label>Frequência</Label>
                <Select value={form.watch("frequency") || "_none"} onValueChange={(v) => form.setValue("frequency", v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhuma —</SelectItem>
                    {SERVICE_FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo médio (dias)</Label>
                <Input type="number" {...form.register("average_deadline")} />
              </div>
              <div className="md:col-span-2">
                <Label>Responsável(is) executor(es) padrão</Label>
                <div className="space-y-1 mt-1">
                  {executorYoungs.map((ey, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Badge variant="secondary" className="flex-1 justify-start py-1 text-xs">
                        {ey.name || "Selecione..."}
                      </Badge>
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setExecutorYoungs((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <YoungSearchSelect
                    value={null}
                    onChange={(id) => {
                      if (id && !executorYoungs.some((e) => e.young_id === id)) {
                        setExecutorYoungs((prev) => [...prev, { young_id: id, name: "" }]);
                      }
                    }}
                    placeholder="Adicionar executor..."
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Bloco 3 — Financeiro */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Financeiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Modelo de cobrança</Label>
                <Select value={form.watch("billing_model") || "_none"} onValueChange={(v) => form.setValue("billing_model", v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhum —</SelectItem>
                    {BILLING_MODELS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor padrão (R$)</Label>
                <Input type="number" step="0.01" {...form.register("default_value")} />
              </div>
              <div>
                <Label>% MTX</Label>
                <Input type="number" step="0.01" {...form.register("pct_mtx")} />
              </div>
              <div>
                <Label>% Comercial</Label>
                <Input type="number" step="0.01" {...form.register("pct_commercial")} />
              </div>
              <div>
                <Label>% Executor</Label>
                <Input type="number" step="0.01" {...form.register("pct_executor")} />
              </div>
              <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-0.5">
                <p>Soma: <strong className={pctTotal > 100 ? "text-destructive" : ""}>{pctTotal}%</strong></p>
                {baseVal > 0 && (
                  <>
                    <p>MTX: R$ {((baseVal * pctMtx) / 100).toFixed(2)}</p>
                    <p>Comercial: R$ {((baseVal * pctCom) / 100).toFixed(2)}</p>
                    <p>Executor: R$ {((baseVal * pctExe) / 100).toFixed(2)}</p>
                  </>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Bloco 4 — Escopo e entregáveis */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Escopo e entregáveis</h3>
            <div>
              <Label>Escopo</Label>
              <Textarea rows={3} {...form.register("scope")} />
            </div>
            <div>
              <Label>Entregáveis</Label>
              <Textarea rows={3} {...form.register("deliverables")} />
            </div>
          </section>

          <Separator />

          {/* Bloco 5 — Template de tarefas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Template de tarefas</h3>
              <Button type="button" size="sm" variant="outline" onClick={addTpl}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Tarefa
              </Button>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem tarefas configuradas — não será possível ativar o serviço para clientes.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start rounded-md border p-2">
                    <div className="col-span-12 md:col-span-4">
                      <Input placeholder="Nome da tarefa" value={t.name} onChange={(e) => updTpl(i, { name: e.target.value })} />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Select value={t.responsible_area || "_none"} onValueChange={(v) => updTpl(i, { responsible_area: v === "_none" ? null : v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Área" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Área —</SelectItem>
                          {RESPONSIBLE_AREAS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <Input placeholder="Tipo" value={t.task_type ?? ""} onChange={(e) => updTpl(i, { task_type: e.target.value || null })} />
                    </div>
                    <div className="col-span-6 md:col-span-1">
                      <Input type="number" placeholder="Dias" value={t.default_deadline_days ?? ""} onChange={(e) => updTpl(i, { default_deadline_days: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button type="button" size="icon" variant="ghost" onClick={() => rmTpl(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Bloco 6 — Checklist de onboarding */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Checklist de onboarding</h3>
              <Button type="button" size="sm" variant="outline" onClick={addChk}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item
              </Button>
            </div>
            {checklist.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem itens.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input value={c.item} placeholder="Item de onboarding" onChange={(e) => updChk(i, e.target.value)} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => rmChk(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <SheetFooter className="gap-2 sm:gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {service ? "Salvar" : "Criar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
