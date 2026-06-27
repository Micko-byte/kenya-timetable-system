/**
 * Translate raw Supabase / Postgres / auth errors into short, friendly,
 * actionable messages so users never see things like
 * `duplicate key value violates unique constraint "streams_school_id_..."`.
 *
 * Usage:  toast.error(friendlyError(error, "Failed to add teacher"))
 */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string; error_description?: string; error?: string } | null)?.message ||
          (error as { error_description?: string } | null)?.error_description ||
          (error as { error?: string } | null)?.error ||
          "").toString();

  const lower = raw.toLowerCase();
  if (!raw) return fallback;

  // ── Unique constraint (duplicate) ─────────────────────────────
  if (lower.includes("duplicate key") || lower.includes("23505") || lower.includes("already exists")) {
    if (lower.includes("streams_school_id_grade_stream_name"))
      return "That stream already exists for this grade. Delete the existing one first, or use a different stream name.";
    if (lower.includes("teachers_school_id_email"))
      return "A teacher with that email already exists. Use a different email, or remove the existing teacher first.";
    if (lower.includes("subjects_school_id_name"))
      return "That subject already exists for your school.";
    if (lower.includes("teacher_subject_classes"))
      return "That class is already linked to this subject for this teacher.";
    if (lower.includes("teacher_subjects"))
      return "That subject is already assigned to this teacher.";
    if (lower.includes("timetables_school_id_stream"))
      return "A timetable already exists for this class. Reset it before generating a new one.";
    if (lower.includes("user_roles") || lower.includes("profiles"))
      return "This account is already set up. Try signing in instead.";
    return "This already exists. Please delete the existing one first, or use a different value.";
  }

  // ── Foreign key ───────────────────────────────────────────────
  if (lower.includes("foreign key") || lower.includes("23503"))
    return "This is still linked to other records, so it can't be changed right now. Remove those links first.";

  // ── Required / not-null ───────────────────────────────────────
  if (lower.includes("null value") || lower.includes("23502") || lower.includes("not-null"))
    return "Please fill in all the required fields and try again.";

  // ── Permission / RLS ──────────────────────────────────────────
  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("42501"))
    return "You don't have permission to do this. Try signing out and back in.";

  // ── Auth ──────────────────────────────────────────────────────
  if (lower.includes("invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (lower.includes("already registered")) return "This email is already registered. Please sign in instead.";
  if (lower.includes("email not confirmed")) return "Please confirm your email address before signing in.";
  if (lower.includes("password should be") || lower.includes("password must"))
    return "Your password is too short. Use at least 6 characters.";
  if (lower.includes("jwt") || lower.includes("not authorized") || lower.includes("401") || lower.includes("session"))
    return "Your session has expired. Please sign in again.";

  // ── Network / config ──────────────────────────────────────────
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request"))
    return "Network problem. Check your internet connection and try again.";
  if (lower.includes("missing supabase") || lower.includes("missing paystack"))
    return "Payments aren't fully set up yet. Please contact support.";
  if (lower.includes("bucket") && lower.includes("not found"))
    return "File storage isn't set up yet. Please contact support.";

  // ── Otherwise: show the raw message only if it's short & human ──
  if (raw.length <= 120 && !lower.includes("constraint") && !lower.includes("violates") && !lower.includes("pgrst")) {
    return raw;
  }
  return fallback;
}
