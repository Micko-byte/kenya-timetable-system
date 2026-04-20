import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { PAYSTACK_PLANS, paystackApi, type PaymentChannel, type PaystackPlanType } from "@/lib/paystack";

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

  useEffect(() => {
    void fetchSubscription();
  }, [navigate]);

  const currentPlan = useMemo(
    () =>
      subscription?.plan_type && subscription.plan_type in PAYSTACK_PLANS
        ? PAYSTACK_PLANS[subscription.plan_type as PaystackPlanType]
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



    try {
      setCheckingOut(planType);

      const amount = PAYSTACK_PLANS[planType].amount;
      const { reference } = await paystackApi.initializePayment({
        schoolId,
        schoolName,
        email: schoolEmail,
        planType,
        paymentChannel,
        phone: phone || undefined,
      });

      await paystackApi.openInlineCheckout({
        reference,
        email: schoolEmail,
        amount,
        currency: "KES",
        channels: [paymentChannel],
        metadata: {
          school_id: schoolId,
          school_name: schoolName,
          plan_type: planType,
          payment_channel: paymentChannel,
          phone: phone || undefined,
        },
        onSuccess: async (transaction) => {
          await verifyReference(String(transaction.reference || reference));
        },
        onCancel: () => toast.info("Payment was cancelled."),
        onError: (error) => toast.error(error.message || "Paystack checkout failed"),
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setCheckingOut(null);
    }
  };

  const planCards: Array<{
    type: PaystackPlanType;
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
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
            <CreditCard className="w-8 h-8" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground">
            Pick a plan, choose card or mobile money, and complete payment inside the app.
          </p>
        </div>

        {verifyingReference && (
          <Card className="p-4 border-primary/20 bg-primary/5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm">Verifying payment reference {verifyingReference}...</p>
          </Card>
        )}

        {currentPlan && (
          <Card className="p-6 gradient-accent">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-semibold mb-2 block">Payment Method</label>
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
              <label className="text-sm font-semibold mb-2 block">School Email</label>
              <Input value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder="you@school.com" />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Phone Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2547XXXXXXXX" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planCards.map((plan, index) => {
            const planDetails = PAYSTACK_PLANS[plan.type];
            const isCurrent = subscription?.plan_type === plan.type;
            return (
              <Card
                key={plan.type}
                className={`p-6 card-hover animate-slide-up relative ${isCurrent ? "ring-2 ring-primary" : ""}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {isCurrent && <Badge className="absolute top-4 right-4 bg-success">Current Plan</Badge>}

                <div className={`w-12 h-12 ${plan.color} rounded-lg flex items-center justify-center mb-4`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-2">{planDetails.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{planDetails.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary">
                    {`KES ${(planDetails.amount / 100).toLocaleString()}`}
                  </span>
                  <span className="text-muted-foreground text-sm">/{planDetails.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {planDetails.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => startCheckout(plan.type)}
                  disabled={checkingOut === plan.type || loading || isCurrent || !schoolId}
                  className={`w-full ${isCurrent ? "" : "gradient-primary text-white hover:opacity-90"}`}
                >
                  {checkingOut === plan.type ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
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
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <WalletCards className="w-5 h-5" />
            Paystack Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">1. Reserve</p>
              <p className="text-sm text-muted-foreground">
                The app stores a pending payment row in Supabase before the Paystack popup opens.
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">2. Pay In App</p>
              <p className="text-sm text-muted-foreground">
                Paystack opens in a popup with card or mobile money, so the user stays on this page.
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">3. Verify</p>
              <p className="text-sm text-muted-foreground">
                The verification function confirms the transaction and activates the subscription.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <ReceiptText className="w-5 h-5" />
              Payment History
            </h3>
            <Button variant="outline" size="sm" onClick={() => fetchSubscription()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading payment history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-border flex items-start justify-between gap-4">
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


