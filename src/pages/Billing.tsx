import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PricingSection } from "@/components/pricing/PricingSection";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { BILLING_PLANS, type BillingPlanType } from "@/lib/billingPlans";
import {
  buildPricingSnapshot,
  mapSubscriptionPlanToFrontendPlan,
  setSelectedFrontendPlan,
  type FrontendPlanType,
  type PricingSnapshot,
} from "@/lib/planSelection";
import {
  isValidKenyanMobileMoneyPhone,
  normalizeKenyanPhoneNumber,
  PAYSTACK_PLANS,
  paystackApi,
  type PaymentChannel,
  type PaystackPlanType,
} from "@/lib/paystack";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
  updated_at?: string | null;
}

interface PaymentLog {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  metadata: Record<string, any> | null;
}

const PAYMENT_CHANNELS: Array<{ label: string; value: PaymentChannel; description: string }> = [
  { label: "Card", value: "card", description: "Visa, Mastercard, and other card payments" },
  { label: "Mobile Money", value: "mobile_money", description: "Pay with a mobile money channel" },
];

const Billing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teacherCount, setTeacherCount] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<PaystackPlanType | null>(null);
  const [verifyingReference, setVerifyingReference] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentLog[]>([]);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("card");
  const [lastVerifiedReference, setLastVerifiedReference] = useState<string | null>(null);

  useEffect(() => {
    void fetchSubscription();
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get("reference");
    if (!reference || reference === lastVerifiedReference) {
      return;
    }

    setLastVerifiedReference(reference);
    void verifyReference(reference).finally(() => {
      navigate("/billing", { replace: true });
    });
  }, [location.search, lastVerifiedReference, navigate]);

  const currentPlan = useMemo(
    () =>
      subscription?.plan_type && subscription.plan_type in BILLING_PLANS
        ? BILLING_PLANS[subscription.plan_type as BillingPlanType]
        : null,
    [subscription]
  );
  const currentFrontendPlan = useMemo(
    () => mapSubscriptionPlanToFrontendPlan(subscription?.plan_type),
    [subscription?.plan_type],
  );
  const pricingSnapshot = useMemo(
    () => buildPricingSnapshot(currentFrontendPlan || "payg", teacherCount, streamCount),
    [currentFrontendPlan, streamCount, teacherCount],
  );

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        throw new Error("Could not find your school profile.");
      }

      setSchoolId(profile.school_id);
      setSchoolEmail(user.email || "");

      const [{ data: schoolData }, { data: subData }, { data: activityData }, { count: teachersTotal }, { count: streamsTotal }] = await Promise.all([
        supabase.from("schools").select("name").eq("id", profile.school_id).single(),
        supabase.from("subscriptions").select("*").eq("school_id", profile.school_id).single(),
        supabase
          .from("activity_logs")
          .select("id, title, description, created_at, metadata")
          .eq("school_id", profile.school_id)
          .eq("activity_type", "payment")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("teachers").select("*", { count: "exact", head: true }).eq("school_id", profile.school_id),
        supabase.from("streams").select("*", { count: "exact", head: true }).eq("school_id", profile.school_id),
      ]);

      setSchoolName(schoolData?.name || "ElimuTime School");
      setSubscription(subData);
      setHistory((activityData || []) as PaymentLog[]);
      setTeacherCount(teachersTotal || 0);
      setStreamCount(streamsTotal || 0);
    } catch (error: any) {
      toast.error(error.message || "Failed to load billing details");
    } finally {
      setLoading(false);
    }
  };

  const verifyReference = async (reference: string) => {
    try {
      setVerifyingReference(reference);
      const result = await paystackApi.verifyPayment(reference);
      if (result.subscription_status !== "active") {
        throw new Error("Payment did not complete successfully.");
      }

      toast.success("Payment verified and subscription activated.");
      await fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || "Payment verification failed");
    } finally {
      setVerifyingReference(null);
    }
  };

  const startCheckout = async (planType: PaystackPlanType) => {
    if (!schoolId || !schoolEmail) {
      toast.error("School billing details are still loading.");
      return;
    }

    if (paymentChannel === "mobile_money" && !isValidKenyanMobileMoneyPhone(phone)) {
      toast.error("Enter a valid Kenyan phone number like 07XXXXXXXX or 2547XXXXXXXX.");
      return;
    }

    try {
      setCheckingOut(planType);
      const normalizedPhone = paymentChannel === "mobile_money" ? normalizeKenyanPhoneNumber(phone) : phone || undefined;
      const planAmount = PAYSTACK_PLANS[planType].amount;

      const { authorization_url } = await paystackApi.initializePayment({
        schoolId,
        schoolName,
        email: schoolEmail,
        planType,
        amount: planAmount,
        paymentChannel,
        callbackUrl: `${window.location.origin}/billing`,
        phone: normalizedPhone,
      });

      if (!authorization_url) {
        throw new Error("Paystack did not return a checkout URL.");
      }

      window.location.assign(authorization_url);
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setCheckingOut(null);
    }
  };

  const handleBillingPlanSelect = (planType: FrontendPlanType, snapshot: PricingSnapshot) => {
    setSelectedFrontendPlan(planType, schoolId, snapshot);
    if (planType === "payg") {
      toast.success("Pay-As-You-Go selected. You can keep generating and be charged per timetable generation.");
      return;
    }

    const paystackPlanType: PaystackPlanType = planType === "basic" ? "starter" : "international";
    void startCheckout(paystackPlanType);
  };

  const getBillingPlanAction = (
    planType: FrontendPlanType,
    snapshot: PricingSnapshot,
    isCurrent: boolean,
  ) => {
    if (planType === "payg") {
      return {
        label: isCurrent ? "Selected" : "Select Plan",
        onClick: () => handleBillingPlanSelect(planType, snapshot),
      };
    }

    const targetPlanType: PaystackPlanType = planType === "basic" ? "starter" : "international";
    return {
      label: checkingOut === targetPlanType ? "Redirecting..." : isCurrent ? "Current Plan" : "Continue to Paystack",
      onClick: () => handleBillingPlanSelect(planType, snapshot),
      disabled: checkingOut === targetPlanType || loading || isCurrent || !schoolId,
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="mb-2 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-3 text-3xl font-bold text-primary">
            <CreditCard className="h-8 w-8" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Review your subscription, compare plans, and complete payment through the Paystack checkout flow.
          </p>
        </div>

        {verifyingReference && (
          <Card className="flex items-center gap-3 border-primary/20 bg-primary/5 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm">Verifying payment reference {verifyingReference}...</p>
          </Card>
        )}

        {currentPlan && (
          <Card className="gradient-accent p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  Current Plan
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.name} • {subscription?.status || "unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires:{" "}
                  {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "No expiry set"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">School</p>
                <p className="font-semibold">{schoolName}</p>
                <p className="text-sm text-muted-foreground">{schoolEmail}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-[2rem] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-6 shadow-[0_18px_45px_rgba(1,16,39,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live Paystack pricing</p>
              <h2 className="text-2xl font-bold text-foreground">
                {currentFrontendPlan === "payg"
                  ? "Pay-As-You-Go"
                  : currentFrontendPlan === "basic"
                    ? "Basic"
                    : currentFrontendPlan === "premium"
                      ? "Premium"
                      : "Pay-As-You-Go"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Calculated from {teacherCount} teacher{teacherCount === 1 ? "" : "s"} and {streamCount} stream{streamCount === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Real price at a glance</p>
              <p className="text-4xl font-black text-primary">{`KES ${pricingSnapshot.calculated_price.toLocaleString()}`}</p>
              <p className="text-xs text-muted-foreground">
                {currentFrontendPlan === "payg"
                  ? "Charged per timetable generation."
                  : "Displayed using the same Paystack-backed pricing logic."}
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-6 shadow-[0_18px_45px_rgba(1,16,39,0.06)]">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-bold text-foreground">Payment setup</h2>
            <p className="text-sm text-muted-foreground">
              Choose your payment method and confirm your billing contact details before checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold">Payment Method</label>
              <div className="grid gap-2">
                {PAYMENT_CHANNELS.map((channel) => (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => setPaymentChannel(channel.value)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      paymentChannel === channel.value
                        ? "border-primary bg-white shadow-[0_12px_30px_rgba(1,16,39,0.08)]"
                        : "border-border bg-white/70 hover:border-primary/40"
                    }`}
                  >
                    <div className="font-semibold">{channel.label}</div>
                    <div className="text-xs text-muted-foreground">{channel.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">School Email</label>
              <Input value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder="you@school.com" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Phone Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" />
            </div>
          </div>
        </Card>

        <PricingSection
          showHeading={false}
          compact
          currentPlan={currentFrontendPlan}
          defaultTeacherCount={teacherCount}
          defaultStreamCount={streamCount}
          onSelectPlan={handleBillingPlanSelect}
          getPlanAction={getBillingPlanAction}
          className="bg-transparent"
        />

        <Card className="rounded-[2rem] border-primary/10 bg-white/95 p-6 shadow-[0_18px_45px_rgba(1,16,39,0.06)]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-xl font-bold text-primary">
              <ReceiptText className="h-5 w-5" />
              Payment History
            </h3>
            <Button variant="outline" size="sm" onClick={() => void fetchSubscription()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading payment history...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No payment history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</div>
                    <div>{item.metadata?.reference || item.metadata?.plan_type || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
