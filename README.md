# ElimuTime

ElimuTime is a React + Supabase school timetabling app for Kenyan schools. It covers school onboarding, teacher and stream setup, timetable generation, template management, downloads, and billing.

## What The App Does

- Landing page with product marketing and enrollment CTA
- Auth flow for sign in, sign up, and password reset
- School dashboard with stats, templates, and setup widgets
- Teacher and stream management
- Timetable studio with editable generated timetables
- Printable timetable header with editable school, class, term, and year fields
- PDF, PNG, JPEG, and Excel exports
- Admin template management
- Billing page with Paystack checkout and payment verification flow
- Payment activity history inside the app

## Main Routes

- `/` landing page
- `/auth` sign in
- `/signup` sign up
- `/role-selection` role routing
- `/dashboard` school dashboard
- `/teachers` teacher management
- `/streams` stream/class management
- `/timetables` timetable studio
- `/billing` billing and payments
- `/admin` admin dashboard
- `/admin/templates` template management
- `/admin/timetables` generated timetable admin view
- `/admin/users` users admin
- `/admin/schools` schools admin
- `/admin/schools/:schoolId` school detail admin
- `/admin/billing` admin billing

## Key Features

### Timetable Studio

- Generate timetables from your teachers, subjects, streams, and selected template
- Edit timetable cells directly in the grid
- Edit the printed header fields:
  - school name
  - class
  - term
  - year
- Save timetable changes back to Supabase
- Export to PDF, PNG, JPEG, and Excel
- Email timetable payloads to teachers

### Billing

- Free trial, Basic, and Premium plans
- Paystack checkout for paid plans
- Server-side payment verification through Supabase Edge Functions
- Subscription updates after successful verification
- Payment activity history in the billing page

### Admin Tools

- Create, edit, deploy, and delete timetable templates
- View all generated timetables across schools
- Inspect school-level data and user access

## Environment Variables

Frontend `.env`:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your publishable key"
VITE_SUPABASE_FUNCTIONS_URL="https://your-project.supabase.co/functions/v1"
VITE_PAYSTACK_PUBLIC_KEY="your Paystack public key"
```

Supabase Edge Function secrets:

```env
PAYSTACK_SECRET_KEY="your Paystack secret key"
SUPABASE_SERVICE_ROLE_KEY="your Supabase service role key"
SUPABASE_URL="https://your-project.supabase.co"
```

Do not put `PAYSTACK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the frontend.

## Paystack Integration

The billing flow is designed like this:

1. The billing page sends a checkout request to a Supabase Edge Function.
2. The Edge Function creates a pending `payment_transactions` row and returns a reference.
3. The browser opens Paystack inline using the public key, so the payment stays inside the app.
4. The user chooses card or mobile money in the popup.
5. When the payment succeeds, the app sends the reference to a verification Edge Function.
6. The verification function confirms the transaction with Paystack, updates `payment_transactions` and `subscriptions`, and queues a receipt notification.

## Database Notes

The app expects the Supabase baseline migration to be applied, plus the timetable header columns used by the editable studio:

- `timetables.class_name`
- `timetables.term`
- `timetables.academic_year`
- `payment_transactions`
- `payment_notifications`

The billing screen also reads payment activity from `activity_logs` entries with `activity_type = 'payment'`.

## Local Development

```sh
npm install
npm run dev
```

## Project Docs

For deeper database SQL, template mapping, and deployment notes, see [`DOCUMENTATION.md`](./DOCUMENTATION.md).
