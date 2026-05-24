import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bell, 
  Upload, 
  X, 
  Send, 
  Loader2, 
  Paperclip, 
  Trash2, 
  Eye,
  Megaphone,
  AlertTriangle,
  PartyPopper,
  ClipboardList,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NOTIFICATION_META, type NotificationType } from "@/lib/notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/painel-notificacoes")({
  component: NotificationPanelPage,
});

function NotificationPanelPage() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
  const [specificRecipientId, setSpecificRecipientId] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationType>("aviso");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // History states
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  
  // Detail modal
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      navigate({ to: "/dashboard" });
    }
  }, [isAdmin, isSuperAdmin, navigate]);

  const { data: youngPeople = [] } = useQuery({
    queryKey: ["young-people-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select(`
          id,
          full_name,
          profile_id
        `)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["notifications-history", page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("notifications")
        .select(`
          *,
          recipient:user_id(full_name),
          creator:created_by(full_name)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      return { notifications: data, total: count || 0 };
    },
    enabled: isAdmin,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications-history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let attachmentUrl = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `notificacoes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("notificacoes-anexos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("notificacoes-anexos")
          .getPublicUrl(filePath);
        
        attachmentUrl = publicUrl;
      }

      let targetUserIds: string[] = [];

      if (recipientType === "all") {
        const { data: allYoung, error: youngError } = await supabase
          .from("young_people")
          .select("profile_id");
        
        if (youngError) throw youngError;
        targetUserIds = allYoung.map(y => y.profile_id).filter(Boolean) as string[];
      } else {
        const young = youngPeople.find(y => y.id === specificRecipientId);
        if (young?.profile_id) {
          targetUserIds = [young.profile_id];
        }
      }

      if (targetUserIds.length === 0) throw new Error("Nenhum destinatário encontrado");

      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title,
        message,
        type: notificationType,
        attachment_url: attachmentUrl,
        created_by: user?.id,
        read: false,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Notificação enviada com sucesso!");
      setTitle("");
      setMessage("");
      setFile(null);
      setFilePreview(null);
      setRecipientType("all");
      setSpecificRecipientId("");
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
    },
    onError: (error: any) => {
      console.error("Error sending notification:", error);
      toast.error(`Erro ao enviar notificação: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificação excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["notifications-history"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  if (!isAdmin && !isSuperAdmin) return null;

  const typeOptions = [
    { value: "aviso", label: "Aviso", color: "text-blue-400", bg: "bg-blue-400/10", icon: Megaphone },
    { value: "urgente", label: "Urgente", color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
    { value: "celebracao", label: "Celebração", color: "text-green-400", bg: "bg-green-400/10", icon: PartyPopper },
    { value: "tarefa", label: "Tarefa", color: "text-amber-400", bg: "bg-amber-400/10", icon: ClipboardList },
    { value: "informativo", label: "Informativo", color: "text-zinc-400", bg: "bg-zinc-400/10", icon: Info },
  ];

  return (
    <div className="container mx-auto max-w-7xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Painel de Notificações</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6">
        {/* SEÇÃO ESQUERDA - Formulário */}
        <div className="space-y-6">
          <Card className="shadow-sm border-white/5 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Criar Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <div className="relative">
                  <Input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                    placeholder="Título da notificação..."
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {title.length}/100
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem *</label>
                <div className="relative">
                  <Textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                    placeholder="Escreva a mensagem da notificação..."
                    className="min-h-[120px] pb-8"
                  />
                  <span className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">
                    {message.length}/500
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload de Imagem/Arquivo (opcional)</label>
                <div 
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed border-white/10 rounded-xl p-6 transition-colors hover:border-primary/50 text-center",
                    file && "border-primary/30"
                  )}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input 
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.mp4"
                  />
                  
                  {file ? (
                    <div className="space-y-2">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="mx-auto h-24 w-auto rounded-lg object-contain" />
                      ) : (
                        <div className="mx-auto h-24 w-24 flex items-center justify-center bg-white/5 rounded-lg">
                          <Paperclip className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full hover:bg-destructive hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto h-12 w-12 flex items-center justify-center bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, GIF, PDF, MP4 (Máx 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Destinatários *</label>
                <Select value={recipientType} onValueChange={(v: any) => setRecipientType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione os destinatários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os jovens</SelectItem>
                    <SelectItem value="specific">Jovem específico</SelectItem>
                  </SelectContent>
                </Select>

                {recipientType === "specific" && (
                  <Select value={specificRecipientId} onValueChange={setSpecificRecipientId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um jovem" />
                    </SelectTrigger>
                    <SelectContent>
                      {youngPeople.map((young: any) => (
                        <SelectItem key={young.id} value={young.id}>
                          {young.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Notificação *</label>
                <Select value={notificationType} onValueChange={(v: any) => setNotificationType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded", opt.bg)}>
                            <opt.icon className={cn("h-4 w-4", opt.color)} />
                          </div>
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-gradient-mtx text-white font-semibold h-11"
                disabled={!title || !message || (recipientType === "specific" && !specificRecipientId) || isUploading}
                onClick={() => sendMutation.mutate()}
              >
                {isUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Enviar Notificação</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* SEÇÃO DIREITA - Histórico */}
        <div className="space-y-6">
          <Card className="shadow-sm border-white/5 bg-white/5 backdrop-blur-sm min-h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Histórico de Notificações</span>
                <span className="text-xs font-normal text-muted-foreground">{historyData?.total || 0} enviadas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground bg-white/5 border-y border-white/5">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Título</th>
                      <th className="px-4 py-3 font-medium">Destinatário</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoadingHistory ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-4 py-6">
                            <div className="h-4 bg-white/10 rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : historyData?.notifications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          Nenhuma notificação enviada ainda.
                        </td>
                      </tr>
                    ) : (
                      historyData?.notifications.map((n: any) => {
                        const meta = NOTIFICATION_META[n.type as NotificationType] || NOTIFICATION_META.geral;
                        const Icon = meta.icon;
                        return (
                          <tr key={n.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-3">
                              <div className={cn("p-1.5 rounded-lg w-fit", meta.bg)}>
                                <Icon className={cn("h-4 w-4", meta.color)} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium line-clamp-1">{n.title}</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1">{n.message}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs">
                                {n.recipient?.full_name || "Todos os jovens"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                                  onClick={() => setSelectedNotification(n)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isSuperAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                    onClick={() => {
                                      if (confirm("Tem certeza que deseja excluir esta notificação?")) {
                                        deleteMutation.mutate(n.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="mt-auto p-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Página {page + 1} de {Math.ceil((historyData?.total || 1) / PAGE_SIZE)}</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs" 
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    disabled={(page + 1) * PAGE_SIZE >= (historyData?.total || 0)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL DE DETALHES */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md bg-zinc-900 border-white/5">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {selectedNotification && (
                <div className={cn("p-2 rounded-lg", NOTIFICATION_META[selectedNotification.type as NotificationType]?.bg)}>
                  {(() => {
                    const Icon = NOTIFICATION_META[selectedNotification.type as NotificationType]?.icon || Bell;
                    return <Icon className={cn("h-5 w-5", NOTIFICATION_META[selectedNotification.type as NotificationType]?.color)} />;
                  })()}
                </div>
              )}
              <DialogTitle>{selectedNotification?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Enviado em {selectedNotification && format(new Date(selectedNotification.created_at), "dd/MM/yyyy 'às' HH:mm")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotification?.message}
            </div>

            {selectedNotification?.attachment_url && (
              <div className="mt-4 rounded-xl border border-white/5 overflow-hidden bg-white/5">
                {selectedNotification.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img 
                    src={selectedNotification.attachment_url} 
                    alt="Anexo" 
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Anexo da Notificação</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                      <a href={selectedNotification.attachment_url} target="_blank" rel="noopener noreferrer">
                        Visualizar / Baixar
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/5 flex flex-col gap-1 text-[10px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Para:</span>
                <span className="text-foreground">{selectedNotification?.recipient?.full_name || "Todos os jovens"}</span>
              </div>
              <div className="flex justify-between">
                <span>Criado por:</span>
                <span className="text-foreground">{selectedNotification?.creator?.full_name || "Administrador"}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={cn(selectedNotification?.read ? "text-green-400" : "text-amber-400")}>
                  {selectedNotification?.read ? "Lida" : "Não lida"}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
