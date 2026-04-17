create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  location text,
  logo_url text,
  timetable_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'staff', 'user')),
  created_at timestamptz not null default now(),
  unique(user_id, school_id, role)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  color text,
  created_at timestamptz not null default now(),
  unique(school_id, name)
);

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  grade integer not null,
  stream_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id, grade, stream_name)
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  email text not null,
  max_lessons_per_week integer default 25,
  availability jsonb,
  workload integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(school_id, email)
);

create table if not exists public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique(teacher_id, subject_id)
);

create table if not exists public.teacher_responsibilities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  unique(teacher_id, stream_id)
);

create table if not exists public.teacher_assigned_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(teacher_id, stream_id)
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content jsonb,
  type text not null default 'graphical' check (type in ('graphical', 'form')),
  status text not null default 'draft' check (status in ('draft', 'deployed')),
  is_deployed boolean not null default false,
  is_active boolean not null default true,
  school_type text,
  preview_image text,
  description text,
  periods_per_day integer,
  period_duration integer,
  days_per_week integer,
  start_time time,
  end_time time,
  break_config jsonb,
  structure_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.uploaded_images (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  upload_session uuid,
  created_at timestamptz not null default now(),
  template_id uuid references public.templates(id) on delete set null
);

create table if not exists public.deployed_templates (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  deployed_by uuid references auth.users(id),
  deployed_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  file_url text not null,
  type text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  plan_type text not null default 'free_trial',
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  template_type text,
  generated_by text,
  generated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'final', 'exported')),
  timetable_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(school_id, stream_id)
);

create index if not exists idx_profiles_school_id on public.profiles(school_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_school_id on public.user_roles(school_id);
create index if not exists idx_streams_school_grade on public.streams(school_id, grade);
create index if not exists idx_teachers_school_id on public.teachers(school_id);
create index if not exists idx_subjects_school_id on public.subjects(school_id);
create index if not exists idx_uploads_school_id on public.uploads(school_id);
create index if not exists idx_timetables_school_id on public.timetables(school_id);
create index if not exists idx_timetables_stream_id on public.timetables(stream_id);
create index if not exists idx_timetables_template_id on public.timetables(template_id);

drop trigger if exists update_schools_updated_at on public.schools;
create trigger update_schools_updated_at before update on public.schools
for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists update_streams_updated_at on public.streams;
create trigger update_streams_updated_at before update on public.streams
for each row execute function public.update_updated_at_column();

drop trigger if exists update_teachers_updated_at on public.teachers;
create trigger update_teachers_updated_at before update on public.teachers
for each row execute function public.update_updated_at_column();

drop trigger if exists update_templates_updated_at on public.templates;
create trigger update_templates_updated_at before update on public.templates
for each row execute function public.update_updated_at_column();

drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at before update on public.subscriptions
for each row execute function public.update_updated_at_column();

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subjects enable row level security;
alter table public.streams enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.teacher_responsibilities enable row level security;
alter table public.teacher_assigned_classes enable row level security;
alter table public.templates enable row level security;
alter table public.uploaded_images enable row level security;
alter table public.deployed_templates enable row level security;
alter table public.uploads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.timetables enable row level security;

create policy "profiles_read_own" on public.profiles
for select to authenticated using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "user_roles_read_own" on public.user_roles
for select to authenticated using (auth.uid() = user_id);

create policy "schools_read_member_school" on public.schools
for select to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = schools.id
  )
);

create policy "templates_read_authenticated" on public.templates
for select to authenticated using (true);

create policy "templates_admin_manage" on public.templates
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

create policy "uploaded_images_read_authenticated" on public.uploaded_images
for select to authenticated using (true);

create policy "uploaded_images_create_owner" on public.uploaded_images
for insert to authenticated with check (auth.uid() = uploaded_by);

create policy "uploaded_images_delete_owner" on public.uploaded_images
for delete to authenticated using (auth.uid() = uploaded_by);

create policy "deployed_templates_read_authenticated" on public.deployed_templates
for select to authenticated using (true);

create policy "deployed_templates_admin_manage" on public.deployed_templates
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

create policy "subjects_school_access" on public.subjects
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = subjects.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = subjects.school_id
  )
);

create policy "streams_school_access" on public.streams
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = streams.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = streams.school_id
  )
);

create policy "teachers_school_access" on public.teachers
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = teachers.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = teachers.school_id
  )
);

create policy "teacher_subjects_school_access" on public.teacher_subjects
for all to authenticated using (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_subjects.teacher_id
      and ur.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_subjects.teacher_id
      and ur.user_id = auth.uid()
  )
);

create policy "teacher_responsibilities_school_access" on public.teacher_responsibilities
for all to authenticated using (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_responsibilities.teacher_id
      and ur.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_responsibilities.teacher_id
      and ur.user_id = auth.uid()
  )
);

create policy "teacher_assigned_classes_school_access" on public.teacher_assigned_classes
for all to authenticated using (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_assigned_classes.teacher_id
      and ur.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_assigned_classes.teacher_id
      and ur.user_id = auth.uid()
  )
);

create policy "uploads_school_access" on public.uploads
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = uploads.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = uploads.school_id
  )
);

create policy "subscriptions_school_access" on public.subscriptions
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = subscriptions.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = subscriptions.school_id
  )
);

create policy "timetables_school_access" on public.timetables
for all to authenticated using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = timetables.school_id
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.school_id = timetables.school_id
  )
);
