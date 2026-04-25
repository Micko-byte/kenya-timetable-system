import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildPricingSnapshot,
  type FrontendPlanType,
  type PricingSnapshot,
} from "@/lib/planSelection";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    type: "payg" as const,
    name: "Pay-As-You-Go",
    description: "Pay only when you generate a timetable.",
    features: ["No limits", "No subscription", "Charged every timetable generation"],
    color: "purple",
  },
  {
    type: "basic" as const,
    name: "Basic",
    description: "A term-based plan for schools within standard staffing limits.",
    features: [
      "KES 500 per term",
      "Up to 33 teachers included",
      "Up to 27 streams included",
      "Unlimited timetable generations within the term",
    ],
    color: "orange",
  },
  {
    type: "premium" as const,
    name: "Premium",
    description: "Best for larger schools that need unlimited access and upgrades.",
    features: [
      "Unlimited teachers",
      "Unlimited streams",
      "Unlimited timetable generations",
      "Master timetable access",
      "Early access to system upgrades",
    ],
    color: "blue",
  },
] satisfies Array<{
  type: FrontendPlanType;
  name: string;
  description: string;
  features: string[];
  color: "purple" | "orange" | "blue";
}>;

const termlyCardClasses: Record<string, string> = {
  purple: "bg-gradient-to-br from-secondary/14 via-white to-white border-secondary/20",
  orange: "bg-gradient-to-br from-accent/14 via-white to-white border-accent/20",
  blue: "bg-gradient-to-br from-primary/14 via-white to-white border-primary/20",
};

const planAccentClasses: Record<string, { price: string; button: string; bullet: string; banner: string }> = {
  purple: {
    price: "text-secondary",
    button: "bg-secondary text-white hover:bg-secondary/90",
    bullet: "text-secondary",
    banner: "bg-secondary text-white",
  },
  orange: {
    price: "text-accent",
    button: "bg-accent text-white hover:bg-accent/90",
    bullet: "text-accent",
    banner: "bg-accent text-white",
  },
  blue: {
    price: "text-primary",
    button: "bg-primary text-white hover:bg-primary/90",
    bullet: "text-primary",
    banner: "bg-primary text-white",
  },
};

const normalizeCount = (value: string) => {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
};

const formatPrice = (value: number) => `KES ${value.toLocaleString()}`;

interface PricingCalculatorProps {
  onSelectPlan: (planType: FrontendPlanType, snapshot: PricingSnapshot) => void;
  currentPlan?: FrontendPlanType | null;
  getPlanAction?: (
    planType: FrontendPlanType,
    snapshot: PricingSnapshot,
    isCurrent: boolean,
  ) => {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const PricingCalculator = ({ onSelectPlan, currentPlan, getPlanAction }: PricingCalculatorProps) => {
  const [teachers, setTeachers] = useState("0");
  const [streams, setStreams] = useState("0");

  const teacherCount = normalizeCount(teachers);
  const streamCount = normalizeCount(streams);

  const pricing = useMemo(() => buildPricingSnapshot("payg", teacherCount, streamCount), [streamCount, teacherCount]);

  const recommendedPlan: FrontendPlanType = useMemo(() => {
    if (pricing.paygPrice > 2000 || pricing.basicPrice > 2000) {
      return "premium";
    }

    if (pricing.paygPrice < pricing.basicPrice) {
      return "payg";
    }

    if (!pricing.basicHasOverage) {
      return "basic";
    }

    return "premium";
  }, [pricing.basicHasOverage, pricing.basicPrice, pricing.paygPrice]);

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <h3 className="text-2xl font-bold text-foreground">Estimated cost based on your inputs</h3>
        <p className="text-sm text-muted-foreground">
          Enter your teacher and stream counts to compare Pay-As-You-Go, Basic, and Premium in real time.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-4 rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))] p-5 shadow-[0_18px_45px_rgba(1,16,39,0.06)] md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pricing-teachers" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Number of Teachers
          </Label>
          <Input
            id="pricing-teachers"
            type="number"
            min={0}
            inputMode="numeric"
            value={teachers}
            onChange={(event) => setTeachers(String(normalizeCount(event.target.value)))}
            className="h-12 rounded-2xl border-primary/10 bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-streams" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Number of Streams
          </Label>
          <Input
            id="pricing-streams"
            type="number"
            min={0}
            inputMode="numeric"
            value={streams}
            onChange={(event) => setStreams(String(normalizeCount(event.target.value)))}
            className="h-12 rounded-2xl border-primary/10 bg-white"
          />
        </div>
      </div>

      {pricing.basicHasOverage && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground">
          Your school exceeds Basic plan limits. Extra charges applied.
        </div>
      )}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
        {PLANS.map((plan) => {
          const accent = planAccentClasses[plan.color];
          const isCurrent = currentPlan === plan.type;
          const isRecommended = recommendedPlan === plan.type;
          const price =
            plan.type === "payg"
              ? pricing.paygPrice
              : plan.type === "basic"
                ? pricing.basicPrice
                : pricing.premiumPrice;

          const snapshot = buildPricingSnapshot(plan.type, teacherCount, streamCount);
          const action = getPlanAction?.(plan.type, snapshot, isCurrent);

          return (
            <Card
              key={plan.type}
              className={cn(
                "relative flex h-full flex-col p-8 shadow-lg transition-all",
                termlyCardClasses[plan.color],
                isCurrent ? "ring-2 ring-primary ring-offset-4 ring-offset-white" : "",
                isRecommended ? "border-2 border-primary md:scale-[1.02]" : "",
              )}
            >
              {isRecommended && (
                <Badge className={cn("absolute right-4 top-4", accent.banner)}>Recommended</Badge>
              )}
              {isCurrent && <Badge className="absolute left-4 top-4 bg-foreground text-white">Selected</Badge>}

              <div className="flex h-full flex-col">
                <h3 className="mb-2 text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="mb-6 text-muted-foreground">{plan.description}</p>

                <div className="mb-6 rounded-3xl border border-primary/10 bg-white/70 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {plan.type === "payg" ? "Per generation" : "Per term"}
                  </p>
                  <p className={cn("mt-2 text-4xl font-bold", accent.price)}>{formatPrice(price)}</p>
                  {plan.type === "basic" && pricing.basicHasOverage && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Includes KES {pricing.basicBasePrice.toLocaleString()} base price plus extra teachers and streams.
                    </p>
                  )}
                  {plan.type === "premium" && (
                    <p className="mt-2 text-xs text-muted-foreground">Fixed price with unlimited school capacity.</p>
                  )}
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className={accent.bullet}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={action ? action.onClick : () => onSelectPlan(plan.type, snapshot)}
                  disabled={action?.disabled}
                  className={cn("mt-auto w-full rounded-full font-semibold", accent.button)}
                >
                  {action?.label || (isCurrent ? "Selected" : "Select Plan")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
