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
  -- Extract metadata with defaults
  school_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_name', '')), '');
  if school_name is null then
    school_name := 'New School';
  end if;

  school_type := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_type', '')), '');
  contact_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  -- 1. Create the school
  insert into public.schools (name, type)
  values (school_name, school_type)
  returning id into new_school_id;

  -- 2. Create the profile (Use ON CONFLICT to prevent "Database error creating user")
  insert into public.profiles (id, school_id, email, full_name)
  values (new.id, new_school_id, new.email, contact_name)
  on conflict (id) do update 
  set school_id = excluded.school_id,
      email = excluded.email,
      full_name = excluded.full_name;

  -- 3. Assign admin role
  insert into public.user_roles (user_id, school_id, role)
  values (new.id, new_school_id, 'admin')
  on conflict (user_id, school_id, role) do nothing;

  -- 4. Create subscription
  insert into public.subscriptions (school_id, plan_type, status, expires_at)
  values (
    new_school_id,
    'free_trial',
    'active',
    now() + interval '14 days'
  );

  return new;
exception when others then
  -- Log the error but don't necessarily crash the whole auth process if we can help it
  -- However, for signup, we usually want this to succeed or fail the transaction.
  raise log 'Error in handle_new_school_enrollment: %', SQLERRM;
  raise;
end;
$$;

-- Ensure the trigger is correctly attached
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_school_enrollment();

