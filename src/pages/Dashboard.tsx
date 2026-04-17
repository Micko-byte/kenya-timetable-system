import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TemplateSelector } from "@/components/TemplateSelector";
import { SchoolTypeSelector } from "@/components/SchoolTypeSelector";
import { PastTimetableUpload } from "@/components/PastTimetableUpload";
import Threads from "@/components/effects/Threads";
import { getCurrentSchoolSession } from "@/lib/session";
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
  const [subscription, setSubscription] = useState<any>(null);
  const [currentTemplate, setCurrentTemplate] = useState<string>("classic");

  useEffect(() => {
    const fetchDashboardData = async () => {
      const session = await getCurrentSchoolSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setSchoolId(session.schoolId);

      // Fetch school template preference
      const { data: school } = await supabase
        .from("schools")
        .select("timetable_template")
        .eq("id", session.schoolId)
        .single();

      if (school) {
        setCurrentTemplate(school.timetable_template || "classic");
      }

        // Fetch stats
        const [teachersCount, streamsCount, timetablesCount, subData] =
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
            supabase
              .from("subscriptions")
              .select("*")
              .eq("school_id", session.schoolId)
              .single(),
          ]);

        setStats({
          teachers: teachersCount.count || 0,
          streams: streamsCount.count || 0,
          timetables: timetablesCount.count || 0,
        });

        setSubscription(subData.data);
    };

    fetchDashboardData();
  }, [navigate]);

  const cards = [
    {
      title: "Streams & Classes",
      count: stats.streams,
      icon: BookOpen,
      color: "bg-success",
      path: "/streams",
      description: "Configure grades and streams",
    },
    {
      title: "Teachers",
      count: stats.teachers,
      icon: Users,
      color: "bg-primary",
      path: "/teachers",
      description: "Manage your teaching staff",
    },
    {
      title: "Timetables",
      count: stats.timetables,
      icon: Calendar,
      color: "bg-primary",
      path: "/timetables",
      description: "Generate AI timetables",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Powered by Notify AI Badge */}
        <div className="text-center mb-2">
         <a
            href="https://notifyai.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-white font-medium tracking-wide bg-[hsl(189,67%,16%)] px-4 py-2 rounded-full hover:opacity-90 transition"
          >
            Powered by Notify
          </a>
        </div>

        {/* Welcome Section */}
        <div className="relative text-center space-y-4">
          <div className="relative">
           <h1 className="text-4xl md:text-5xl font-bold text-black drop-shadow-lg">
            Welcome to your Dashboard
          </h1>

            <p className="text-lg text-black max-w-2xl mx-auto mt-4 drop-shadow">
              Manage your school's timetabling with the power of AI. Let's create
              the perfect schedule for your students and teachers.
            </p>

            <div>
              <Button
                size="lg"
                onClick={() => navigate("/streams")}
                className="bg-[#FECD32] text-[#00000] hover:bg-[#F5BD0D] text-base transition-all gap-2 mt-6 shadow-2xl hover:shadow-2xl font-semibold rounded-full"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.title}>
              <Card
                className="p-6 cursor-pointer group card-hover relative overflow-hidden bg-white/95 backdrop-blur-sm border-white/20"
                onClick={() => navigate(card.path)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_30px_rgba(59,130,246,0.6)]" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center float`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    {card.count}
                  </h2>
                  <p className="text-base font-semibold text-black mb-1">
                    {card.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* School Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] transition-all duration-300 rounded-lg">
            <SchoolTypeSelector />
          </div>
          <div className="hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] transition-all duration-300 rounded-lg md:col-span-1">
            <PastTimetableUpload />
          </div>
        </div>

        {/* Template Selector with Threads */}
        <div className="relative">
          <div className="absolute inset-0 z-0 h-[700px] pointer-events-none">
            <div className="absolute inset-0 opacity-100">
              <Threads
                amplitude={2.5}
                distance={0}
                enableMouseInteraction={true}
                color="#3b82f6"
              />
            </div>
            <div className="absolute inset-0 opacity-80">
              <Threads
                amplitude={2}
                distance={0}
                enableMouseInteraction={true}
                color="#ffffff"
              />
            </div>
            <div className="absolute inset-0 opacity-90">
              <Threads
                amplitude={1.5}
                distance={0}
                enableMouseInteraction={true}
                color="#86efac"
              />
            </div>
          </div>
          <div className="relative z-10">
            <TemplateSelector
              currentTemplate={currentTemplate}
              schoolId={schoolId}
              onTemplateChange={setCurrentTemplate}
            />
          </div>
        </div>


        {/* Subscription Status */}
        {subscription && (
          <div>
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Subscription Status
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Plan: <span className="font-semibold">{subscription.plan_type}</span>
                  </p>
                  {subscription.expires_at && (
                    <p className="text-sm text-muted-foreground">
                      Expires:{" "}
                      {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <Button
                    onClick={() => navigate("/billing")}
                    className="bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D] font-semibold"
                  >
                    Manage Plan
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
