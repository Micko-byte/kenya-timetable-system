import { supabase } from "@/integrations/supabase/client";

export interface SchoolSession {
  userId: string;
  schoolId: string;
  role: string | null;
}

export async function getCurrentSchoolSession(): Promise<SchoolSession | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("school_id, role").eq("user_id", user.id),
  ]);

  const primaryRole = roles?.[0] ?? null;
  const schoolId = profile?.school_id ?? primaryRole?.school_id ?? null;

  if (!schoolId) {
    throw new Error("No school is linked to the current user.");
  }

  return {
    userId: user.id,
    schoolId,
    role: primaryRole?.role ?? null,
  };
}
