create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  plan_type text not null check (plan_type in ('free_trial', 'basic', 'premium')),
  payment_channel text not null check (payment_channel in ('card', 'mobile_money')),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'abandoned')),
  amount integer not null check (amount >= 0),
  currency text not null default 'KES',
  paystack_reference text not null unique,
  paystack_access_code text,
  paystack_transaction_id bigint,
  customer_email text not null,
  customer_phone text,
  paystack_response jsonb,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_school_id on public.payment_transactions(school_id);
create index if not exists idx_payment_transactions_reference on public.payment_transactions(paystack_reference);
create index if not exists idx_payment_notifications_school_id on public.payment_notifications(school_id);
create index if not exists idx_payment_notifications_transaction_id on public.payment_notifications(payment_transaction_id);

drop trigger if exists update_payment_transactions_updated_at on public.payment_transactions;
create trigger update_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.update_updated_at_column();

drop trigger if exists update_payment_notifications_updated_at on public.payment_notifications;
create trigger update_payment_notifications_updated_at
before update on public.payment_notifications
for each row execute function public.update_updated_at_column();

alter table public.payment_transactions enable row level security;
alter table public.payment_notifications enable row level security;

create policy "payment_transactions_school_access" on public.payment_transactions
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.school_id = payment_transactions.school_id
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.school_id = payment_transactions.school_id
    )
  );

create policy "payment_notifications_school_access" on public.payment_notifications
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.school_id = payment_notifications.school_id
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.school_id = payment_notifications.school_id
    )
  );
