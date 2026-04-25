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
    amount: 50000,
    period: "per term",
    description: "A term-based plan for schools within standard staffing limits.",
    features: [
      "Up to 33 teachers included",
      "Up to 27 streams included",
      "Unlimited timetable generations within the term",
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
    name: "Premium",
    amount: 249900,
    period: "per term",
    description: "Best for larger schools that need unlimited access and upgrades.",
    features: [
      "Unlimited teachers",
      "Unlimited streams",
      "Unlimited timetable generations",
      "Master timetable access",
      "Early access to system upgrades",
    ],
  },
};
