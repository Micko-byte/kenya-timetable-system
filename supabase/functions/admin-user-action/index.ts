import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Only the platform owner may manage users. Every school owner has an "admin"
// role for their OWN school, so role is not a safe signal here — email is.
const ADMIN_EMAIL = "leemwangi250@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Server configuration error.");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Identify the caller from their JWT and authorize them.
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) throw new Error("Not authenticated.");

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Invalid session.");
    const caller = userData.user;

    if (caller.email !== ADMIN_EMAIL) {
      throw new Error("You are not authorized to manage users.");
    }

    const body = await req.json();
    const action = String(body.action || "");
    const userId = String(body.userId || "");
    if (!userId) throw new Error("Missing userId.");
    if (userId === caller.id) throw new Error("You cannot modify your own admin account.");

    if (action === "update") {
      const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
      if (!fullName) throw new Error("A name is required.");

      const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
      if (error) throw error;

      return Response.json({ data: { ok: true } }, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;

      return Response.json({ data: { ok: true } }, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action.");
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
