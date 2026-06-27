import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type PaystackPlanType = "starter" | "growth" | "international" | "payg";

const PLAN_AMOUNTS: Record<"starter" | "growth" | "international", number> = {
  starter: 50000,
  growth: 750000,
  international: 249900,
};

const PLAN_EXPIRES_IN_DAYS: Record<"starter" | "growth" | "international", number> = {
  starter: 90, // Termly (approx 3 months)
  growth: 90,
  international: 90,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYSTACK_SECRET_KEY) {
      throw new Error("Missing Supabase or Paystack function environment variables.");
    }

    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Payment reference is required.");
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const verifyBody = await paystackResponse.json();
    if (!paystackResponse.ok || !verifyBody.status) {
      throw new Error(verifyBody.message || "Paystack verification failed.");
    }

    const transaction = verifyBody.data;
    const planType = transaction?.metadata?.plan_type as PaystackPlanType | undefined;
    const schoolId = transaction?.metadata?.school_id as string | undefined;
    const paymentChannel = (transaction?.metadata?.payment_channel as string | undefined) || "card";

    if (!planType || !schoolId) {
      throw new Error("Transaction metadata is incomplete.");
    }

    const isPayg = planType === "payg";

    if (!isPayg && !(planType in PLAN_AMOUNTS)) {
      throw new Error("Unknown plan type.");
    }

    if (!isPayg && Number(transaction.amount) !== PLAN_AMOUNTS[planType as keyof typeof PLAN_AMOUNTS]) {
      throw new Error("Transaction amount does not match the selected plan.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const expiresAt = new Date();
    if (!isPayg) {
      expiresAt.setDate(expiresAt.getDate() + PLAN_EXPIRES_IN_DAYS[planType as keyof typeof PLAN_EXPIRES_IN_DAYS]);
    }

    const paymentPayload = {
      school_id: schoolId,
      plan_type: planType,
      payment_channel: paymentChannel,
      status: transaction.status === "success" ? "success" : "failed",
      amount: transaction.amount,
      currency: transaction.currency,
      paystack_reference: reference,
      paystack_access_code: transaction.access_code ?? null,
      paystack_transaction_id: transaction.id ?? null,
      customer_email:
        transaction.customer?.email ??
        transaction.metadata?.email ??
        transaction.authorization?.customer_email ??
        "",
      customer_phone:
        transaction.customer?.phone ??
        transaction.metadata?.phone ??
        transaction.authorization?.sender_bank_account_number ??
        null,
      paystack_response: transaction,
      metadata: {
        ...transaction.metadata,
        verified_reference: reference,
        gateway_response: transaction.gateway_response,
      },
      verified_at: new Date().toISOString(),
    };

    const { data: paymentRow, error: paymentError } = await supabase
      .from("payment_transactions")
      .upsert(paymentPayload, { onConflict: "paystack_reference" })
      .select("id")
      .single();

    if (paymentError) throw paymentError;

    // PAYG is a one-off charge per generation — it must NOT grant a standing
    // subscription. Only termly plans create/extend the subscription.
    if (!isPayg) {
      const { error: subError } = await supabase.from("subscriptions").upsert({
        school_id: schoolId,
        plan_type: planType,
        status: "active",
        expires_at: expiresAt.toISOString(),
      });

      if (subError) throw subError;
    }

    const receiptSubject = `ElimuTime payment receipt - ${planType.replace("_", " ")}`;
    const receiptBody = [
      `Payment reference: ${reference}`,
      `School ID: ${schoolId}`,
      `Plan: ${planType}`,
      `Amount: ${transaction.currency} ${Number(transaction.amount).toLocaleString()}`,
      `Channel: ${paymentChannel}`,
      `Status: ${transaction.status}`,
      `Expires: ${expiresAt.toDateString()}`,
    ].join("\n");

    const { error: notificationError } = await supabase.from("payment_notifications").insert({
      school_id: schoolId,
      payment_transaction_id: paymentRow.id,
      recipient_email:
        transaction.customer?.email ??
        transaction.metadata?.email ??
        transaction.authorization?.customer_email ??
        "billing@school.local",
      subject: receiptSubject,
      body: receiptBody,
      status: "queued",
    });

    if (notificationError) {
      console.warn("Failed to queue payment notification:", notificationError.message);
    }

    const { error: activityError } = await supabase.from("activity_logs").insert({
      school_id: schoolId,
      user_id: null,
      activity_type: "payment",
      title: `Payment verified: ${planType.replace("_", " ")}`,
      description: `Reference ${reference} confirmed for ${transaction.currency} ${Number(transaction.amount).toLocaleString()}.`,
      metadata: {
        reference,
        plan_type: planType,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_channel: paymentChannel,
        paystack_status: transaction.status,
      },
    });

    if (activityError) throw activityError;

    return Response.json(
      {
        data: {
          reference,
          status: transaction.status,
          plan_type: planType,
          amount: transaction.amount,
          currency: transaction.currency,
          expires_at: isPayg ? null : expiresAt.toISOString(),
          subscription_status: isPayg ? "none" : "active",
        },
      },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment." },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
