import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type PaystackPlanType = "free_trial" | "basic" | "premium";
type PaymentChannel = "card" | "mobile_money";

const PLAN_AMOUNTS: Record<PaystackPlanType, number> = {
  free_trial: 0,
  basic: 250000,
  premium: 500000,
};

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
    const schoolId = String(payload.schoolId || "");
    const schoolName = String(payload.schoolName || "");
    const email = String(payload.email || "");
    const phone = String(payload.phone || "");
    const planType = String(payload.planType || "") as PaystackPlanType;
    const paymentChannel = String(payload.paymentChannel || "card") as PaymentChannel;

    if (!schoolId || !schoolName || !email) {
      throw new Error("Missing checkout details.");
    }

    if (!(planType in PLAN_AMOUNTS)) {
      throw new Error("Invalid plan type.");
    }

    const reference = `ELIMU-${planType.toUpperCase()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const { error } = await supabase.from("payment_transactions").insert({
      school_id: schoolId,
      plan_type: planType,
      payment_channel: paymentChannel,
      status: "pending",
      amount: PLAN_AMOUNTS[planType],
      currency: "KES",
      paystack_reference: reference,
      customer_email: email,
      customer_phone: phone || null,
      metadata: {
        school_name: schoolName,
        email,
        phone: phone || null,
        payment_channel: paymentChannel,
      },
    });

    if (error) throw error;

    return Response.json(
      {
        data: {
          reference,
          amount: PLAN_AMOUNTS[planType],
          currency: "KES",
        },
      },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create payment session." },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
