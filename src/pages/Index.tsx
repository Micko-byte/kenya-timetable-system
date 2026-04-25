import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import logo from "@/assets/logo-transparent.png";
import heroImage from "@/assets/hero.png";
import demoGif from "@/assets/demo.gif";
import teacherIcon from "@/assets/feature-teacher.svg";
import streamIcon from "@/assets/feature-stream.svg";
import timetableIcon from "@/assets/feature-timetable.svg";
import { Header } from "@/components/Header";
import { PricingSection } from "@/components/pricing/PricingSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { startPendingOnboardingTour } from "@/lib/onboardingTour";
import { setSelectedFrontendPlan, type FrontendPlanType, type PricingSnapshot } from "@/lib/planSelection";

const HERO_WORDS = ["fast.", "accurate.", "effortless."];

const termlyCardClasses: Record<string, string> = {
  purple: "bg-gradient-to-br from-secondary/14 via-white to-white border-secondary/20",
  orange: "bg-gradient-to-br from-accent/14 via-white to-white border-accent/20",
  blue: "bg-gradient-to-br from-primary/14 via-white to-white border-primary/20",
};

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

const FEATURES = [
  {
    title: "Teacher Management",
    description: "Add teachers, assign subjects, and manage workload.",
    icon: teacherIcon,
    color: "purple",
    revealLabel: "On the flip side",
    revealTitle: "See staffing at a glance",
    revealDescription:
      "Hover to reveal a cleaner view of who teaches what, where the gaps are, and how workloads stay balanced.",
    highlights: ["Load balance snapshots", "Subject ownership clarity", "Quick staffing confidence"],
  },
  {
    title: "Smart Streams",
    description: "Organize classes and streams automatically.",
    icon: streamIcon,
    color: "orange",
    revealLabel: "Behind the card",
    revealTitle: "Turn structure into flow",
    revealDescription:
      "The back view shows how streams line up neatly so classes, rooms, and learning groups stay easy to follow.",
    highlights: ["Stream grouping cues", "Clear room planning", "Less manual reshuffling"],
  },
  {
    title: "Automated Timetables",
    description: "Generate conflict-free timetables powered by AI.",
    icon: timetableIcon,
    color: "blue",
    revealLabel: "What opens up",
    revealTitle: "From draft to done faster",
    revealDescription:
      "Flip the card to imagine a timetable that resolves clashes quickly and leaves your team reviewing, not rebuilding.",
    highlights: ["Conflict-aware layouts", "Faster first drafts", "More time for review"],
  },
] as const;

const Index = () => {
  const navigate = useNavigate();
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [typedWord, setTypedWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
                    Timetables built in seconds, so your school spends less time planning and more time on what matters
                    most: teaching.
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

        <section className="relative flex items-center justify-center overflow-hidden bg-transparent">
          <div className="container relative z-10 mx-auto px-4 py-20">
            <div className="rounded-[2rem] border border-white/50 bg-[#001429] px-6 py-12 shadow-[0_24px_70px_rgba(0,16,39,0.12)] md:px-10 md:py-14">
              <div className="mb-16 text-center">
                <h2 className="text-4xl font-bold text-white/70">Why choose ElimuTime?</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="feature-flip-card h-[430px] md:h-[360px]">
                    <div className="feature-flip-card-inner h-full">
                      <Card
                        className={`feature-flip-face feature-flip-face-front relative flex h-full flex-col items-center justify-center overflow-hidden rounded-none border-0 p-7 text-center text-white shadow-[0_24px_60px_rgba(1,16,39,0.18)] md:p-10 ${
                          feature.color === "purple"
                            ? "bg-gradient-to-br from-secondary via-secondary/90 to-secondary/75"
                            : feature.color === "orange"
                              ? "bg-gradient-to-br from-accent via-accent/90 to-accent/75"
                              : "bg-gradient-to-br from-primary via-primary/90 to-primary/75"
                        }`}
                      >
                        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                          <div className="space-y-5 md:space-y-6">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/12 p-3 md:h-20 md:w-20 md:p-4">
                              <img
                                src={feature.icon}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Core feature</p>
                              <h3 className="text-xl font-bold md:text-3xl">{feature.title}</h3>
                              <p className="max-w-[18rem] text-sm leading-6 text-white/70 md:text-base md:leading-7">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className={`feature-flip-face feature-flip-face-back overflow-hidden border rounded-none shadow-lg ${termlyCardClasses[feature.color]}`}>
                        <div className="flex h-full flex-col justify-between p-3.5 text-left md:p-6">
                          <div className="space-y-2.5 md:space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] md:text-xs ${planAccentClasses[feature.color].price}`}>
                                  {feature.revealLabel}
                                </p>
                                <h3 className="mt-1.5 max-w-[11rem] text-[15px] font-bold leading-5 text-foreground md:mt-2 md:max-w-none md:text-xl md:leading-6">
                                  {feature.revealTitle}
                                </h3>
                              </div>
                              <div className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold md:px-3 md:text-[11px] ${planAccentClasses[feature.color].button}`}>
                                Live preview
                              </div>
                            </div>

                            <p className="text-[11px] leading-4 text-muted-foreground md:text-sm md:leading-6">
                              {feature.revealDescription}
                            </p>

                            <div className="space-y-1 md:space-y-2">
                              {feature.highlights.map((highlight) => (
                                <div key={highlight} className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                                      feature.color === "purple"
                                        ? "bg-secondary"
                                        : feature.color === "orange"
                                          ? "bg-accent"
                                          : "bg-primary"
                                    }`}
                                  />
                                  <span className="text-[11px] font-medium leading-4 text-foreground md:text-sm">{highlight}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-[10px] leading-4 text-muted-foreground md:mt-4 md:px-4 md:py-3 md:text-xs md:leading-5">
                            Built to replace last-minute timetable fixes with calmer reviews and quicker decisions.
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <PricingSection sectionId="pricing" onSelectPlan={handleSelectPlan} />

      <footer className="bg-foreground py-12 text-white">
        <div className="container mx-auto px-4">
          <div className="mb-8 grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_0.9fr_1fr] md:items-start">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <img src={logo} alt="ElimuTime" className="mb-4 h-16 w-auto" />
              <p className="text-white/70">Smart timetabling for modern schools</p>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-white/70">
                Powered by{" "}
                <a href="https://notifyai.org/" className="font-semibold text-primary hover:underline">
                  Notify AI
                </a>
              </p>
            </div>

            <div className="text-center md:text-right">
              <p className="text-white/70">
                <a href="mailto:notifytechgroup@gmail.com" className="hover:text-white">
                  notifytechgroup@gmail.com
                </a>
              </p>
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
