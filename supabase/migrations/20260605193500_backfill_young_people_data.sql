-- Atualiza a tabela young_people com os dados de young_applications baseando-se no e-mail
UPDATE public.young_people yp
SET 
  age = COALESCE(app.age, yp.age),
  city = COALESCE(app.city, yp.city),
  state = COALESCE(app.state, yp.state),
  whatsapp = COALESCE(app.whatsapp, yp.whatsapp),
  phone = COALESCE(app.phone, yp.phone),
  education_level = COALESCE(app.education_level, yp.education_level),
  family_income = COALESCE(app.family_income, yp.family_income),
  interest_area = COALESCE(app.interest_area, yp.interest_area),
  has_laptop = COALESCE(app.has_laptop, yp.has_laptop),
  has_phone = COALESCE(app.has_phone, yp.has_phone),
  has_internet = COALESCE(app.has_internet, yp.has_internet),
  testimony = COALESCE(app.personal_story, yp.testimony),
  dreams = COALESCE(app.dreams, yp.dreams),
  skills = COALESCE(app.perceived_skills, yp.skills)
FROM public.young_applications app
WHERE yp.email = app.email 
  AND yp.email IS NOT NULL 
  AND yp.email <> ''
  AND (yp.age IS NULL OR yp.city IS NULL OR yp.city = '');
