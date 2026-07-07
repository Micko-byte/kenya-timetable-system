import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type PaystackPlanType = "starter" | "growth" | "international" | "payg";
type PaymentChannel = "card" | "mobile_money";

const PLAN_AMOUNTS: Record<"starter" | "growth" | "international", number> = {
  starter: 79900, // KES 799 per term
  growth: 750000, // Legacy plan, unchanged
  international: 349900, // KES 3,499 per year
};

// Pay-As-You-Go is a flat price per timetable generation.
const PAYG_AMOUNT = 20000; // KES 200

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
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
    const callbackUrl = String(payload.callbackUrl || "");

    if (!schoolId || !schoolName || !email) {
      throw new Error("Missing checkout details.");
    }

    // Resolve the amount to charge (in cents). The backend is the single source
    // of truth for pricing, so the client can never influence the amount.
    let chargeAmount: number;
    if (planType === "payg") {
      chargeAmount = PAYG_AMOUNT;
    } else {
      if (!(planType in PLAN_AMOUNTS)) {
        throw new Error("Invalid plan type.");
      }
      chargeAmount = PLAN_AMOUNTS[planType as keyof typeof PLAN_AMOUNTS];
    }

    const safeCallbackUrl = callbackUrl || undefined;

    const reference = `ELIMU-${planType.toUpperCase()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const initializeResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: chargeAmount,
        currency: "KES",
        reference,
        callback_url: safeCallbackUrl,
        metadata: {
          school_id: schoolId,
          school_name: schoolName,
          plan_type: planType,
          email,
          phone: phone || null,
          payment_channel: paymentChannel,
        },
      }),
    });

    const initializeBody = await initializeResponse.json();
    if (!initializeResponse.ok || !initializeBody.status) {
      throw new Error(initializeBody.message || "Failed to initialize Paystack transaction.");
    }

    const paystackData = initializeBody.data;
    const resolvedReference = String(paystackData.reference || reference);
    const accessCode = String(paystackData.access_code || "");
    const authorizationUrl = String(paystackData.authorization_url || "");

    const { error } = await supabase.from("payment_transactions").insert({
      school_id: schoolId,
      plan_type: planType,
      payment_channel: paymentChannel,
      status: "pending",
      amount: chargeAmount,
      currency: "KES",
      paystack_reference: resolvedReference,
      paystack_access_code: accessCode || null,
      customer_email: email,
      customer_phone: phone || null,
      metadata: {
        school_id: schoolId,
        school_name: schoolName,
        plan_type: planType,
        email,
        phone: phone || null,
        payment_channel: paymentChannel,
        paystack_reference: resolvedReference,
      },
    });

    if (error) throw error;

    return Response.json(
      {
        data: {
          reference: resolvedReference,
          access_code: accessCode,
          authorization_url: authorizationUrl,
          amount: chargeAmount,
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
