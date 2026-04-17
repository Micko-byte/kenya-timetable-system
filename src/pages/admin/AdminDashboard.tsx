import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  School,
  FileText,
  Calendar,
  CreditCard,
  TrendingUp,
  Upload,
  BookOpen,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { 
  RevenueTrendChart,
  SubscriptionDistributionChart,
  TimetableActivityChart,
  TemplateUsageChart
} from "@/components/admin/ChartComponents";

interface AdminStats {
  totalUsers: number;
  totalSchools: number;
  totalTimetables: number;
  activeSubscriptions: number;
  totalTeachers: number;
  totalStreams: number;
  totalUploads: number;
  totalSubjects: number;
  timetablesToday: number;
  timetablesThisWeek: number;
  timetablesThisMonth: number;
  trialSubscriptions: number;
  paidSubscriptions: number;
}

interface RecentUpload {
  id: string;
  type: string;
  uploaded_at: string;
  school_name: string;
}

interface RecentStream {
  id: string;
  stream_name: string;
  grade: number;
  school_name: string;
  created_at: string;
}

interface SchoolWithTemplate {
  id: string;
  name: string;
  type: string;
  timetable_template: string;
  location: string | null;
  teacher_count: number;
  stream_count: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSchools: 0,
    totalTimetables: 0,
    activeSubscriptions: 0,
    totalTeachers: 0,
    totalStreams: 0,
    totalUploads: 0,
    totalSubjects: 0,
    timetablesToday: 0,
    timetablesThisWeek: 0,
    timetablesThisMonth: 0,
    trialSubscriptions: 0,
    paidSubscriptions: 0,
  });
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [recentStreams, setRecentStreams] = useState<RecentStream[]>([]);
  const [schoolsWithTemplates, setSchoolsWithTemplates] = useState<SchoolWithTemplate[]>([]);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [
          usersCount,
          schoolsCount,
          timetablesCount,
          subscriptionsCount,
          teachersCount,
          streamsCount,
          uploadsCount,
          subjectsCount,
          timetablesTodayCount,
          timetablesWeekCount,
          timetablesMonthCount,
          trialSubs,
          paidSubs,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("schools").select("*", { count: "exact", head: true }),
          supabase.from("timetables").select("*", { count: "exact", head: true }),
          supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("status", "active"),
          supabase.from("teachers").select("*", { count: "exact", head: true }),
          supabase.from("streams").select("*", { count: "exact", head: true }),
          supabase.from("uploads").select("*", { count: "exact", head: true }),
          supabase.from("subjects").select("*", { count: "exact", head: true }),
          supabase
            .from("timetables")
            .select("*", { count: "exact", head: true })
            .gte("created_at", today),
          supabase
            .from("timetables")
            .select("*", { count: "exact", head: true })
            .gte("created_at", weekAgo),
          supabase
            .from("timetables")
            .select("*", { count: "exact", head: true })
            .gte("created_at", monthAgo),
          supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .eq("plan_type", "free_trial"),
          supabase
            .from("subscriptions")
            .select("*", { count: "exact", head: true })
            .neq("plan_type", "free_trial"),
        ]);

        setStats({
          totalUsers: usersCount.count || 0,
          totalSchools: schoolsCount.count || 0,
          totalTimetables: timetablesCount.count || 0,
          activeSubscriptions: subscriptionsCount.count || 0,
          totalTeachers: teachersCount.count || 0,
          totalStreams: streamsCount.count || 0,
          totalUploads: uploadsCount.count || 0,
          totalSubjects: subjectsCount.count || 0,
          timetablesToday: timetablesTodayCount.count || 0,
          timetablesThisWeek: timetablesWeekCount.count || 0,
          timetablesThisMonth: timetablesMonthCount.count || 0,
          trialSubscriptions: trialSubs.count || 0,
          paidSubscriptions: paidSubs.count || 0,
        });

        // Fetch recent uploads
        const { data: uploads } = await supabase
          .from("uploads")
          .select(`
            id,
            type,
            uploaded_at,
            schools(name)
          `)
          .order("uploaded_at", { ascending: false })
          .limit(5);

        if (uploads) {
          setRecentUploads(
            uploads.map((u) => ({
              id: u.id,
              type: u.type,
              uploaded_at: u.uploaded_at,
              school_name: (u.schools as any)?.name || "Unknown",
            }))
          );
        }

        // Fetch recent streams
        const { data: streams } = await supabase
          .from("streams")
          .select(`
            id,
            stream_name,
            grade,
            created_at,
            schools(name)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (streams) {
          setRecentStreams(
            streams.map((s) => ({
              id: s.id,
              stream_name: s.stream_name,
              grade: s.grade,
              created_at: s.created_at,
              school_name: (s.schools as any)?.name || "Unknown",
            }))
          );
        }

        // Fetch schools with templates and counts
        const { data: schools } = await supabase
          .from("schools")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);

        if (schools) {
          const schoolsData = await Promise.all(
            schools.map(async (school) => {
              const [teachers, streams] = await Promise.all([
                supabase
                  .from("teachers")
                  .select("*", { count: "exact", head: true })
                  .eq("school_id", school.id),
                supabase
                  .from("streams")
                  .select("*", { count: "exact", head: true })
                  .eq("school_id", school.id),
              ]);

              return {
                ...school,
                teacher_count: teachers.count || 0,
                stream_count: streams.count || 0,
              };
            })
          );

          setSchoolsWithTemplates(schoolsData);
        }
      } catch (error: any) {
        toast.error("Failed to fetch dashboard data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  const cards = [
    {
      title: "Total Schools",
      count: stats.totalSchools,
      icon: School,
      color: "bg-blue-500",
      path: "/admin/schools",
      subtitle: "Registered",
    },
    {
      title: "Active Subscriptions",
      count: stats.activeSubscriptions,
      icon: TrendingUp,
      color: "bg-green-500",
      path: "/admin/billing",
      subtitle: `${stats.trialSubscriptions} trials, ${stats.paidSubscriptions} paid`,
    },
    {
      title: "Timetables Generated",
      count: stats.totalTimetables,
      icon: Calendar,
      color: "bg-purple-500",
      path: "/admin/timetables",
      subtitle: `${stats.timetablesToday} today, ${stats.timetablesThisWeek} this week`,
    },
    {
      title: "Total Users",
      count: stats.totalUsers,
      icon: Users,
      color: "bg-orange-500",
      path: "/admin/users",
      subtitle: "Platform users",
    },
    {
      title: "Teachers",
      count: stats.totalTeachers,
      icon: Users,
      color: "bg-pink-500",
      path: "/admin/schools",
      subtitle: "Registered teachers",
    },
    {
      title: "Streams/Classes",
      count: stats.totalStreams,
      icon: BookOpen,
      color: "bg-indigo-500",
      path: "/admin/schools",
      subtitle: "Active streams",
    },
    {
      title: "Past Uploads",
      count: stats.totalUploads,
      icon: Upload,
      color: "bg-cyan-500",
      path: "/admin/schools",
      subtitle: "Timetable uploads",
    },
    {
      title: "Subjects",
      count: stats.totalSubjects,
      icon: FileText,
      color: "bg-amber-500",
      path: "/admin/schools",
      subtitle: "Total subjects",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of all system activities and statistics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <Card className="p-6">Loading...</Card>
          ) : (
            cards.map((card) => (
              <Card
                key={card.title}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(card.path)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}
                  >
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  {card.count}
                </h3>
                <p className="text-sm font-medium text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
              </Card>
            ))
          )}
        </div>

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RevenueTrendChart
              data={[
                { month: "Jul", mrr: 12000, arr: 144000 },
                { month: "Aug", mrr: 15000, arr: 180000 },
                { month: "Sep", mrr: 18000, arr: 216000 },
                { month: "Oct", mrr: 22000, arr: 264000 },
                { month: "Nov", mrr: 25000, arr: 300000 },
                { month: "Dec", mrr: 30000, arr: 360000 },
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SubscriptionDistributionChart
                data={[
                  { name: "Trial", value: stats.trialSubscriptions },
                  { name: "Basic", value: Math.floor(stats.paidSubscriptions * 0.4) },
                  { name: "Premium", value: Math.floor(stats.paidSubscriptions * 0.35) },
                  { name: "Enterprise", value: Math.floor(stats.paidSubscriptions * 0.25) },
                ]}
              />

              <TimetableActivityChart
                data={[
                  { day: "Mon", ai: 12, manual: 3 },
                  { day: "Tue", ai: 15, manual: 5 },
                  { day: "Wed", ai: 18, manual: 4 },
                  { day: "Thu", ai: 20, manual: 6 },
                  { day: "Fri", ai: 22, manual: 8 },
                  { day: "Sat", ai: 10, manual: 2 },
                  { day: "Sun", ai: 8, manual: 1 },
                ]}
              />
            </div>

            <TemplateUsageChart
              data={[
                { name: "Primary School", usage: 45 },
                { name: "High School", usage: 38 },
                { name: "International", usage: 22 },
                { name: "University", usage: 15 },
                { name: "College/TVET", usage: 12 },
                { name: "Training", usage: 8 },
              ]}
            />
          </div>

          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/admin/schools")}
            >
              <School className="w-6 h-6" />
              <span className="text-sm">View Schools</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/admin/templates")}
            >
              <FileText className="w-6 h-6" />
              <span className="text-sm">Manage Templates</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/admin/billing")}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-sm">Billing</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/admin/users")}
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">View Users</span>
            </Button>
          </div>
        </Card>

        {/* Schools with Templates */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">
              Schools & Templates
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/schools")}
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : schoolsWithTemplates.length === 0 ? (
              <p className="text-muted-foreground">No schools found</p>
            ) : (
              schoolsWithTemplates.map((school) => (
                <Card key={school.id} className="p-4">
                  <h3 className="font-bold text-foreground mb-2">
                    {school.name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Badge variant="outline">{school.type || "Primary"}</Badge>
                      <Badge variant="secondary">
                        {school.timetable_template || "Classic"}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{school.teacher_count} Teachers</span>
                      <span>{school.stream_count} Streams</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>

        {/* Recent Streams */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Recent Streams</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/schools")}
            >
              View All
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : recentStreams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No streams found
                  </TableCell>
                </TableRow>
              ) : (
                recentStreams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell className="font-medium">
                      {stream.stream_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Grade {stream.grade}</Badge>
                    </TableCell>
                    <TableCell>{stream.school_name}</TableCell>
                    <TableCell>
                      {new Date(stream.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Recent Uploads */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Recent Uploads</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/schools")}
            >
              View All
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : recentUploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No uploads found
                  </TableCell>
                </TableRow>
              ) : (
                recentUploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>
                      <Badge>{upload.type}</Badge>
                    </TableCell>
                    <TableCell>{upload.school_name}</TableCell>
                    <TableCell>
                      {new Date(upload.uploaded_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
