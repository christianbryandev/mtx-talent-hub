-- Criar tabela de módulos
CREATE TABLE public.journey_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    phase_id UUID NOT NULL REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT DEFAULT 'text', -- text, video, link, etc.
    content_body TEXT,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar module_id à tabela de checklist
ALTER TABLE public.journey_checklist_items 
ADD COLUMN module_id UUID REFERENCES public.journey_modules(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.journey_modules ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para journey_modules
CREATE POLICY "Módulos são visíveis por usuários autenticados" 
ON public.journey_modules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins podem gerenciar módulos" 
ON public.journey_modules FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Trigger para updated_at
CREATE TRIGGER update_journey_modules_updated_at
BEFORE UPDATE ON public.journey_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de dados iniciais para a Fase 1 (Fundamentos)
-- Usando o ID encontrado na busca: 10f5c221-1687-4588-af47-a0fdcd76c04d
DO $$
DECLARE
    v_phase_id UUID := '10f5c221-1687-4588-af47-a0fdcd76c04d';
    v_mod1_id UUID;
    v_mod2_id UUID;
    v_mod3_id UUID;
    v_mod4_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.journey_phase_catalog WHERE id = v_phase_id) THEN
        -- Inserir módulos
        INSERT INTO public.journey_modules (phase_id, title, order_index, content_body)
        VALUES (v_phase_id, 'O que é a MTX', 1, 'Bem-vindo à MTX! Aqui você vai entender nossa visão e missão.')
        RETURNING id INTO v_mod1_id;

        INSERT INTO public.journey_modules (phase_id, title, order_index, content_body)
        VALUES (v_phase_id, 'Mentalidade MTX', 2, 'O sucesso começa na mente. Vamos alinhar as expectativas.')
        RETURNING id INTO v_mod2_id;

        INSERT INTO public.journey_modules (phase_id, title, order_index, content_body)
        VALUES (v_phase_id, 'Como funciona o jogo', 3, 'Entenda as regras, XP, níveis e como evoluir na jornada.')
        RETURNING id INTO v_mod3_id;

        INSERT INTO public.journey_modules (phase_id, title, order_index, content_body)
        VALUES (v_phase_id, 'Organização e rotina', 4, 'Dicas práticas para conciliar seus estudos e tarefas.')
        RETURNING id INTO v_mod4_id;

        -- Opcional: Vincular itens existentes ao primeiro módulo
        UPDATE public.journey_checklist_items 
        SET module_id = v_mod1_id
        WHERE id IN (
            SELECT ci.id 
            FROM public.journey_checklist_items ci
            JOIN public.journey_cards jc ON jc.id = ci.card_id
            WHERE jc.phase_id = v_phase_id
        );
    END IF;
END $$;
