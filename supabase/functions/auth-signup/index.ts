import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error("Server configuration error: Missing Supabase keys.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse and validate payload
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error("Failed to parse request JSON:", e);
      throw new Error("Invalid JSON payload.");
    }

    console.log("Received signup request for email:", payload.email);

    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const fullName = String(payload.fullName || "").trim();
    const schoolName = String(payload.schoolName || "").trim();
    const schoolType = String(payload.schoolType || "").trim();

    if (!email || !password || !fullName || !schoolName || !schoolType) {
      console.warn("Validation failed: Missing fields", { email, fullName, schoolName, schoolType });
      throw new Error("Please provide all required enrollment details (Name, Email, Password, School Name, and Type).");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Attempt to create the user
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

    if (error) {
      console.error("Supabase Auth error:", error);
      // Handle common auth errors gracefully
      if (error.message.toLowerCase().includes("already registered") || error.status === 422) {
        throw new Error("This email address is already registered. Please sign in instead.");
      }
      throw error;
    }

    console.log("User successfully created:", data.user?.id);

    return Response.json(
      {
        data: {
          user_id: data.user?.id ?? null,
          email: data.user?.email ?? email,
        },
      },
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create account.";
    console.error("Auth Signup Function Error:", errorMessage);

    return Response.json(
      { error: errorMessage },
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

