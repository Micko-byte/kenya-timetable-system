import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Check, Crown, Zap, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
}

const Billing = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    fetchSubscription();
  }, [navigate]);

  const fetchSubscription = async () => {
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

    if (profile) {
      setSchoolId(profile.school_id);

      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("school_id", profile.school_id)
        .single();

      setSubscription(subData);
    }
  };

  const handleUpgrade = async (planType: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType,
          status: "active",
          expires_at: null,
        })
        .eq("school_id", schoolId);

      if (error) throw error;

      toast.success("Plan updated successfully! 🎉");
      fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    }
  };

  const plans = [
    {
      name: "Free Trial",
      price: "KES 0",
      period: "14 days",
      icon: Zap,
      color: "bg-muted",
      features: [
        "Up to 5 teachers",
        "Up to 3 streams",
        "Basic timetable generation",
        "Email support",
      ],
      planType: "free_trial",
    },
    {
      name: "Basic",
      price: "KES 2,500",
      period: "per month",
      icon: Check,
      color: "bg-success",
      features: [
        "Up to 20 teachers",
        "Unlimited streams",
        "AI timetable generation",
        "Priority email support",
        "Export to PDF",
      ],
      planType: "basic",
    },
    {
      name: "Premium",
      price: "KES 5,000",
      period: "per month",
      icon: Crown,
      color: "bg-primary",
      features: [
        "Unlimited teachers",
        "Unlimited streams",
        "Advanced AI optimization",
        "Priority support",
        "Export to PDF/Excel",
        "Email timetables to teachers",
        "Custom branding",
      ],
      planType: "premium",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
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
            Choose the plan that works best for your school
          </p>
        </div>

        {subscription && (
          <Card className="p-6 gradient-accent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  📋 Current Plan
                </h3>
                <p className="text-sm text-muted-foreground">
                  Plan:{" "}
                  <span className="font-semibold capitalize">
                    {subscription.plan_type.replace("_", " ")}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Status:{" "}
                  <Badge
                    variant={
                      subscription.status === "active" ? "default" : "secondary"
                    }
                  >
                    {subscription.status}
                  </Badge>
                </p>
                {subscription.expires_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires:{" "}
                    {new Date(subscription.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`p-6 card-hover animate-slide-up relative ${
                subscription?.plan_type === plan.planType
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {subscription?.plan_type === plan.planType && (
                <Badge className="absolute top-4 right-4 bg-success">
                  Current Plan
                </Badge>
              )}

              <div
                className={`w-12 h-12 ${plan.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <plan.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-2">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-primary">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-sm">
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(plan.planType)}
                disabled={subscription?.plan_type === plan.planType}
                className={`w-full ${
                  subscription?.plan_type === plan.planType
                    ? ""
                    : "gradient-primary text-white hover:opacity-90"
                }`}
              >
                {subscription?.plan_type === plan.planType
                  ? "Current Plan"
                  : "Upgrade"}
              </Button>
            </Card>
          ))}
        </div>

        <Card className="p-6 gradient-secondary">
          <h3 className="text-xl font-bold text-primary mb-4">
            💳 Payment Methods
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">M-Pesa Paybill</p>
              <p className="text-sm text-muted-foreground">
                Paybill: <span className="font-semibold">123456</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Account: Your School ID
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">Bank Transfer</p>
              <p className="text-sm text-muted-foreground">
                Bank: Example Bank
              </p>
              <p className="text-sm text-muted-foreground">
                Account: 1234567890
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="font-semibold mb-2">Card Payment</p>
              <p className="text-sm text-muted-foreground">
                Secure payment via Stripe
              </p>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                Add Card
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold text-primary mb-4">
            📜 Payment History
          </h3>
          <div className="text-center py-8 text-muted-foreground">
            <p>No payment history yet</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;