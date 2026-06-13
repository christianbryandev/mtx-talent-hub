-- Bug 1 Fix: Não usar email como fallback para full_name no trigger handle_new_user.
-- Quando raw_user_meta_data->>'full_name' não está presente, salvar NULL em vez do email.
-- Isso evita que o campo full_name no profiles contenha o email do usuário.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'jovem_aprendiz')::public.app_role);

  RETURN NEW;
END;
$function$;
