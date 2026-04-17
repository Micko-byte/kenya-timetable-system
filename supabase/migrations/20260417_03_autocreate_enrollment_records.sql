create or replace function public.handle_new_school_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_school_id uuid;
  school_name text;
  school_type text;
  contact_name text;
begin
  school_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_name', '')), '');
  if school_name is null then
    school_name := 'New School';
  end if;

  school_type := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_type', '')), '');
  contact_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.schools (name, type)
  values (school_name, school_type)
  returning id into new_school_id;

  insert into public.profiles (id, school_id, email, full_name)
  values (new.id, new_school_id, new.email, contact_name);

  insert into public.user_roles (user_id, school_id, role)
  values (new.id, new_school_id, 'admin')
  on conflict do nothing;

  insert into public.subscriptions (school_id, plan_type, status, expires_at)
  values (
    new_school_id,
    'free_trial',
    'active',
    now() + interval '14 days'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_school_enrollment();
