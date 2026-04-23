export type BillingPlanType = "starter" | "growth" | "international";

export interface BillingPlan {
  name: string;
  amount: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const BILLING_PLANS: Record<BillingPlanType, BillingPlan> = {
  starter: {
    name: "Basic",
    amount: 350000,
    period: "per term",
    description: "A streamlined plan for growing schools that need essential timetable tools.",
    features: ["Up to 20 classes", "1 admin user", "PDF export", "Email support"],
  },
  growth: {
    name: "Pro",
    amount: 750000,
    period: "per term",
    description: "Balanced capacity for active teams managing multiple streams and exports.",
    features: ["Up to 50 classes", "3 admin users", "Excel export", "Priority support"],
    popular: true,
  },
  international: {
    name: "Premium",
    amount: 1800000,
    period: "per term",
    description: "Full access for larger schools that need scale, support, and flexibility.",
    features: ["Unlimited classes", "Unlimited users", "Teacher view tools", "Custom onboarding"],
  },
};
