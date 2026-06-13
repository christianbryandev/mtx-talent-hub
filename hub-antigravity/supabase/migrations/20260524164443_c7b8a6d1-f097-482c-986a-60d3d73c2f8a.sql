-- Chat channels table
CREATE TABLE public.chat_canais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'publico' CHECK (tipo IN ('publico', 'anuncio')),
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canal_id UUID REFERENCES public.chat_canais(id) ON DELETE CASCADE,
    autor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT DEFAULT 'texto' CHECK (tipo IN ('texto', 'sistema', 'conquista')),
    editado BOOLEAN DEFAULT false,
    deletado BOOLEAN DEFAULT false,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Chat members/presence table
CREATE TABLE public.chat_membros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canal_id UUID REFERENCES public.chat_canais(id) ON DELETE CASCADE,
    perfil_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pode_escrever BOOLEAN DEFAULT true,
    ultimo_acesso TIMESTAMPTZ DEFAULT now(),
    UNIQUE(canal_id, perfil_id)
);

-- Chat reactions table
CREATE TABLE public.chat_reacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensagem_id UUID REFERENCES public.chat_mensagens(id) ON DELETE CASCADE,
    perfil_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE(mensagem_id, perfil_id, emoji)
);

-- Enable RLS
ALTER TABLE public.chat_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reacoes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has allowed chat roles
CREATE OR REPLACE FUNCTION public.can_access_chat()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'comercial', 'colaborador')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for chat_canais
CREATE POLICY "Allowed roles can view channels" ON public.chat_canais
FOR SELECT USING (public.can_access_chat());

CREATE POLICY "Admins can manage channels" ON public.chat_canais
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- RLS Policies for chat_mensagens
CREATE POLICY "Allowed roles can view messages" ON public.chat_mensagens
FOR SELECT USING (public.can_access_chat());

CREATE POLICY "Allowed roles can insert messages" ON public.chat_mensagens
FOR INSERT WITH CHECK (public.can_access_chat());

CREATE POLICY "Authors can update their messages" ON public.chat_mensagens
FOR UPDATE USING (auth.uid() = autor_id);

CREATE POLICY "Admins can delete messages" ON public.chat_mensagens
FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- RLS Policies for chat_reacoes
CREATE POLICY "Allowed roles can view reactions" ON public.chat_reacoes
FOR SELECT USING (public.can_access_chat());

CREATE POLICY "Allowed roles can insert reactions" ON public.chat_reacoes
FOR INSERT WITH CHECK (public.can_access_chat());

CREATE POLICY "Users can delete their own reactions" ON public.chat_reacoes
FOR DELETE USING (auth.uid() = perfil_id);

-- RLS Policies for chat_membros
CREATE POLICY "Admins can manage members" ON public.chat_membros
FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);

CREATE POLICY "Users can update their own last access" ON public.chat_membros
FOR UPDATE USING (auth.uid() = perfil_id);

CREATE POLICY "Users can view their own membership" ON public.chat_membros
FOR SELECT USING (auth.uid() = perfil_id);

-- Insert default channel
INSERT INTO public.chat_canais (nome, descricao, tipo) 
VALUES ('Geral', 'Canal de comunicação da comunidade MTX', 'publico');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;

-- Automated System Messages Triggers
CREATE OR REPLACE FUNCTION public.handle_new_member_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_canal_id UUID;
    v_full_name TEXT;
BEGIN
    SELECT id INTO v_canal_id FROM public.chat_canais WHERE nome = 'Geral' LIMIT 1;
    v_full_name := COALESCE(NEW.full_name, 'Novo membro');
    
    IF v_canal_id IS NOT NULL THEN
        INSERT INTO public.chat_mensagens (canal_id, conteudo, tipo)
        VALUES (v_canal_id, '👋 ' || v_full_name || ' acabou de entrar na comunidade!', 'sistema');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_profile_chat_message
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_member_chat_message();

CREATE OR REPLACE FUNCTION public.handle_achievement_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_canal_id UUID;
    v_full_name TEXT;
    v_achievement_title TEXT;
BEGIN
    SELECT id INTO v_canal_id FROM public.chat_canais WHERE nome = 'Geral' LIMIT 1;
    SELECT p.full_name INTO v_full_name FROM public.profiles p WHERE p.id = NEW.user_id;
    SELECT a.title INTO v_achievement_title FROM public.achievements a WHERE a.id = NEW.achievement_id;
    
    IF v_canal_id IS NOT NULL AND v_full_name IS NOT NULL AND v_achievement_title IS NOT NULL THEN
        INSERT INTO public.chat_mensagens (canal_id, conteudo, tipo)
        VALUES (v_canal_id, '🏆 ' || v_full_name || ' desbloqueou a conquista ' || v_achievement_title || '!', 'conquista');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_achievement_chat_message
AFTER INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.handle_achievement_chat_message();

CREATE OR REPLACE FUNCTION public.handle_phase_completion_chat_message()
RETURNS TRIGGER AS $$
DECLARE
    v_canal_id UUID;
    v_full_name TEXT;
    v_phase_name TEXT;
BEGIN
    -- Only trigger if status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        SELECT id INTO v_canal_id FROM public.chat_canais WHERE nome = 'Geral' LIMIT 1;
        
        -- Get full name from profiles
        SELECT p.full_name INTO v_full_name FROM public.profiles p 
        WHERE p.id = NEW.user_id;
        
        -- Get phase title from catalog
        SELECT title INTO v_phase_name FROM public.journey_phase_catalog WHERE id = NEW.phase_id;
        
        IF v_canal_id IS NOT NULL AND v_full_name IS NOT NULL AND v_phase_name IS NOT NULL THEN
            INSERT INTO public.chat_mensagens (canal_id, conteudo, tipo)
            VALUES (v_canal_id, '🎓 ' || v_full_name || ' concluiu a fase ' || v_phase_name || '!', 'sistema');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_phase_completion_chat_message
AFTER UPDATE ON public.user_phase_status
FOR EACH ROW EXECUTE FUNCTION public.handle_phase_completion_chat_message();
