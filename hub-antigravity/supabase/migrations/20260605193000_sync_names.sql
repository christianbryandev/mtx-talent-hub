-- 1. Sincronizar os dados que já existem (Arrumar os "Rogérios")
-- Atualiza os jovens para terem o mesmo nome do perfil
UPDATE public.young_people yp
SET full_name = p.full_name
FROM public.profiles p
WHERE yp.profile_id = p.id AND yp.full_name <> p.full_name AND p.full_name IS NOT NULL AND p.full_name <> '';

-- Atualiza os Metadados da Autenticação do Supabase (para o Super Admin e Topbar)
UPDATE auth.users u
SET raw_user_meta_data = jsonb_set(COALESCE(u.raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(p.full_name))
FROM public.profiles p
WHERE u.id = p.id AND (u.raw_user_meta_data->>'full_name') <> p.full_name AND p.full_name IS NOT NULL AND p.full_name <> '';

-- 2. Criar função para manter Perfis -> Jovens/Auth sincronizados automaticamente ao vivo
CREATE OR REPLACE FUNCTION public.sync_profile_name_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NEW.full_name <> OLD.full_name THEN
    -- Atualiza no Jovem (evitando loop infinito checando se já é diferente)
    UPDATE public.young_people 
    SET full_name = NEW.full_name
    WHERE profile_id = NEW.id AND full_name <> NEW.full_name;
    
    -- Atualiza no Auth para a barra superior e meta dados refletirem instantaneamente
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(NEW.full_name))
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_profile_name_updates ON public.profiles;
CREATE TRIGGER tr_sync_profile_name_updates
AFTER UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_name_updates();

-- 3. Criar função para manter Jovens -> Perfis sincronizados automaticamente ao vivo (caso o Admin mude o nome no CRM)
CREATE OR REPLACE FUNCTION public.sync_young_name_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NEW.full_name <> OLD.full_name AND NEW.profile_id IS NOT NULL THEN
    -- Atualiza o profile
    UPDATE public.profiles 
    SET full_name = NEW.full_name
    WHERE id = NEW.profile_id AND full_name <> NEW.full_name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_young_name_updates ON public.young_people;
CREATE TRIGGER tr_sync_young_name_updates
AFTER UPDATE OF full_name ON public.young_people
FOR EACH ROW
EXECUTE FUNCTION public.sync_young_name_updates();
