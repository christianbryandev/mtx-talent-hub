import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Smile, MoreVertical, Trash2, Edit2, Check, Settings, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const REACTION_OPTIONS = ["👍", "❤️", "🔥", "👏", "😂"];

export function GlobalChat() {
  const { user, profile } = useAuth();
  const { hasRole, isAdmin, isSuperAdmin } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [canal, setCanal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isChangingIcon, setIsChangingIcon] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = hasRole(["super_admin", "admin", "comercial", "colaborador"]);

  // Resolve a chat-assets storage path to a short-lived signed URL.
  const resolveChatAssetUrl = async (value: string | null | undefined): Promise<string | null> => {
    if (!value) return null;
    // Extract storage path from either a legacy public URL or a raw path.
    let path = value;
    const marker = "/chat-assets/";
    const idx = value.indexOf(marker);
    if (idx !== -1) path = value.slice(idx + marker.length);
    const { data, error } = await supabase.storage
      .from("chat-assets")
      .createSignedUrl(path, 60 * 60 * 24); // 24h
    if (error) {
      console.error("Erro ao gerar URL assinada do ícone do chat", error);
      return null;
    }
    return data.signedUrl;
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canal) return;

    try {
      setUploadingIcon(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `chat-icon-${canal.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage path (not a public URL — bucket is private).
      const { error: updateError } = await supabase
        .from("chat_canais")
        .update({ icon_url: fileName })
        .eq("id", canal.id);

      if (updateError) throw updateError;

      const signedUrl = await resolveChatAssetUrl(fileName);
      setCanal({ ...canal, icon_url: fileName, icon_signed_url: signedUrl });
      toast.success("Ícone atualizado!");
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao atualizar ícone");
    } finally {
      setUploadingIcon(false);
      setIsChangingIcon(false);
    }
  };

  useEffect(() => {
    if (!canAccess || !user) return;

    const fetchCanal = async () => {
      const { data } = await supabase
        .from("chat_canais")
        .select("*")
        .eq("nome", "Geral")
        .single();
      if (data) {
        const signedUrl = await resolveChatAssetUrl(data.icon_url);
        setCanal({ ...data, icon_signed_url: signedUrl });
      }
    };

    fetchCanal();
  }, [canAccess, user]);

  useEffect(() => {
    if (!canal || !user) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select(`
          *,
          autor:profiles(full_name, avatar_url),
          reacoes:chat_reacoes(*)
        `)
        .eq("canal_id", canal.id)
        .order("criado_em", { ascending: false })
        .range(0, 49);

      if (data) {
        setMessages(data.reverse());
        setHasMore(data.length === 50);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to messages
    const channel = supabase
      .channel(`chat:${canal.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_mensagens",
          filter: `canal_id=eq.${canal.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data: authorData } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", payload.new.autor_id)
              .single();
            
            const newMessage = {
              ...payload.new,
              autor: authorData,
              reacoes: []
            };

            setMessages((prev) => [...prev, newMessage]);
            if (!isOpen) setUnreadCount((prev) => prev + 1);
            scrollToBottom();
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) => 
              prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .on("presence", { event: "sync" }, () => {
        // Handle presence if needed
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers((prev) => {
            if (prev.includes(payload.userName)) return prev;
            return [...prev, payload.userName];
          });
          
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter(u => u !== payload.userName));
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canal, user]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
      updateLastAccess();
    }
  }, [isOpen]);

  const updateLastAccess = async () => {
    if (!canal || !user) return;
    
    // First try to select membership to see if it exists
    const { data: member } = await supabase
      .from("chat_membros")
      .select("id")
      .eq("canal_id", canal.id)
      .eq("perfil_id", user.id)
      .maybeSingle();

    if (member) {
      await supabase
        .from("chat_membros")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("id", member.id);
    } else {
      // Create membership if it doesn't exist
      await supabase
        .from("chat_membros")
        .insert({
          canal_id: canal.id,
          perfil_id: user.id,
          ultimo_acesso: new Date().toISOString()
        });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !canal || !user) return;

    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase
      .from("chat_mensagens")
      .insert({
        canal_id: canal.id,
        autor_id: user.id,
        conteudo: content,
        tipo: "texto"
      });

    if (error) {
      toast.error("Erro ao enviar mensagem");
      setNewMessage(content);
    }
  };

  const handleTyping = () => {
    if (!canal || !user) return;
    
    supabase.channel(`chat:${canal.id}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, userName: profile?.full_name?.split(" ")[0] || "Alguém" }
    });
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const { error } = await supabase
      .from("chat_mensagens")
      .update({ conteudo: editContent.trim(), editado: true })
      .eq("id", editingMessageId);

    if (error) {
      toast.error("Erro ao editar mensagem");
    } else {
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase
      .from("chat_mensagens")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao deletar mensagem");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("chat_reacoes")
      .insert({
        mensagem_id: messageId,
        perfil_id: user.id,
        emoji
      });

    if (error && error.code !== "23505") { // Ignore unique constraint violation
      toast.error("Erro ao reagir");
    }
  };

  const loadMore = async () => {
    if (!canal || loading || !hasMore) return;
    
    setLoading(true);
    const currentCount = messages.length;
    const { data, error } = await supabase
      .from("chat_mensagens")
      .select(`
        *,
        autor:profiles(full_name, avatar_url),
        reacoes:chat_reacoes(*)
      `)
      .eq("canal_id", canal.id)
      .order("criado_em", { ascending: false })
      .range(currentCount, currentCount + 49);

    if (data) {
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length === 50);
    }
    setLoading(false);
  };

  if (!canAccess) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary p-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="relative group/icon">
                <Avatar className="h-8 w-8 border border-primary-foreground/20 bg-transparent rounded-none">
                  <AvatarImage src={canal?.icon_url || "/favicon.png"} className="object-contain" />
                  <AvatarFallback className="bg-transparent text-primary-foreground rounded-none">MTX</AvatarFallback>
                </Avatar>
                
                {isSuperAdmin && (
                  <button 
                    onClick={() => {
                      setIsChangingIcon(!isChangingIcon);
                    }}
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-primary opacity-0 shadow-sm group-hover/icon:opacity-100 transition-opacity"
                    title="Mudar ícone"
                  >
                    <Settings className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Comunidade MTX</h3>
                </div>
                <p className="text-[10px] opacity-80">Canal Geral</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Icon Change UI */}
          {isChangingIcon && isSuperAdmin && (
            <div className="bg-muted/50 p-3 border-b animate-in slide-in-from-top-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Alterar ícone do chat:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleIconUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 h-8 gap-2 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingIcon}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {uploadingIcon ? "Enviando..." : "Upload de Imagem"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setIsChangingIcon(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="flex flex-col gap-4">
              {hasMore && (
                <Button variant="ghost" size="sm" className="mx-auto text-xs" onClick={loadMore} disabled={loading}>
                  {loading ? "Carregando..." : "Ver mais mensagens"}
                </Button>
              )}
              
              {messages.map((msg) => {
                const isOwn = msg.autor_id === user?.id;
                const isSystem = msg.tipo === "sistema" || msg.tipo === "conquista";
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="mx-auto max-w-[80%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
                      {msg.conteudo}
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`group flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={msg.autor?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {msg.autor?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-medium">{msg.autor?.full_name}</span>
                        {/* Example role badge logic */}
                        {msg.autor_id === '00000000-0000-0000-0000-000000000000' && ( // Placeholder for admin logic
                           <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-blue-100 text-blue-700">ADMIN</Badge>
                        )}
                      </div>

                      <div className={`relative rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"}`}>
                        {editingMessageId === msg.id ? (
                          <div className="flex flex-col gap-2">
                            <Input 
                              value={editContent} 
                              onChange={(e) => setEditContent(e.target.value)}
                              className="h-7 text-xs bg-background text-foreground"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingMessageId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleEditMessage}>
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          msg.conteudo
                        )}
                        
                        {/* Message Actions */}
                        {!editingMessageId && (
                          <div className={`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "right-full mr-2" : "left-full ml-2"}`}>
                             <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border">
                                  <Smile className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-1" side="top">
                                <div className="flex gap-1">
                                  {REACTION_OPTIONS.map(emoji => (
                                    <button 
                                      key={emoji} 
                                      className="hover:scale-125 transition-transform p-1 text-lg"
                                      onClick={() => handleReaction(msg.id, emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            
                            {isOwn && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border" onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditContent(msg.conteudo);
                              }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}

                            {(isAdmin || isSuperAdmin) && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background shadow-sm border text-destructive hover:text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                        {format(new Date(msg.criado_em), "HH:mm")}
                        {msg.editado && <span>(editado)</span>}
                      </div>

                      {/* Reactions display */}
                      {msg.reacoes && msg.reacoes.length > 0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? "justify-end" : ""}`}>
                          {Object.entries(
                            msg.reacoes.reduce((acc: any, r: any) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]: [string, any]) => (
                            <div key={emoji} className="flex items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-[10px]">
                              {emoji} {count > 1 && count}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t bg-muted/30 p-3">
            {typingUsers.length > 0 && (
              <p className="mb-1 text-[10px] italic text-muted-foreground">
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "está digitando..." : "estão digitando..."}
              </p>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Escreva uma mensagem..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="bg-background"
              />
              <Button type="submit" size="icon" className="shrink-0" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button 
        size="icon" 
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative">
          <MessageCircle className="h-7 w-7" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive p-0 text-[10px] text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </div>
      </Button>
    </div>
  );
}
