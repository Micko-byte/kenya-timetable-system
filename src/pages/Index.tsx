import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import logo from "@/assets/logo.svg";
import carousel1 from "@/assets/carousel-1.webp";
import demoGif from "@/assets/demo.gif";
import teacherIcon from "@/assets/feature-teacher.svg";
import streamIcon from "@/assets/feature-stream.svg";
import timetableIcon from "@/assets/feature-timetable.svg";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

const HERO_WORDS = ["fast.", "accurate.", "effortless."];

const PLANS = [
  {
    name: "Starter",
    termPrice: 3500,
    yearPrice: 9555,
    description: "For small private primary schools",
    features: ["Up to 20 classes", "1 admin user", "PDF export", "Email support"],
    color: "purple",
  },
  {
    name: "Growth",
    termPrice: 7500,
    yearPrice: 20437,
    description: "For mid-size CBC private schools",
    features: ["Up to 50 classes", "3 admin users", "WhatsApp support", "Onboarding call"],
    color: "orange",
    popular: true,
  },
  {
    name: "International",
    termPrice: 18000,
    yearPrice: 45900,
    description: "For international schools",
    features: ["Unlimited classes", "Unlimited users", "Priority support", "Custom onboarding"],
    color: "blue",
  },
] as const;

const gradientCardClasses: Record<string, string> = {
  purple: "bg-gradient-to-br from-secondary to-secondary/80 text-white",
  orange: "bg-gradient-to-br from-accent to-accent/80 text-white",
  blue: "bg-gradient-to-br from-primary to-primary/80 text-white",
};

const gradientCardStyles: Record<string, CSSProperties> = {
  purple: {
    boxShadow: "0 20px 45px hsl(var(--secondary) / 0.35)",
  },
  orange: {
    boxShadow: "0 20px 45px hsl(var(--accent) / 0.35)",
  },
  blue: {
    boxShadow: "0 20px 45px hsl(var(--primary) / 0.35)",
  },
};

const termlyCardClasses: Record<string, string> = {
  purple: "bg-gradient-to-br from-secondary/14 via-white to-white border-secondary/20",
  orange: "bg-gradient-to-br from-accent/14 via-white to-white border-accent/20",
  blue: "bg-gradient-to-br from-primary/14 via-white to-white border-primary/20",
};

const planAccentClasses: Record<string, { price: string; button: string; bullet: string }> = {
  purple: {
    price: "text-secondary",
    button: "bg-secondary text-white hover:bg-secondary/90",
    bullet: "text-secondary",
  },
  orange: {
    price: "text-accent",
    button: "bg-accent text-white hover:bg-accent/90",
    bullet: "text-accent",
  },
  blue: {
    price: "text-primary",
    button: "bg-primary text-white hover:bg-primary/90",
    bullet: "text-primary",
  },
};

const FEATURES = [
  {
    title: "Teacher Management",
    description: "Add teachers, assign subjects, and manage workload.",
    icon: teacherIcon,
    cardClass: "bg-gradient-to-br from-secondary via-secondary/90 to-secondary/75",
    iconShellClass: "",
  },
  {
    title: "Smart Streams",
    description: "Organize classes and streams automatically.",
    icon: streamIcon,
    cardClass: "bg-gradient-to-br from-accent via-accent/90 to-accent/75",
    iconShellClass: "",
  },
  {
    title: "Automated Timetables",
    description: "Generate conflict-free timetables powered by AI.",
    icon: timetableIcon,
    cardClass: "bg-gradient-to-br from-primary via-primary/90 to-primary/75",
    iconShellClass: "",
  },
] as const;

const Index = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
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

        <section className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden bg-transparent pt-24">
          <div className="container relative z-10 mx-auto px-4 py-20">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold leading-tight text-foreground md:text-6xl">
                    Your timetable,
                    <br />
                    <span className="inline-flex min-h-[1.2em] items-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                      {typedWord}
                      <span className="ml-1 inline-block h-[0.95em] w-[3px] animate-pulse rounded-full bg-primary" aria-hidden="true" />
                    </span>
                  </h1>
                  <p className="text-xl leading-relaxed text-muted-foreground">
                    Timetables built in seconds, so your school spends less time planning and more time
                    on what matters most: teaching.
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

              <div className="relative animate-fade-in">
                <img src={carousel1} alt="School timetable preview" className="h-auto w-full rounded-2xl shadow-2xl" />
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
                <img
                  src={demoGif}
                  alt="ElimuTime product demo"
                  className="h-auto w-full object-cover"
                />
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
                <div key={feature.title}>
                  <Card className={`relative flex h-[320px] flex-col items-center justify-center overflow-hidden border-0 p-10 text-center text-white shadow-[0_24px_60px_rgba(1,16,39,0.18)] transition-transform duration-300 hover:-translate-y-1.5 rounded-none ${feature.cardClass}`}>
                    <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                      <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl p-4 ${feature.iconShellClass}`}>
                        <img src={feature.icon} alt="" aria-hidden="true" className="h-full w-full object-contain" />
                      </div>
                      <h3 className="mb-4 text-2xl font-bold  md:text-3xl">{feature.title}</h3>
                      <p className="max-w-[18rem] text-base leading-7 text-white/70">{feature.description}</p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>

      <section id="pricing" className="relative flex items-center justify-center overflow-hidden bg-white scroll-mt-28">
        <div className="brand-grid-bg pointer-events-none absolute inset-0 z-0 opacity-100" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.07),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.96))]" />
        <div className="container relative z-10 mx-auto px-4 py-20">
          <div className="mb-12 space-y-4 text-center">
            <h2 className="text-4xl font-bold text-foreground">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the perfect plan for your school</p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={`text-lg font-semibold ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Termly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                aria-label="Toggle yearly pricing"
                className="data-[state=checked]:bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)),hsl(var(--accent)))] data-[state=unchecked]:bg-muted"
              />
              <span className={`text-lg font-semibold ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly
              </span>
              {isYearly && <Badge className="bg-accent text-accent-foreground">Save up to 15%</Badge>}
            </div>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = isYearly ? plan.yearPrice : plan.termPrice;
              const gradientClass = isYearly ? gradientCardClasses[plan.color] : "";
              const gradientStyle = isYearly ? gradientCardStyles[plan.color] : undefined;
              const accent = planAccentClasses[plan.color];

              return (
                <Card
                  key={plan.name}
                  className={`relative p-8 transition-all ${
                    plan.popular && !isYearly ? "border-2 border-primary shadow-lg md:scale-105" : ""
                  } ${isYearly ? gradientClass : `${termlyCardClasses[plan.color]} shadow-lg`}`}
                  style={gradientStyle}
                >
                  {plan.popular && !isYearly && (
                    <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">Most Popular</Badge>
                  )}

                  <h3 className={`mb-2 text-2xl font-bold ${isYearly ? "text-white" : "text-foreground"}`}>{plan.name}</h3>
                  <p className={`mb-6 ${isYearly ? "text-white/80" : "text-muted-foreground"}`}>{plan.description}</p>

                  <div className="mb-6">
                    <div className="mb-1 flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${isYearly ? "text-white" : accent.price}`}>
                        KES {price.toLocaleString()}
                      </span>
                      <span className={isYearly ? "text-white/70" : "text-muted-foreground"}>
                        /{isYearly ? "year" : "term"}
                      </span>
                    </div>
                  </div>

                  <ul className={`mb-8 space-y-3 ${isYearly ? "text-white/90" : ""}`}>
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className={isYearly ? "text-white" : accent.bullet}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate("/signup")}
                    className={`w-full rounded-full font-semibold ${
                      isYearly ? "bg-white text-foreground hover:bg-white/90" : accent.button
                    }`}
                  >
                    Get Started
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

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
