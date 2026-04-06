-- Migration 001 : Support complet des installateurs
-- À exécuter dans Supabase SQL Editor

-- 1. Rendre uploaded_by nullable (installers n'ont pas de user_id)
ALTER TABLE public.observation_photos
  ALTER COLUMN uploaded_by DROP NOT NULL;

-- 2. Ajouter photo_url sur les commentaires (preuve de résolution)
ALTER TABLE public.observation_comments
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Policies lecture anonyme pour la page installateur
--    (supprime d'abord si elles existent, puis recrée)

DROP POLICY IF EXISTS "Lecture anon via token installateur" ON public.observations;
CREATE POLICY "Lecture anon via token installateur"
  ON public.observations FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Lecture anon plans via token installateur" ON public.plans;
CREATE POLICY "Lecture anon plans via token installateur"
  ON public.plans FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Lecture anon photos" ON public.observation_photos;
CREATE POLICY "Lecture anon photos"
  ON public.observation_photos FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Lecture anon commentaires" ON public.observation_comments;
CREATE POLICY "Lecture anon commentaires"
  ON public.observation_comments FOR SELECT
  TO anon USING (true);

DROP POLICY IF EXISTS "Lecture anon installer_tokens" ON public.installer_tokens;
CREATE POLICY "Lecture anon installer_tokens"
  ON public.installer_tokens FOR SELECT
  TO anon USING (true);
