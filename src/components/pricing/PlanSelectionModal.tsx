import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type FrontendPlanType, type PricingSnapshot } from "@/lib/planSelection";

import { PricingSection } from "./PricingSection";

interface PlanSelectionModalProps {
  open: boolean;
  onSelectPlan: (planType: FrontendPlanType, snapshot: PricingSnapshot) => void;
  currentPlan?: FrontendPlanType | null;
}

export const PlanSelectionModal = ({ open, onSelectPlan, currentPlan }: PlanSelectionModalProps) => {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[92vh] max-w-7xl overflow-y-auto rounded-[2rem] border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))] p-4 sm:p-6 [&>button]:hidden"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-3 px-2 pt-2 text-center sm:px-4">
          <DialogTitle className="text-3xl font-bold text-foreground">Choose your plan to continue</DialogTitle>
          <DialogDescription className="mx-auto max-w-2xl text-base text-muted-foreground">
            Select a pricing option before using your dashboard. You can update your billing path later without leaving this flow.
          </DialogDescription>
        </DialogHeader>

        <PricingSection
          onSelectPlan={onSelectPlan}
          showHeading={false}
          compact
          currentPlan={currentPlan}
          className="bg-transparent"
        />
      </DialogContent>
    </Dialog>
  );
};
