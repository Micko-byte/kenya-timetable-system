import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { PlanSelectionModal } from "@/components/pricing/PlanSelectionModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSchoolSession } from "@/lib/session";
import {
  hydrateSelectedFrontendPlan,
  setSelectedFrontendPlan,
  type FrontendPlanType,
  type PricingSnapshot,
} from "@/lib/planSelection";
import { toast } from "sonner";
import { advanceSchoolOnboardingTour, beginSchoolOnboardingTour, startPendingOnboardingTour } from "@/lib/onboardingTour";
import {
  Users,
  BookOpen,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface Stats {
  teachers: number;
  streams: number;
  timetables: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    teachers: 0,
    streams: 0,
    timetables: 0,
  });
  const [schoolId, setSchoolId] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<FrontendPlanType | null>(null);
  const [planStatusReady, setPlanStatusReady] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const session = await getCurrentSchoolSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setSchoolId(session.schoolId);

      const [{ data: school }, { data: subscription }] = await Promise.all([
        supabase
          .from("schools")
          .select("timetable_template")
          .eq("id", session.schoolId)
          .single(),
        supabase
          .from("subscriptions")
          .select("plan_type")
          .eq("school_id", session.schoolId)
          .maybeSingle(),
      ]);

      if (school) {
        // Template preference fetched but not used in this view anymore
      }

      setSelectedPlan(hydrateSelectedFrontendPlan(session.schoolId, subscription?.plan_type));
      setPlanStatusReady(true);

        // Fetch stats
        const [teachersCount, streamsCount, timetablesCount] =
          await Promise.all([
            supabase
              .from("teachers")
              .select("*", { count: "exact", head: true })
              .eq("school_id", session.schoolId),
            supabase
              .from("streams")
              .select("*", { count: "exact", head: true })
              .eq("school_id", session.schoolId),
            supabase
              .from("timetables")
              .select("*", { count: "exact", head: true })
              .eq("school_id", session.schoolId),
          ]);

        setStats({
          teachers: teachersCount.count || 0,
          streams: streamsCount.count || 0,
          timetables: timetablesCount.count || 0,
        });
    };

    fetchDashboardData();
  }, [navigate]);

  const handleSelectPlan = (planType: FrontendPlanType, snapshot: PricingSnapshot) => {
    setSelectedFrontendPlan(planType, schoolId, snapshot);
    if (schoolId) {
      beginSchoolOnboardingTour(schoolId);
    } else {
      startPendingOnboardingTour();
    }
    setSelectedPlan(planType);
    toast.success("Plan selected. Your dashboard is now ready.");
  };

  const handleGetStarted = () => {
    if (schoolId) {
      advanceSchoolOnboardingTour(schoolId);
    }
    navigate("/streams");
  };

  const cards = [
    {
      title: "Streams & Classes",
      count: stats.streams,
      icon: BookOpen,
      color: "from-primary to-primary/80",
      path: "/streams",
      description: "Configure grades and streams",
    },
    {
      title: "Teachers",
      count: stats.teachers,
      icon: Users,
      color: "from-secondary to-secondary/80",
      path: "/teachers",
      description: "Manage your teaching staff",
    },
    {
      title: "Timetables",
      count: stats.timetables,
      icon: Calendar,
      color: "from-accent to-accent/80",
      path: "/timetables",
      description: "Generate AI timetables",
    },
  ];

  return (
    <DashboardLayout>
      <PlanSelectionModal
        open={planStatusReady && !selectedPlan}
        currentPlan={selectedPlan}
        onSelectPlan={handleSelectPlan}
      />

      <div className="space-y-6 md:space-y-8">
        {/* Powered by Notify AI Badge */}
        <div className="text-center mb-2">
         <a
            href="https://notifyai.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-white font-medium tracking-wide bg-[hsl(var(--foreground))] px-4 py-2 rounded-full hover:opacity-90 transition shadow-lg shadow-[hsl(var(--foreground)/0.18)]"
          >
            Powered by Notify
          </a>
        </div>

        {/* Welcome Section */}
        <div className="relative space-y-4 text-center">
          <div className="relative">
            <div className="mx-auto mb-4 h-1.5 w-32 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)),hsl(var(--accent)))]" />
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              Welcome to your Dashboard
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Manage your school's timetabling with the power of AI. Let's create
              the perfect schedule for your students and teachers.
            </p>

            <div>
              <Button
                size="lg"
                onClick={handleGetStarted}
                data-tour-id="tour-dashboard-get-started"
                className="text-base transition-all gap-2 mt-6 shadow-2xl hover:shadow-2xl font-semibold rounded-full gradient-primary text-white hover:opacity-90"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title}>
              <Card
                className="group card-hover relative flex min-h-[188px] cursor-pointer flex-col overflow-hidden border-primary/10 bg-white/95 p-5 shadow-[0_18px_40px_rgba(1,16,39,0.06)] backdrop-blur-sm hover:-translate-y-1 sm:min-h-[208px] sm:p-6"
                onClick={() => navigate(card.path)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_30px_hsl(var(--primary)/0.2)]" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} shadow-lg sm:h-12 sm:w-12`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <h2 className="mb-1 text-2xl font-bold text-foreground sm:text-[1.75rem]">
                    {card.count}
                  </h2>
                  <p className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                    {card.title}
                  </p>
                  <p className="mt-auto text-sm leading-6 text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
