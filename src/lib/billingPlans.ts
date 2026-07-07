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
    name: "Term Plan",
    amount: 79900,
    period: "per term",
    description: "Best for mid-size schools needing unlimited regenerations throughout the term.",
    features: [
      "Up to 40 teachers",
      "Up to 30 streams",
      "Unlimited regenerations",
      "PDF, Excel & PNG export",
      "Priority support",
    ],
  },
  growth: {
    name: "Legacy Pro",
    amount: 750000,
    period: "per term",
    description: "Legacy plan kept for older subscriptions still linked to Paystack records.",
    features: ["Legacy pricing support", "Existing account continuity"],
  },
  international: {
    name: "Annual Plan",
    amount: 349900,
    period: "per year",
    description: "Ideal for large schools wanting the full platform all year with no per-term billing.",
    features: [
      "Unlimited teachers",
      "Unlimited streams",
      "Unlimited regenerations",
      "Master timetable view",
      "Early access to upgrades",
      "All export formats",
    ],
  },
};
