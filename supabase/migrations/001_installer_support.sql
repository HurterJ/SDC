-- Migration 001 : Support complet des installateurs
-- À exécuter dans Supabase SQL Editor

-- 1. Rendre uploaded_by nullable (installers n'ont pas de user_id)
ALTER TABLE public.observation_photos
  ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2. Ajouter photo_url sur les commentaires (preuve de résolution)
ALTER TABLE public.observation_comments
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Permettre la lecture anonyme des installer_tokens (pour validation token côté serveur)
--    (déjà géré via service role dans les API routes, pas besoin de policy anon)

-- 4. Permettre la lecture anonyme des observations pour les installateurs
--    (la page /installer/[token] lit les données via le server client)
CREATE POLICY IF NOT EXISTS "Lecture anon via token installateur"
  ON public.observations FOR SELECT
  TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Lecture anon plans via token installateur"
  ON public.plans FOR SELECT
  TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Lecture anon photos"
  ON public.observation_photos FOR SELECT
  TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Lecture anon commentaires"
  ON public.observation_comments FOR SELECT
  TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Lecture anon installer_tokens"
  ON public.installer_tokens FOR SELECT
  TO anon USING (true);
