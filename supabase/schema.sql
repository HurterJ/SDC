-- ============================================================
-- SiteSuivi — Schéma PostgreSQL Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extension de auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visibles par tous les authentifiés"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- Trigger: création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  address     TEXT,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient leurs projets"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owner crée des projets"
  ON public.projects FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner modifie ses projets"
  ON public.projects FOR UPDATE
  TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Owner supprime ses projets"
  ON public.projects FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TYPE public.project_role AS ENUM ('conducteur', 'installateur', 'lecteur');

CREATE TABLE public.project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.project_role NOT NULL DEFAULT 'lecteur',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les membres du projet"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Conducteurs gèrent les membres"
  ON public.project_members FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

-- ============================================================
-- INSTALLER TOKENS (accès sans compte)
-- ============================================================
CREATE TABLE public.installer_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  name        TEXT NOT NULL,
  company     TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'installateur' CHECK (role IN ('installateur', 'lecteur')),
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.installer_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens visibles par conducteurs du projet"
  ON public.installer_tokens FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

CREATE POLICY "Conducteurs gèrent les tokens"
  ON public.installer_tokens FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

-- ============================================================
-- PLANS (PDF/images de plans)
-- ============================================================
CREATE TABLE public.plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  file_url    TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les plans"
  ON public.plans FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Conducteurs gèrent les plans"
  ON public.plans FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

-- ============================================================
-- OBSERVATIONS / RÉSERVES
-- ============================================================
CREATE TYPE public.observation_status AS ENUM ('ouverte', 'en_cours', 'resolue', 'contestee', 'validee');
CREATE TYPE public.observation_priority AS ENUM ('basse', 'normale', 'haute', 'critique');

CREATE TABLE public.observations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_id     UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_x      FLOAT,   -- position X en % sur le plan (0-100)
  plan_y      FLOAT,   -- position Y en % sur le plan (0-100)
  title       TEXT NOT NULL,
  description TEXT,
  status      public.observation_status DEFAULT 'ouverte',
  priority    public.observation_priority DEFAULT 'normale',
  category    TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  due_date    DATE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les observations"
  ON public.observations FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Conducteurs et installers créent des observations"
  ON public.observations FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role IN ('conducteur', 'installateur')
    )
  );

CREATE POLICY "Conducteurs modifient toutes les observations"
  ON public.observations FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

CREATE POLICY "Conducteurs suppriment les observations"
  ON public.observations FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'conducteur'
    )
  );

-- ============================================================
-- OBSERVATION PHOTOS
-- ============================================================
CREATE TABLE public.observation_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id  UUID NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  caption         TEXT,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.observation_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les photos"
  ON public.observation_photos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Conducteurs et installers uploadent des photos"
  ON public.observation_photos FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Conducteurs suppriment des photos"
  ON public.observation_photos FOR DELETE
  TO authenticated
  USING (
    observation_id IN (
      SELECT id FROM public.observations WHERE project_id IN (
        SELECT id FROM public.projects WHERE owner_id = auth.uid()
        UNION
        SELECT project_id FROM public.project_members
        WHERE user_id = auth.uid() AND role = 'conducteur'
      )
    )
  );

-- ============================================================
-- OBSERVATION COMMENTS
-- ============================================================
CREATE TABLE public.observation_comments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id      UUID NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  author_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  installer_token_id  UUID REFERENCES public.installer_tokens(id) ON DELETE SET NULL,
  installer_name      TEXT,
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.observation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les commentaires"
  ON public.observation_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Utilisateurs authentifiés commentent"
  ON public.observation_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_observations_updated_at
  BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- STORAGE BUCKETS (à créer via dashboard Supabase)
-- ============================================================
-- bucket: plans      (public: false) — PDF/images des plans
-- bucket: photos     (public: false) — photos des observations

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_observations_project_id ON public.observations(project_id);
CREATE INDEX idx_observations_plan_id ON public.observations(plan_id);
CREATE INDEX idx_observations_status ON public.observations(status);
CREATE INDEX idx_plans_project_id ON public.plans(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_installer_tokens_token ON public.installer_tokens(token);
