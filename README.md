# ElimuTime - School Enrollment & Payment System Setup

This guide explains how to set up and fix the backend for the ElimuTime system.

## 1. Supabase Database Setup

### Run SQL Migrations
Run this in your **Supabase SQL Editor** to fix table schemas and enrollment triggers:

```sql
-- Fix the subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_type text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Update the Enrollment Trigger
CREATE OR REPLACE FUNCTION public.handle_new_school_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id uuid;
  school_name text;
  school_type text;
  contact_name text;
BEGIN
  -- Extract metadata
  school_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_name', '')), '');
  IF school_name IS NULL THEN school_name := 'New School'; END IF;

  school_type := nullif(trim(coalesce(new.raw_user_meta_data ->> 'school_type', '')), '');
  contact_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  -- Create school
  INSERT INTO public.schools (name, type)
  VALUES (school_name, school_type)
  RETURNING id INTO new_school_id;

  -- Create profile
  INSERT INTO public.profiles (id, school_id, email, full_name)
  VALUES (new.id, new_school_id, new.email, contact_name)
  ON CONFLICT (id) DO UPDATE SET school_id = excluded.school_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, school_id, role)
  VALUES (new.id, new_school_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Create subscription (Handles both column name variants)
  INSERT INTO public.subscriptions (school_id, plan, plan_type, status, expires_at)
  VALUES (new_school_id, 'free_trial', 'free_trial', 'active', now() + interval '14 days')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;
```

## 2. Edge Functions Setup (Dashboard Method)

If you are copy-pasting code directly into the Supabase Dashboard, you **MUST** use the "Self-Contained" versions of the code to avoid "Module not found" errors.

### Set Secrets
Go to **Edge Functions** -> **Settings** -> **Secrets** and add:
*   `SERVICE_ROLE_KEY`: Your project's `service_role` key.
*   `SUPABASE_URL`: Your project URL.

### Update Settings
For **`auth-signup`** and **`paystack-init`**:
*   **Verify JWT**: Turn this **OFF**.

---

## 3. Local Environment (`.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your-key
```

## 4. Redirect Rules
*   **Super Admin**: `leemwangi250@gmail.com` -> Redirects to `/admin`.
*   **School Owners**: All others -> Redirects to `/dashboard`.

---

## 5. Timetable Template System Setup

We have integrated a dynamic timetable template system. To set it up, follow these steps:

### A. Run Database Migration
Execute the SQL in `supabase/migrations/20260422_04_timetable_templates.sql` to create the necessary tables, types, and RLS policies.

### B. Seed Default Templates
Execute the SQL in `supabase/seed_templates.sql` to populate the gallery with the 10 professional designs.

### C. Admin Access
1.  Log in with the super-admin email: `leemwangi250@gmail.com`.
2.  Go to the **Template Management** tab in the Admin Dashboard.
3.  Here you can create, edit, or publish master templates for different school levels.

### D. School Features
1.  Schools can use the **Full Timetable Creator** at `/timetables`.
2.  Select your education level (Pre-Primary, Primary, Junior Secondary, etc.) to load defaults.
3.  Fully customize the grid, days, and periods.
4.  Export to **PDF** or **Excel** directly.
5.  Toggle between **Color** and **B&W** modes for printing.
