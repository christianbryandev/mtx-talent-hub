import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Sparkles, 
  CheckCircle2, 
  User, 
  Mail, 
  Phone, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  GraduationCap,
  Heart,
  Laptop,
  ShieldCheck,
  Calendar,
  MessageSquare
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { differenceInYears, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { withRetry } from "@/utils/supabase-retry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { INTEREST_AREAS, HOW_FOUND_OPTIONS } from "@/types";

const applicationSchema = z.object({
  // Step 1: Personal
  full_name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  
  // Step 2: Address
  address: z.string().min(5, "Endereço é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Use a sigla do estado (Ex: SP)"),
  
  // Step 3: Education/Context
  education_level: z.string().min(1, "Selecione sua escolaridade"),
  currently_studying: z.boolean(),
  currently_working: z.boolean(),
  family_income: z.string().min(1, "Informe a renda familiar aproximada"),
  
  // Step 4: Profile/Motivation
  personal_story: z.string().min(20, "Conte-nos um pouco mais sobre você (mín. 20 caracteres)"),
  dreams: z.string().min(10, "Quais são seus sonhos?"),
  why_mtx: z.string().min(10, "Por que você quer entrar na MTX?"),
  perceived_skills: z.string().min(5, "Quais são suas principais habilidades?"),
  interest_area: z.string().min(1, "Selecione uma área de interesse"),
  
  // Step 5: Infrastructure
  has_laptop: z.boolean(),
  has_phone: z.boolean(),
  has_internet: z.boolean(),
  how_found_mtx: z.string().min(1, "Informe como nos conheceu"),
  
  // Step 6: Legal
  data_authorization: z.boolean().refine(val => val === true, "Você precisa autorizar o uso de dados"),
  guardian_authorization: z.boolean(),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

export const Route = createFileRoute("/inscricao")({
  head: () => ({
    meta: [
      { title: "Inscrição — MTX Multiplicando Talentos" },
      { name: "description", content: "Cadastre-se na MTX e comece sua trilha de transformação." },
    ],
  }),
  component: PublicApplicationPage,
});

const DRAFT_KEY = "mtx_application_draft";

function PublicApplicationPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      whatsapp: "",
      birth_date: "",
      address: "",
      city: "",
      state: "",
      education_level: "",
      currently_studying: false,
      currently_working: false,
      family_income: "",
      personal_story: "",
      dreams: "",
      why_mtx: "",
      perceived_skills: "",
      interest_area: "",
      has_laptop: false,
      has_phone: false,
      has_internet: false,
      how_found_mtx: "",
      data_authorization: false,
      guardian_authorization: false,
    },
  });

  // Restore draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const { step: savedStep, values } = JSON.parse(saved);
        setStep(savedStep);
        form.reset(values);
      } catch (e) {
        console.error("Erro ao carregar rascunho:", e);
      }
    }
  }, [form]);

  // Save draft on changes
  useEffect(() => {
    const subscription = form.watch((values) => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, values }));
    });
    return () => subscription.unsubscribe();
  }, [form, step]);

  const birthDate = form.watch("birth_date");
  const age = useMemo(() => {
    if (!birthDate) return null;
    try {
      return differenceInYears(new Date(), parseISO(birthDate));
    } catch (e) {
      return null;
    }
  }, [birthDate]);

  const isUnderage = age !== null && age < 18;

  const steps = [
    { title: "Dados Pessoais", icon: <User className="h-4 w-4" /> },
    { title: "Endereço", icon: <MapPin className="h-4 w-4" /> },
    { title: "Contexto", icon: <GraduationCap className="h-4 w-4" /> },
    { title: "Perfil", icon: <Heart className="h-4 w-4" /> },
    { title: "Estrutura", icon: <Laptop className="h-4 w-4" /> },
    { title: "Termos", icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const nextStep = async () => {
    const fields = getFieldsForStep(step);
    const isValid = await form.trigger(fields as any);
    if (isValid) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  const getFieldsForStep = (stepIdx: number) => {
    switch (stepIdx) {
      case 0: return ["full_name", "email", "phone", "whatsapp", "birth_date"];
      case 1: return ["address", "city", "state"];
      case 2: return ["education_level", "currently_studying", "currently_working", "family_income"];
      case 3: return ["personal_story", "dreams", "why_mtx", "perceived_skills", "interest_area"];
      case 4: return ["has_laptop", "has_phone", "has_internet", "how_found_mtx"];
      case 5: return ["data_authorization", "guardian_authorization"];
      default: return [];
    }
  };

  const submit = useMutation({
    mutationFn: async (values: ApplicationValues) => {
      await withRetry(async () => {
        const { error } = await supabase.from("young_applications").insert({
          full_name: values.full_name,
          email: values.email.trim().toLowerCase(),
          phone: values.phone,
          whatsapp: values.whatsapp,
          birth_date: values.birth_date,
          age: age,
          address: values.address,
          city: values.city,
          state: values.state.toUpperCase(),
          education_level: values.education_level,
          currently_studying: values.currently_studying,
          currently_working: values.currently_working,
          family_income: values.family_income,
          personal_story: values.personal_story,
          dreams: values.dreams,
          why_mtx: values.why_mtx,
          perceived_skills: values.perceived_skills,
          interest_area: values.interest_area,
          has_laptop: values.has_laptop,
          has_phone: values.has_phone,
          has_internet: values.has_internet,
          how_found_mtx: values.how_found_mtx,
          data_authorization: values.data_authorization,
          guardian_authorization: isUnderage ? values.guardian_authorization : true,
          status: "pendente",
        });
        if (error) throw error;
      });
    },
    onSuccess: () => {
      setDone(true);
      localStorage.removeItem(DRAFT_KEY);
    },
    onError: (e: Error) => {
      console.error("Erro ao enviar inscrição:", e);
      toast.error("Erro ao enviar sua inscrição. Verifique os dados e tente novamente.");
    },
  });

  if (done) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 py-10">
        <Card className="max-w-lg w-full p-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Inscrição enviada!</h1>
            <p className="text-muted-foreground text-lg">
              Sua candidatura foi recebida com sucesso e agora faz parte do nosso banco de talentos.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-left">
            <p className="font-medium mb-1 text-primary">Próximos passos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Nossa equipe analisará seu perfil</li>
              <li>Entraremos em contato via WhatsApp ou E-mail</li>
              <li>Fique de olho nas convocações para as próximas turmas</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">— Equipe MTX • Multiplicando Talentos</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/mtx-hub-logo.png" alt="MTX Hub" className="h-14 w-auto drop-shadow-[0_0_15px_rgba(192,38,211,0.3)] mb-2" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">Formulário de Candidatura</h1>
            <p className="text-muted-foreground font-medium">Junte-se à próxima geração de talentos</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Passo {step + 1} de {steps.length}</span>
            <span className="text-xs font-medium text-muted-foreground">{steps[step].title}</span>
          </div>
          <Progress value={((step + 1) / steps.length) * 100} className="h-1.5" />
          
          <div className="hidden sm:flex justify-between gap-2">
            {steps.map((s, i) => (
              <div key={i} className={`flex-1 flex items-center gap-2 pb-2 border-b-2 transition-colors ${i <= step ? "border-primary text-primary" : "border-muted text-muted-foreground"}`}>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {i + 1}
                </div>
                <span className="text-[10px] font-bold uppercase truncate">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v: ApplicationValues) => submit.mutate(v))} className="space-y-6">
                
                {/* Step 0: Personal */}
                {step === 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Como em seu RG" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="seu@email.com" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="birth_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="date" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            {age !== null && <FormDescription>Idade: {age} anos</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone Celular</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="(00) 00000-0000" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp (se diferente)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="(00) 00000-0000" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 1: Address */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Rua, número, bairro..." className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input placeholder="Sua cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <FormControl>
                              <Input placeholder="EX: SP" maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Education/Context */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FormField
                      control={form.control}
                      name="education_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Escolaridade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione seu nível de ensino" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Ensino Fundamental Incompleto">Ensino Fundamental Incompleto</SelectItem>
                              <SelectItem value="Ensino Fundamental Cursando">Ensino Fundamental Cursando</SelectItem>
                              <SelectItem value="Ensino Fundamental Completo">Ensino Fundamental Completo</SelectItem>
                              <SelectItem value="Ensino Médio Cursando">Ensino Médio Cursando</SelectItem>
                              <SelectItem value="Ensino Médio Completo">Ensino Médio Completo</SelectItem>
                              <SelectItem value="Ensino Superior Cursando">Ensino Superior Cursando</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30">
                      <FormField
                        control={form.control}
                        name="currently_studying"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Estuda Atualmente?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currently_working"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Trabalha Atualmente?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="family_income"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renda Familiar Aproximada</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a faixa de renda" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Até 1 salário mínimo">Até 1 salário mínimo</SelectItem>
                              <SelectItem value="Entre 1 e 2 salários mínimos">Entre 1 e 2 salários mínimos</SelectItem>
                              <SelectItem value="Entre 2 e 4 salários mínimos">Entre 2 e 4 salários mínimos</SelectItem>
                              <SelectItem value="Mais de 4 salários mínimos">Mais de 4 salários mínimos</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Profile/Motivation */}
                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FormField
                      control={form.control}
                      name="personal_story"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conte um pouco da sua história</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="O que você gostaria que soubéssemos sobre sua trajetória?" 
                              className="min-h-[100px] resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dreams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quais são os seus maiores sonhos e objetivos?</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Onde você quer chegar?" className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="why_mtx"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Por que você deseja fazer parte da MTX?</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Sua motivação..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="perceived_skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quais habilidades você acredita possuir ou deseja desenvolver?</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Ex: Comunicação, Liderança, Design, Programação..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interest_area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Área de maior interesse</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma área" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INTEREST_AREAS.map((area) => (
                                <SelectItem key={area} value={area}>{area}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Infrastructure */}
                {step === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Label className="text-base font-bold">Infraestrutura e Acesso</Label>
                    <p className="text-sm text-muted-foreground mb-4">Essas informações não são critérios de exclusão, apenas para conhecermos suas condições atuais.</p>
                    
                    <div className="grid grid-cols-1 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                      <FormField
                        control={form.control}
                        name="has_laptop"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Possui Computador / Notebook próprio?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="has_phone"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Possui Smartphone próprio?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="has_internet"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Possui acesso estável à Internet em casa?</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="how_found_mtx"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como conheceu a MTX?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HOW_FOUND_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 5: Terms/Legal */}
                {step === 5 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                      <h3 className="font-bold text-primary flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" /> Autorização de Dados
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Ao prosseguir, você autoriza a MTX - Multiplicando Talentos a coletar e processar seus dados pessoais para fins de recrutamento, seleção e inclusão em nossos programas de capacitação e empregabilidade, conforme nossa Política de Privacidade.
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="data_authorization"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-bold cursor-pointer">Eu li e concordo com os termos acima.</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {isUnderage && (
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                        <h3 className="font-bold text-amber-600 flex items-center gap-2">
                          <User className="h-5 w-5" /> Responsável Legal
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Identificamos que você é menor de idade. Você confirma que possui autorização de seus pais ou responsáveis para realizar esta candidatura?
                        </p>
                        
                        <FormField
                          control={form.control}
                          name="guardian_authorization"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-bold cursor-pointer">Sim, possuo autorização dos meus responsáveis.</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormMessage />
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-4 border-t border-border/50">
                  {step > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1"
                      onClick={prevStep}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                  )}
                  
                  {step < steps.length - 1 ? (
                    <Button 
                      type="button" 
                      className="flex-1 font-bold"
                      onClick={nextStep}
                    >
                      Próximo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="flex-1 font-bold bg-primary hover:bg-primary/90" 
                      disabled={submit.isPending}
                    >
                      {submit.isPending ? "Processando..." : (
                        <>
                          Finalizar Inscrição <Sparkles className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MTX Multiplicando Talentos. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}