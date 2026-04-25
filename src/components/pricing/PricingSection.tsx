import { PricingCalculator } from "@/components/pricing/PricingCalculator";
import { type FrontendPlanType, type PricingSnapshot } from "@/lib/planSelection";
import { cn } from "@/lib/utils";

interface PricingSectionProps {
  onSelectPlan: (planType: FrontendPlanType, snapshot: PricingSnapshot) => void;
  showHeading?: boolean;
  sectionId?: string;
  className?: string;
  compact?: boolean;
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

export const PricingSection = ({
  onSelectPlan,
  showHeading = true,
  sectionId,
  className,
  compact = false,
  currentPlan,
  getPlanAction,
}: PricingSectionProps) => {
  return (
    <section
      id={sectionId}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-white",
        showHeading ? "scroll-mt-28" : "",
        className,
      )}
    >
      {showHeading && (
        <>
          <div className="brand-grid-bg pointer-events-none absolute inset-0 z-0 opacity-100" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.07),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.96))]" />
        </>
      )}

      <div className={cn("container relative z-10 mx-auto px-4", compact ? "py-2" : "py-20")}>
        {showHeading && (
          <div className="mb-12 space-y-4 text-center">
            <h2 className="text-4xl font-bold text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the perfect plan for your school</p>
          </div>
        )}

        <PricingCalculator onSelectPlan={onSelectPlan} currentPlan={currentPlan} getPlanAction={getPlanAction} />
      </div>
    </section>
  );
};
