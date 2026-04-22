-- 1. Enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'education_level') THEN
        CREATE TYPE public.education_level AS ENUM (
          'pre_primary','lower_primary','upper_primary',
          'junior_secondary','senior_secondary','eight_four_four'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_status') THEN
        CREATE TYPE public.template_status AS ENUM ('draft','published','archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_design') THEN
        CREATE TYPE public.template_design AS ENUM (
          'classic_kenya','modern_glass','vibrant_colors','clean_minimal','kenyan_flag',
          'midnight_black','slate_pro','monochrome','ocean_blue','forest_green'
        );
    END IF;
END $$;

-- 2. Master templates
CREATE TABLE IF NOT EXISTS public.timetable_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  design public.template_design NOT NULL,
  level public.education_level NOT NULL,
  curriculum text NOT NULL DEFAULT 'CBC',
  description text,
  preview_image_url text,
  theme_config jsonb NOT NULL,
  font_family text NOT NULL DEFAULT 'Inter',
  days jsonb NOT NULL,
  periods jsonb NOT NULL,
  grid_json jsonb NOT NULL,
  custom_subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  col_colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.template_status NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(design, level, curriculum, version)
);

-- 3. Version history
CREATE TABLE IF NOT EXISTS public.timetable_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.timetable_templates(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

-- 4. School instances
CREATE TABLE IF NOT EXISTS public.school_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.timetable_templates(id) ON DELETE SET NULL,
  class_name text NOT NULL,
  term text,
  year text,
  colorless boolean NOT NULL DEFAULT true,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Helper function for RLS (if not exists)
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = $1 AND role = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS touch_timetable_templates ON public.timetable_templates;
CREATE TRIGGER touch_timetable_templates BEFORE UPDATE ON public.timetable_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_school_timetables ON public.school_timetables;
CREATE TRIGGER touch_school_timetables BEFORE UPDATE ON public.school_timetables
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. RLS
ALTER TABLE public.timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetables ENABLE ROW LEVEL SECURITY;

-- Policies for timetable_templates
DROP POLICY IF EXISTS "Anyone authenticated reads published templates" ON public.timetable_templates;
CREATE POLICY "Anyone authenticated reads published templates"
  ON public.timetable_templates FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write templates" ON public.timetable_templates;
CREATE POLICY "Admins write templates"
  ON public.timetable_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies for timetable_template_versions
DROP POLICY IF EXISTS "Admins manage versions" ON public.timetable_template_versions;
CREATE POLICY "Admins manage versions"
  ON public.timetable_template_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read versions" ON public.timetable_template_versions;
CREATE POLICY "Admins read versions"
  ON public.timetable_template_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies for school_timetables
DROP POLICY IF EXISTS "School members read own timetables" ON public.school_timetables;
CREATE POLICY "School members read own timetables"
  ON public.school_timetables FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "School members write own timetables" ON public.school_timetables;
CREATE POLICY "School members write own timetables"
  ON public.school_timetables FOR ALL TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_templates_design_level ON public.timetable_templates(design, level, status);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.timetable_templates(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_school_timetables_school ON public.school_timetables(school_id);
