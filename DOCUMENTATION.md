# Documentation

## What The App Does

This app is a React + Supabase timetable builder for Kenyan schools.

It supports:

- school setup
- teacher and stream management
- template selection
- timetable generation
- timetable editing
- PDF, PNG, JPEG, and Excel downloads
- past timetable uploads
- admin template management

## How Template Mapping Works

The selected template is stored in the school record as `schools.timetable_template`.

When the main timetable page generates a timetable, it now:

- loads the selected template from `templates`
- passes that template into the generator
- stores the chosen template on each generated timetable row as `timetables.template_id`
- stores the visual theme separately as `timetables.template_type`

That means:

- the timetable is generated using the user-chosen template structure
- the timetable can later be traced back to the exact template that produced it
- downloads and admin views can show the template name instead of only a theme label

## Timetable Editing

The timetable studio now supports editing both the grid and the printable header.

Editable saved fields:

- `class_name`
- `term`
- `academic_year`

These fields are loaded when a timetable is selected and are saved back to the same `timetables` row when the user clicks `Save`.

The visual layout of the top header has also been widened so longer class names and term/year labels stay centered inside their boxes instead of clipping.

## Database SQL

Use this migration as the app schema:

[`supabase/migrations/20260414_01_rebuild_baseline.sql`](./supabase/migrations/20260414_01_rebuild_baseline.sql)

If your database already exists and you only need the timetable-template link, run this smaller patch:

```sql
alter table public.timetables
  add column if not exists template_id uuid references public.templates(id) on delete set null;

create index if not exists idx_timetables_template_id
  on public.timetables(template_id);
```

If you want the editable timetable header fields, add:

```sql
alter table public.timetables
  add column if not exists class_name text,
  add column if not exists term text,
  add column if not exists academic_year text;
```

## Payment Tables

Use this migration for Paystack checkout history, subscription receipts, and queued emails:

[`supabase/migrations/20260417_02_paystack_payments.sql`](./supabase/migrations/20260417_02_paystack_payments.sql)

If the table already exists and you want to backfill records where the school template matches the template row, you can optionally run:

```sql
update public.timetables t
set template_id = s.timetable_template::uuid
from public.schools s
where t.school_id = s.id
  and s.timetable_template is not null
  and t.template_id is null;
```

## Database Issue Guide

If the app cannot read or write data on Lovable/Supabase, check these in order:

1. Confirm the migration was applied.
2. Confirm the `templates` storage bucket exists.
3. Confirm RLS policies exist for `schools`, `teachers`, `streams`, `subjects`, `templates`, `uploaded_images`, `deployed_templates`, `timetables`, and `uploads`.
4. Confirm the authenticated user has a row in `user_roles` for the school.
5. Confirm `schools.timetable_template` contains a valid template UUID.
6. Confirm `timetables.template_id` exists if you want timetable-template traceability.

## Will It Work On Lovable?

Yes, if the Lovable project has:

- the same tables
- the same RLS policies
- the `templates` storage bucket
- the required environment variables for Supabase

The frontend now aligns with the schema in the migration and will work as long as Lovable uses that same database shape.

## Downloads

The timetable screen supports:

- PDF export
- Excel export
- PNG export
- JPEG export through the shared export helper

Generated filenames are sanitized so they work on Windows, macOS, and browser downloads.

## Billing and Paystack

The billing page now uses an in-app Paystack popup checkout plus a verification step.

Flow:

1. The browser calls the `paystack-init` Supabase Edge Function.
2. The function inserts a pending row into `payment_transactions` and returns a reference.
3. The browser opens Paystack inline with the public key and keeps the user on the billing page.
4. The user can choose card or mobile money in the popup.
5. The browser calls the `paystack-verify` function after a successful payment.
6. The verify function confirms the transaction, updates `payment_transactions`, updates `subscriptions`, inserts a payment activity log, and queues a receipt notification.

Required Edge Function secrets:

- `PAYSTACK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `PAYSTACK_SECRET_KEY` should stay only in Supabase Edge Functions.

The billing UI reads payment history from `activity_logs` rows with `activity_type = 'payment'`.

## Python Generator

The standalone generator lives here:

[`scripts/generate_timetable.py`](./scripts/generate_timetable.py)

It accepts JSON input through:

- `--input`
- stdin
- a raw JSON argument

It outputs a generated timetable JSON payload that matches the app’s current timetable structure.

## Core Files

- [`src/pages/Timetables.tsx`](./src/pages/Timetables.tsx)
- [`src/lib/api/templates.ts`](./src/lib/api/templates.ts)
- [`src/components/admin/GraphicalTemplateEditor.tsx`](./src/components/admin/GraphicalTemplateEditor.tsx)
- [`supabase/migrations/20260414_01_rebuild_baseline.sql`](./supabase/migrations/20260414_01_rebuild_baseline.sql)
- [`scripts/generate_timetable.py`](./scripts/generate_timetable.py)

## Run Locally

```sh
npm install
npm run dev
```

## Notes

- The app already has download actions in the timetable UI.
- The generator now stores the selected template relationship in the timetable row.
- If you add new templates or timetable columns later, regenerate the Supabase types.
