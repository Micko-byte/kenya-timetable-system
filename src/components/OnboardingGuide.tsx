import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  completeSchoolOnboardingTour,
  hydrateSchoolOnboardingTour,
  ONBOARDING_STEPS,
} from "@/lib/onboardingTour";

interface OnboardingGuideProps {
  schoolId: string;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findVisibleTarget(targetId: string) {
  const matches = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`));
  return (
    matches.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || null
  );
}

export const OnboardingGuide = ({ schoolId }: OnboardingGuideProps) => {
  const location = useLocation();
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tourState, setTourState] = useState(() => hydrateSchoolOnboardingTour(schoolId));

  useEffect(() => {
    setTourState(hydrateSchoolOnboardingTour(schoolId));
  }, [location.pathname, refreshKey, schoolId]);

  useEffect(() => {
    const handleStorage = () => {
      setTourState(hydrateSchoolOnboardingTour(schoolId));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, [schoolId]);

  const state = tourState;
  const currentStep = useMemo(
    () =>
      state.active && !state.completed
        ? ONBOARDING_STEPS.find((step) => step.id === state.currentStepId && step.route === location.pathname) || null
        : null,
    [location.pathname, state.active, state.completed, state.currentStepId],
  );

  useEffect(() => {
    if (!currentStep) {
      setRect(null);
      return;
    }

    let animationFrame = 0;
    let timeoutId = 0;

    const updateRect = () => {
      const target = findVisibleTarget(currentStep.targetId);
      if (!target) {
        timeoutId = window.setTimeout(updateRect, 150);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      setRect({
        top: Math.max(12, targetRect.top - 8),
        left: Math.max(12, targetRect.left - 8),
        width: targetRect.width + 16,
        height: targetRect.height + 16,
      });
    };

    animationFrame = window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [currentStep, location.pathname]);

  if (!currentStep || !rect) {
    return null;
  }

  const cardTop = Math.min(rect.top + rect.height + 20, window.innerHeight - 220);
  const cardLeft = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - 380));

  const handleUseStep = () => {
    const target = findVisibleTarget(currentStep.targetId);
    target?.click();
    window.setTimeout(() => setRefreshKey((value) => value + 1), 120);
  };

  const handleSkip = () => {
    completeSchoolOnboardingTour(schoolId);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <div
        className="absolute rounded-[1.75rem] border-2 border-primary shadow-[0_0_0_9999px_rgba(1,16,39,0.45)] transition-all duration-200"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />

      <div
        className="pointer-events-auto absolute w-[min(360px,calc(100vw-2rem))] rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-[0_24px_60px_rgba(1,16,39,0.18)]"
        style={{
          top: cardTop,
          left: cardLeft,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Guided setup</p>
        <h3 className="mt-2 text-xl font-bold text-foreground">{currentStep.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentStep.description}</p>

        <div className="mt-5 flex items-center gap-2">
          <Button onClick={handleUseStep} className="rounded-full gradient-primary text-white hover:opacity-90">
            {currentStep.actionLabel}
          </Button>
          <Button variant="outline" onClick={handleSkip} className="rounded-full border-primary/15">
            Skip guide
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Step {ONBOARDING_STEPS.findIndex((step) => step.id === currentStep.id) + 1} of {ONBOARDING_STEPS.length}
        </p>
      </div>
    </div>
  );
};
