alter table public.payment_transactions
drop constraint if exists payment_transactions_plan_type_check;

alter table public.payment_transactions
add constraint payment_transactions_plan_type_check
check (plan_type in ('starter', 'growth', 'international'));
