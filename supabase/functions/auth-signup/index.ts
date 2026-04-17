import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase function environment variables.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload = await req.json();

    const email = String(payload.email || "").trim();
    const password = String(payload.password || "");
    const fullName = String(payload.fullName || "").trim();
    const schoolName = String(payload.schoolName || "").trim();
    const schoolType = String(payload.schoolType || "").trim();

    if (!email || !password || !fullName || !schoolName || !schoolType) {
      throw new Error("Missing enrollment details.");
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        school_name: schoolName,
        school_type: schoolType,
      },
    });

    if (error) throw error;

    return Response.json(
      {
        data: {
          user_id: data.user?.id ?? null,
          email: data.user?.email ?? email,
        },
      },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create account." },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
