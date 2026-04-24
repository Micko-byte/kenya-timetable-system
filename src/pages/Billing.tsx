import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  Loader2,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BILLING_PLANS, type BillingPlanType } from "@/lib/billingPlans";
import {
  isValidKenyanMobileMoneyPhone,
  normalizeKenyanPhoneNumber,
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

      const [{ data: schoolData }, { data: subData }, { data: activityData }] = await Promise.all([
        supabase.from("schools").select("name").eq("id", profile.school_id).single(),
        supabase.from("subscriptions").select("*").eq("school_id", profile.school_id).single(),
        supabase
          .from("activity_logs")
          .select("id, title, description, created_at, metadata")
          .eq("school_id", profile.school_id)
          .eq("activity_type", "payment")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setSchoolName(schoolData?.name || "ElimuTime School");
      setSubscription(subData);
      setHistory((activityData || []) as PaymentLog[]);
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

      const { authorization_url } = await paystackApi.initializePayment({
        schoolId,
        schoolName,
        email: schoolEmail,
        planType,
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

  const planCards: Array<{
    type: BillingPlanType;
    icon: typeof Zap;
    color: string;
    cta: string;
  }> = [
    { type: "starter", icon: Zap, color: "bg-secondary", cta: "Subscribe" },
    { type: "growth", icon: Crown, color: "bg-accent", cta: "Subscribe" },
    { type: "international", icon: Crown, color: "bg-primary", cta: "Subscribe" },
  ];

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

        <Card className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold">Payment Method</label>
              <div className="grid gap-2">
                {PAYMENT_CHANNELS.map((channel) => (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => setPaymentChannel(channel.value)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      paymentChannel === channel.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {planCards.map((plan, index) => {
            const planDetails = BILLING_PLANS[plan.type];
            const isCurrent = subscription?.plan_type === plan.type;
            return (
              <Card
                key={plan.type}
                className={`relative animate-slide-up p-6 card-hover ${isCurrent ? "ring-2 ring-primary" : ""}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isCurrent && <Badge className="absolute right-4 top-4 bg-success">Current Plan</Badge>}

                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${plan.color}`}>
                  <plan.icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mb-2 text-2xl font-bold text-foreground">{planDetails.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{planDetails.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">
                    {`KES ${(planDetails.amount / 100).toLocaleString()}`}
                  </span>
                  <span className="text-sm text-muted-foreground">/{planDetails.period}</span>
                </div>

                <ul className="mb-6 space-y-3">
                  {planDetails.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => void startCheckout(plan.type as PaystackPlanType)}
                  disabled={checkingOut === plan.type || loading || isCurrent || !schoolId}
                  className={`w-full ${isCurrent ? "" : "gradient-primary text-white hover:opacity-90"}`}
                >
                  {checkingOut === plan.type ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    plan.cta
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 gradient-secondary">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-primary">
            <WalletCards className="h-5 w-5" />
            Paystack Flow
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 font-semibold">1. Select</p>
              <p className="text-sm text-muted-foreground">
                Pick a plan and choose your payment method on this page.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 font-semibold">2. Redirect</p>
              <p className="text-sm text-muted-foreground">
                Paystack opens its hosted checkout page and handles the payment securely.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 font-semibold">3. Verify</p>
              <p className="text-sm text-muted-foreground">
                After payment, the reference is verified and the subscription updates automatically.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
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
