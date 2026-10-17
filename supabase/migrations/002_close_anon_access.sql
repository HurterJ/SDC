-- Migration 002 : Fermer les accès anonymes ouverts par la migration 001
-- À exécuter dans Supabase SQL Editor (après déploiement du code qui charge
-- la page installateur côté serveur).
--
-- Les policies "TO anon USING (true)" permettaient à n'importe qui disposant
-- de la clé anon (publique, présente dans le JS du site) de lire toutes les
-- observations et tous les tokens installateur de tous les projets.
-- La page /installer/[token] et les routes /api/installer/* passent désormais
-- par la clé service role après vérification du token secret : aucune lecture
-- anonyme n'est nécessaire.

-- 1. Tables
DROP POLICY IF EXISTS "Lecture anon installer_tokens" ON public.installer_tokens;
DROP POLICY IF EXISTS "Lecture anon via token installateur" ON public.observations;
DROP POLICY IF EXISTS "Lecture anon plans via token installateur" ON public.plans;
DROP POLICY IF EXISTS "Lecture anon photos" ON public.observation_photos;
DROP POLICY IF EXISTS "Lecture anon commentaires" ON public.observation_comments;

-- 2. Storage (policies créées depuis le dashboard)
--    Le bucket "plans" reste public : ses URLs publiques fonctionnent sans policy,
--    mais on ne laisse plus lister son contenu sans être connecté.
--    Le bucket "photos" est privé : les URLs signées sont générées côté serveur.
DROP POLICY IF EXISTS "Anon can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read plans" ON storage.objects;
DROP POLICY IF EXISTS "Read plans 1rjzoq_0" ON storage.objects;
