alter table public.timetables
  add column if not exists class_name text,
  add column if not exists term text,
  add column if not exists academic_year text;

comment on column public.timetables.class_name is 'Printable class label for the timetable header.';
comment on column public.timetables.term is 'Printable term label for the timetable header.';
comment on column public.timetables.academic_year is 'Printable academic year for the timetable header.';
