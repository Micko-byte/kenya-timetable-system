# Elimutime — Supabase Auth Email Templates

Branded HTML for the Supabase authentication emails. Paste each file's contents into
**Supabase Dashboard → Authentication → Emails → Templates**, matching the tab to the file:

| Supabase template tab | File | Variables used |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `{{ .ConfirmationURL }}` |
| Invite user | `invite.html` | `{{ .ConfirmationURL }}` |
| Magic Link | `magic-link.html` | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| Change Email Address | `change-email.html` | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` |
| Reset Password | `reset-password.html` | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| Reauthentication | `reauthentication.html` | `{{ .Token }}` |

## Notes
- Paste into the **Source / HTML** view of each template, not the visual editor.
- The **Security** notifications (password changed, email changed, MFA added/removed, etc.)
  are toggles under Authentication → Emails; Supabase sends those automatically and they are
  not custom-editable HTML — just switch on the ones you want.
- Colors follow the app brand: primary blue `#0A84FF`, purple `#7C3AED`, ink `#011027`.
- Emails from Supabase's built-in service only deliver to your own team address and are
  rate-limited. Configure custom SMTP (Resend/SendGrid) under Authentication → SMTP Settings
  before relying on these for real users.
