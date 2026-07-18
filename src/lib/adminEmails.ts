// Emails granted admin-dashboard access. Compared case-insensitively because
// Supabase stores auth emails lowercased.
export const ADMIN_EMAILS = [
  "leemwangi250@gmail.com",
  "maobenigel@gmail.com",
  "notifytechgroup@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
