import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  ReceiptText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BILLING_PLANS, type BillingPlanType } from "@/lib/billingPlans";

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

const Billing = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PaymentLog[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanType | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  useEffect(() => {
    void fetchSubscription();
  }, [navigate]);

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
            Review your subscription, compare plans, and manage access for timetable exports.
          </p>
        </div>

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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {planCards.map((plan, index) => {
            const planDetails = BILLING_PLANS[plan.type];
            const isCurrent = subscription?.plan_type === plan.type;
            return (
              <Card
                key={plan.type}
                className={`relative p-6 card-hover animate-slide-up ${isCurrent ? "ring-2 ring-primary" : ""}`}
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
                  onClick={() => {
                    setSelectedPlan(plan.type);
                    setPlanDialogOpen(true);
                  }}
                  disabled={loading || isCurrent || !schoolId}
                  className={`w-full ${isCurrent ? "" : "gradient-primary text-white hover:opacity-90"}`}
                >
                  {isCurrent ? "Current Plan" : plan.cta}
                </Button>
              </Card>
            );
          })}
        </div>

        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Plan selection saved</DialogTitle>
              <DialogDescription>
                {selectedPlan
                  ? `${BILLING_PLANS[selectedPlan].name} is ready for ${schoolName || "your school"}.`
                  : "Your plan selection is ready."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="border-primary/10 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">Billing contact</p>
                <p className="mt-1 text-sm text-muted-foreground">{schoolEmail || "No billing email available"}</p>
              </Card>

              <p className="text-sm text-muted-foreground">
                Billing is now managed from your subscription records in ElimuTime. Once your school subscription is marked active, PDF and Excel downloads unlock automatically across the app.
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPlanDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  className="flex-1 gradient-primary text-white"
                  onClick={() => {
                    setPlanDialogOpen(false);
                    toast.success("Plan selection noted. Activate the subscription record to unlock exports.");
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
