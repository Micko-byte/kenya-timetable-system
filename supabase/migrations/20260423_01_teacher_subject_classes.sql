create table if not exists public.teacher_subject_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  stream_id uuid not null references public.streams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(teacher_id, subject_id, stream_id)
);

create index if not exists idx_teacher_subject_classes_teacher_id on public.teacher_subject_classes(teacher_id);
create index if not exists idx_teacher_subject_classes_subject_id on public.teacher_subject_classes(subject_id);
create index if not exists idx_teacher_subject_classes_stream_id on public.teacher_subject_classes(stream_id);

alter table public.teacher_subject_classes enable row level security;

create policy "teacher_subject_classes_school_access" on public.teacher_subject_classes
for all to authenticated using (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_subject_classes.teacher_id
      and ur.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.teachers t
    join public.user_roles ur on ur.school_id = t.school_id
    where t.id = teacher_subject_classes.teacher_id
      and ur.user_id = auth.uid()
  )
);
