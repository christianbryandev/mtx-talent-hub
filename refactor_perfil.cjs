const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src/routes/_authenticated/meu-perfil.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Rename MeuPerfilPage to YoungProfileManager
content = content.replace('function MeuPerfilPage() {', 'function YoungProfileManager() {');

// 2. Add usePermissions import if not present
if (!content.includes('import { usePermissions }')) {
  content = content.replace(
    'import { useAuth } from "@/hooks/useAuth";',
    'import { useAuth } from "@/hooks/useAuth";\nimport { usePermissions } from "@/hooks/usePermissions";'
  );
}

// 3. Create the router MeuPerfilPage
const routerCode = `
function MeuPerfilPage() {
  const { roles, loading } = usePermissions();
  if (loading) return <div className="p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  if (roles?.includes("cliente")) return <ClientProfileManager />;
  return <YoungProfileManager />;
}
`;

content = content.replace(
  'type FormState = Partial<YoungPerson>;\n\nfunction YoungProfileManager() {',
  `type FormState = Partial<YoungPerson>;\n${routerCode}\nfunction YoungProfileManager() {`
);

// 4. Create ClientProfileManager
const clientProfileManagerCode = `
function ClientProfileManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["my-client-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: client, error: cErr } = await supabase
        .from("clients")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!client) return null;

      const { data: briefing, error: bErr } = await supabase
        .from("client_briefings")
        .select("*")
        .eq("client_id", client.id)
        .maybeSingle();
      if (bErr) throw bErr;

      return { client, briefing: briefing || {} };
    },
  });

  useEffect(() => {
    if (clientData) {
      setForm({ ...clientData.briefing });
    }
  }, [clientData]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!clientData?.client) throw new Error("Cliente não encontrado");
      const isNew = !clientData.briefing.id;
      if (isNew) {
        const { error } = await supabase.from("client_briefings").insert({
          client_id: clientData.client.id,
          ...payload
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_briefings").update(payload).eq("id", clientData.briefing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Briefing salvo com sucesso!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-client-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar briefing"),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!clientData?.client) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-bold">Perfil de Cliente não encontrado</h2>
        <p className="mt-2 text-muted-foreground">Seu usuário não está vinculado a uma ficha de cliente no nosso sistema.</p>
      </Card>
    );
  }

  const { client, briefing } = clientData;
  const ro = !editing;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const v = (k: string) => form[k] ?? "";

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.logo_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {client.company_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{client.company_name}</h1>
              <p className="text-muted-foreground">{client.contact_name} • {client.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <Button onClick={() => setEditing(true)} variant="default">
                <Pencil className="mr-2 h-4 w-4" /> Preencher / Editar Briefing
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setForm(briefing); setEditing(false); }}>
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Briefing
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-bold text-primary border-b pb-2">Briefing Comercial</h2>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">1. Sobre o Negócio</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Segmento de Atuação">
              <Input value={v("segment")} readOnly={ro} onChange={(e) => set("segment", e.target.value)} placeholder="Ex: Tecnologia, Varejo, Saúde" />
            </Field>
            <Field label="Público-Alvo">
              <Input value={v("target_audience")} readOnly={ro} onChange={(e) => set("target_audience", e.target.value)} placeholder="B2B, B2C, Idade, Classe social..." />
            </Field>
            <Field label="Principais Produtos/Serviços">
              <Textarea value={v("main_products")} readOnly={ro} onChange={(e) => set("main_products", e.target.value)} className="h-20" />
            </Field>
            <Field label="Diferenciais Competitivos">
              <Textarea value={v("differentials")} readOnly={ro} onChange={(e) => set("differentials", e.target.value)} className="h-20" />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">2. Marketing e Vendas</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Principais Concorrentes">
              <Textarea value={v("competitors")} readOnly={ro} onChange={(e) => set("competitors", e.target.value)} className="h-20" />
            </Field>
            <Field label="Maior Desafio Atual">
              <Textarea value={v("biggest_challenge")} readOnly={ro} onChange={(e) => set("biggest_challenge", e.target.value)} className="h-20" />
            </Field>
            <Field label="Objetivos de Marketing">
              <Textarea value={v("marketing_goals")} readOnly={ro} onChange={(e) => set("marketing_goals", e.target.value)} className="h-20" />
            </Field>
            <Field label="Objetivos Comerciais">
              <Textarea value={v("commercial_goals")} readOnly={ro} onChange={(e) => set("commercial_goals", e.target.value)} className="h-20" />
            </Field>
          </div>
        </div>
      </Card>
    </div>
  );
}

`;

content = content.replace('function Field({', clientProfileManagerCode + '\nfunction Field({');

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Refactoring complete!');
