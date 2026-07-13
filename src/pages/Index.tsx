import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  X,
  Building2,
  Users,
  Clock,
  Workflow,
  PencilLine,
  Share2,
} from "lucide-react";

import logo from "@/assets/logo-transparent.png";
import heroImage from "@/assets/hero.png";
import demoGif from "@/assets/demo.gif";
import { Header } from "@/components/Header";
import { PricingSection } from "@/components/pricing/PricingSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { startPendingOnboardingTour } from "@/lib/onboardingTour";
import { setSelectedFrontendPlan, type FrontendPlanType, type PricingSnapshot } from "@/lib/planSelection";

const HERO_WORDS = ["fast.", "accurate.", "effortless."];

const planAccentClasses: Record<string, { price: string; button: string }> = {
  purple: {
    price: "text-secondary",
    button: "bg-secondary text-white hover:bg-secondary/90",
  },
  orange: {
    price: "text-accent",
    button: "bg-accent text-white hover:bg-accent/90",
  },
  blue: {
    price: "text-primary",
    button: "bg-primary text-white hover:bg-primary/90",
  },
};

const SWITCH_ROWS = [
  {
    label: "Time to build a timetable",
    before: "Two to three weeks of late nights",
    after: "A first draft ready in minutes",
  },
  {
    label: "Teacher clashes",
    before: "Found out the hard way on Monday morning",
    after: "Caught and resolved before you publish",
  },
  {
    label: "Room conflicts",
    before: "Tracked by hand on a whiteboard",
    after: "Flagged and fixed automatically",
  },
  {
    label: "Version history",
    before: "spreadsheet_FINAL_v8_useThisOne.xlsx",
    after: "Every version saved, with a full audit trail",
  },
  {
    label: "Substitute management",
    before: "Frantic phone calls at 6am",
    after: "A ranked list of substitutes, one tap away",
  },
  {
    label: "Optimisation",
    before: "Whatever you had time to manage",
    after: "Multiple optimisation passes, scored for quality",
  },
  {
    label: "Parent visibility",
    before: "Printed Friday, lost by Monday",
    after: "Always current, right in the parent app",
  },
  {
    label: "Publishing",
    before: "Photocopies pinned to a noticeboard",
    after: "Pushed instantly to teachers, parents and students",
  },
  {
    label: "Mid-term updates",
    before: "Passed along by word of mouth",
    after: "Sent straight away as a notification",
  },
  {
    label: "Day-to-day management",
    before: "Rebuilt by hand every time something changes",
    after: "Runs as a living, always up-to-date system",
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    title: "Set up your school",
    description:
      "Add your school's streams and class groups first. This gives the system the structure it needs for every timetable.",
    icon: Building2,
    iconBg: "bg-primary",
  },
  {
    title: "Add teachers and subjects",
    description:
      "Enter teacher names and the subjects they teach. Link teachers to the streams or classes they cover.",
    icon: Users,
    iconBg: "bg-secondary",
  },
  {
    title: "Define your school day",
    description:
      "Set how many periods you have and where breaks fall. This includes your bell times, lesson slots, and break schedule.",
    icon: Clock,
    iconBg: "bg-accent",
  },
  {
    title: "Generate the timetable",
    description: "Run the timetable engine once your data is ready. ElimuTime builds a clash-free schedule automatically.",
    icon: Workflow,
    iconBg: "bg-primary",
  },
  {
    title: "Review and adjust",
    description:
      "Check the generated timetable and make edits if needed. Update teacher assignments, move classes, or fine-tune the layout.",
    icon: PencilLine,
    iconBg: "bg-secondary",
  },
  {
    title: "Export and share",
    description:
      "Save the timetable as PDF or Excel, or publish it for staff. Share the final schedule with teachers and students.",
    icon: Share2,
    iconBg: "bg-accent",
  },
] as const;

const Index = () => {
  const navigate = useNavigate();
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [typedWord, setTypedWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const stepIconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };

    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    const currentWord = HERO_WORDS[heroWordIndex];
    const atWordEnd = typedWord === currentWord;
    const atWordStart = typedWord === "";

    const timeout = window.setTimeout(
      () => {
        if (!isDeleting) {
          if (atWordEnd) {
            setIsDeleting(true);
            return;
          }

          setTypedWord(currentWord.slice(0, typedWord.length + 1));
          return;
        }

        if (atWordStart) {
          setIsDeleting(false);
          setHeroWordIndex((current) => (current + 1) % HERO_WORDS.length);
          return;
        }

        setTypedWord(currentWord.slice(0, typedWord.length - 1));
      },
      !isDeleting && !atWordEnd ? 120 : !isDeleting && atWordEnd ? 1100 : 70,
    );

    return () => window.clearTimeout(timeout);
  }, [heroWordIndex, isDeleting, typedWord]);

  // Drives the "path" animation on the How It Works timeline: tracks how far
  // the line should fill and which step icon counts as currently active.
  useEffect(() => {
    let frame: number | null = null;

    const updateTimelineProgress = () => {
      const timelineEl = timelineRef.current;
      if (!timelineEl) return;

      const rect = timelineEl.getBoundingClientRect();
      const anchor = window.innerHeight * 0.55;

      const rawProgress = (anchor - rect.top) / rect.height;
      setTimelineProgress(Math.min(Math.max(rawProgress, 0), 1));

      let active = 0;
      stepIconRefs.current.forEach((iconEl, index) => {
        if (!iconEl) return;
        const iconRect = iconEl.getBoundingClientRect();
        const iconCenter = iconRect.top + iconRect.height / 2;
        if (iconCenter <= anchor) {
          active = index;
        }
      });
      setActiveStepIndex(active);
    };

    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        updateTimelineProgress();
        frame = null;
      });
    };

    updateTimelineProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleSelectPlan = (planType: FrontendPlanType, snapshot: PricingSnapshot) => {
    setSelectedFrontendPlan(planType, undefined, snapshot);
    startPendingOnboardingTour();
    navigate("/signup");
  };

  return (
    <div className="relative overflow-y-auto scroll-smooth bg-transparent">
      <Header />

      <div className="relative isolate">
        <div
          className="brand-grid-bg-strong pointer-events-none absolute inset-x-0 top-0 bottom-0 z-0"
          style={{
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.58) 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.58) 82%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_26%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.86)_68%,rgba(255,255,255,1)_100%)]" />

        <section className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden bg-transparent pt-24 md:pt-10">
          <div className="container relative z-10 mx-auto px-4 py-12 md:py-10">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold leading-tight text-foreground md:text-6xl">
                    Your timetable,
                    <br />
                    <span className="inline-flex min-h-[1.2em] items-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                      {typedWord}
                      <span
                        className="ml-1 inline-block h-[0.95em] w-[3px] animate-pulse rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    </span>
                  </h1>
                  <p className="text-xl leading-relaxed text-muted-foreground">
                    Built for Kenyan Schools and CBC Scheduling.
Create complete, conflict-free timetables in minutes. Manage teachers, classrooms, subjects, and lesson schedules from one platform.
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="gap-2 rounded-full bg-primary px-8 py-6 text-base font-semibold text-white transition-all hover:bg-primary/90"
                >
                  Enroll Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="relative flex h-full items-end justify-center animate-fade-in">
                <img
                  src={heroImage}
                  alt="School timetable preview"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-auto max-h-[360px] w-full max-w-[320px] rounded-2xl object-contain md:max-h-[760px] md:max-w-[700px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 flex items-center justify-center overflow-hidden bg-transparent">
          <div
            className="logo-grid-bg pointer-events-none absolute inset-0 opacity-100"
            style={{
              maskImage:
                "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.1) 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 25%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 75%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-transparent" />
          <div className="container mx-auto px-4 py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 overflow-hidden rounded-2xl bg-muted/90 shadow-[0_18px_45px_rgba(1,16,39,0.08)] backdrop-blur-sm">
                <img src={demoGif} alt="ElimuTime product demo" loading="lazy" decoding="async" className="h-auto w-full object-cover" />
                <div className="hidden">
                  <div className="mb-4 text-4xl" aria-hidden="true">
                    ▶
                  </div>
                  <p className="text-muted-foreground">Product video coming soon</p>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">Watch it build.</h2>
            </div>
          </div>
        </section>

<section className="relative flex items-center justify-center overflow-hidden bg-transparent py-12">
  <div className="container relative z-10 mx-auto px-4 py-20">
    <div className="rounded-[2rem] border border-white/10 bg-[#0A1628] p-10 md:p-14">
      <div className="mb-6 flex items-center justify-center">
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-bold leading-[1.15] text-white md:text-5xl">
          From spreadsheet chaos to
          <span className="mt-2 block text-primary">
            intelligent timetabling
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/50">
          Schools don't just need a timetable. They need a living system that
          adapts daily, prevents conflicts, and keeps every stakeholder informed.
        </p>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {/* Excel column */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15">
              <X className="h-5 w-5 text-rose-400" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.15em] text-rose-500">
              Traditional
            </span>
          </div>

          <h3 className="mb-2 text-xl font-semibold text-black">
            Excel & Manual
          </h3>

          <p className="text-sm leading-relaxed text-black">
            Two to three weeks of edits, whiteboards, spreadsheets, and
            late-night adjustments.
          </p>

          <div className="mt-6 space-y-3">
            {[
              "Teacher clashes discovered Monday morning",
              "Room conflicts tracked on whiteboards",
              "spreadsheet_FINAL_v8_useThisOne.xlsx",
              "Frantic 6am substitute phone calls",
              "Photocopies pinned to noticeboards",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 text-sm text-black"
              >
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400/70" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ElimuTime column */}
        <div className="rounded-2xl border border-primary/20 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Check className="h-5 w-5 text-primary" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              ElimuTime
            </span>
          </div>

          <h3 className="mb-2 text-xl font-semibold text-black">
            Intelligent System
          </h3>

          <p className="text-sm leading-relaxed text-black">
            Generates a complete timetable automatically and refines it when
            needed, in minutes.
          </p>

          <div className="mt-6 space-y-3">
            {[
              "Clashes caught and resolved before publishing",
              "Room conflicts flagged and fixed automatically",
              "Every version saved with a full audit trail",
              "Ranked substitute list, one tap away",
              "Pushed instantly to all stakeholders",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 text-sm text-black"
              >
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl font-bold text-primary md:text-4xl">
            Minutes
          </div>

          <div className="mt-1 text-sm text-black">
            to generate a timetable
          </div>

          <div className="mt-2 text-xs text-black">
            vs 2–3 weeks manually
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl font-bold text-secondary md:text-4xl">
            100%
          </div>

          <div className="mt-1 text-sm text-black">
            clash-free guarantee
          </div>

          <div className="mt-2 text-xs text-black">
            automated conflict resolution
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl font-bold text-accent md:text-4xl">
            Real-time
          </div>

          <div className="mt-1 text-sm text-black">
            updates across the school
          </div>

          <div className="mt-2 text-xs text-black">
            instant notifications to all
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <button
          onClick={() => navigate("/signup")}
          className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Ready to transform your timetabling?
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</section>

       <section className="relative flex items-center justify-center overflow-hidden bg-transparent">
  <div className="container relative z-10 mx-auto px-4 py-24">
    <div className="mx-auto max-w-5xl">
      <div className="mb-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          How it works
        </p>

        <h2 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
          From blank slate to
          <span className="block text-primary">
            published timetable
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Six simple steps take you from setting up your school to a finished
          schedule everyone can access. No spreadsheets. No guesswork.
        </p>
      </div>

      <div ref={timelineRef} className="relative mx-auto max-w-3xl">
        {/* Timeline Track */}
        <div
          className="absolute left-6 top-6 bottom-6 w-px bg-primary/15 md:left-7"
          aria-hidden="true"
        />

        {/* Animated Progress Line */}
        <div
          className="absolute left-6 top-6 bottom-6 w-px origin-top bg-primary transition-transform duration-150 ease-out md:left-7"
          style={{ transform: `scaleY(${timelineProgress})` }}
          aria-hidden="true"
        />

        <div className="space-y-12">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === activeStepIndex;
            const isUpcoming = index > activeStepIndex;

            return (
              <div key={step.title} className="relative flex gap-6">
                {/* Timeline Icon */}
                <div
                  ref={(el) => (stepIconRefs.current[index] = el)}
                  className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white transition-all duration-500 md:h-14 md:w-14 ${
                    isUpcoming
                      ? "bg-slate-200 text-slate-400"
                      : `${step.iconBg} shadow-lg`
                  } ${
                    isActive
                      ? "scale-110 ring-4 ring-primary/20"
                      : "scale-100"
                  }`}
                >
                  {isActive && (
                    <span
                      className="absolute -inset-1 rounded-full ring-2 ring-primary/30 motion-safe:animate-pulse"
                      aria-hidden="true"
                    />
                  )}

                  <StepIcon
                    className="h-5 w-5 md:h-6 md:w-6"
                    aria-hidden="true"
                  />
                </div>

                {/* Content Card */}
                <div
                  className={`flex-1 rounded-3xl border p-6 transition-all duration-500 ${
                    isActive
                      ? "border-primary/30 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.08)]"
                      : "border-white/40 bg-white/60 backdrop-blur-sm shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-300 ${
                      isUpcoming ? "text-slate-400" : "text-primary"
                    }`}
                  >
                    Step {index + 1}
                  </p>

                  <h3 className="mt-3 text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
</section>
</div>
      <PricingSection sectionId="pricing" onSelectPlan={handleSelectPlan} />

<footer className="bg-foreground py-12 text-white">
  <div className="container mx-auto px-4">
    <div className="mb-8 grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_0.9fr_0.9fr] md:items-start">
      {/* Logo + tagline */}
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <img src={logo} alt="ElimuTime" className="mb-4 h-16 w-auto" />
        <p className="text-white/70">Smart timetabling for modern schools</p>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center text-center md:items-start md:text-left">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Navigation</p>
        <nav className="flex flex-col gap-3">
          <a href="#compare" className="text-white/70 transition-colors hover:text-white">
            The Upgrade
          </a>
          <a href="#how-it-works" className="text-white/70 transition-colors hover:text-white">
            How it Works
          </a>
          <a href="#pricing" className="text-white/70 transition-colors hover:text-white">
            Pricing
          </a>
          <a href="/signup" className="text-white/70 transition-colors hover:text-white">
            Sign Up
          </a>
        </nav>
      </div>

{/* Connect */}
<div className="flex flex-col items-center text-center md:items-start md:text-left">
  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Connect</p>
  <div className="flex flex-col gap-3">
    <a href="mailto:notifytechgroup@gmail.com" className="text-white/70 transition-colors hover:text-white">
      Email us
    </a>
     <p className="text-white/70">
                Powered by{" "}
                <a href="https://notifyai.org/" className="font-semibold text-primary hover:underline">
                  Notify AI
                </a>
                </p>
  </div>
</div>
    </div>

    <div className="border-t border-white/10 pt-8 text-center text-sm text-white/60">
      <p>Crafted with precision for educational excellence</p>
      <p className="mt-3">&copy; 2026 ElimuTime. All rights reserved.</p>
    </div>
  </div>
</footer>
    </div>
  );
};

export default Index;