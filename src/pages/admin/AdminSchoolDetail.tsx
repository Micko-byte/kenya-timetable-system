import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Users,
  BookOpen,
  Calendar,
  MapPin,
  Mail,
  GraduationCap,
  FileText,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SchoolData {
  id: string;
  name: string;
  type: string;
  location: string | null;
  timetable_template: string;
  teachers: any[];
  streams: any[];
  subjects: any[];
  profiles: any[];
  timetables: any[];
}

const AdminSchoolDetail = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolDetails();
  }, [schoolId]);

  const fetchSchoolDetails = async () => {
    if (!schoolId) return;

    try {
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (schoolError) throw schoolError;

      const [teachers, streams, timetables, subjects, profiles] = await Promise.all([
        supabase.from("teachers").select("*").eq("school_id", schoolId),
        supabase
          .from("streams")
          .select("*")
          .eq("school_id", schoolId)
          .order("grade", { ascending: true }),
        supabase
          .from("timetables")
          .select(`
            *,
            streams:stream_id (
              grade,
              stream_name
            )
          `)
          .eq("school_id", schoolId),
        supabase.from("subjects").select("*").eq("school_id", schoolId),
        supabase.from("profiles").select("*").eq("school_id", schoolId),
      ]);

      setSchool({
        ...schoolData,
        teachers: teachers.data || [],
        streams: streams.data || [],
        subjects: subjects.data || [],
        profiles: profiles.data || [],
        timetables: timetables.data || [],
      });
    } catch (error: any) {
      toast.error("Failed to load school details: " + error.message);
      navigate("/admin/schools");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Card className="p-6 animate-pulse">
            <div className="h-64 bg-secondary rounded" />
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!school) {
    return null;
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-lg opacity-30 glow" />
          <div className="relative bg-card p-6 rounded-lg">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/schools")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Schools
            </Button>
            
            <div className="flex items-start gap-6">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center float"
              >
                <Building2 className="w-10 h-10 text-white" />
              </motion.div>
              
              <div className="flex-1">
                <h1 className="text-4xl font-bold gradient-text mb-2">
                  {school.name}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{school.type}</Badge>
                  <Badge variant="secondary">{school.timetable_template}</Badge>
                </div>
                {school.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {school.location}
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="glass p-4 rounded-lg text-center">
                  <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">{school.teachers.length}</div>
                  <div className="text-xs text-muted-foreground">Teachers</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="glass p-4 rounded-lg text-center">
                  <BookOpen className="w-6 h-6 mx-auto text-accent mb-2" />
                  <div className="text-2xl font-bold">{school.streams.length}</div>
                  <div className="text-xs text-muted-foreground">Streams</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="glass p-4 rounded-lg text-center">
                  <Calendar className="w-6 h-6 mx-auto text-success mb-2" />
                  <div className="text-2xl font-bold">{school.timetables.length}</div>
                  <div className="text-xs text-muted-foreground">Timetables</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="glass p-4 rounded-lg text-center">
                  <Users className="w-6 h-6 mx-auto text-info mb-2" />
                  <div className="text-2xl font-bold">{school.profiles.length}</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="teachers" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="streams">Streams</TabsTrigger>
              <TabsTrigger value="timetables">Timetables</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">All Teachers</h3>
                <Badge>{school.teachers.length} Total</Badge>
              </div>
              
              {school.teachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {school.teachers.map((teacher: any, index: number) => (
                    <motion.div
                      key={teacher.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-secondary/50 rounded-lg shimmer hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-lg">{teacher.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {teacher.email}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              Workload: {teacher.workload || 20}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Max: {teacher.max_lessons_per_week || 25}/week
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No teachers found</p>
              )}
            </TabsContent>

            {/* Streams Tab */}
            <TabsContent value="streams" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">All Streams/Classes</h3>
                <Badge>{school.streams.length} Total</Badge>
              </div>
              
              {school.streams.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    school.streams.reduce((acc: any, stream: any) => {
                      if (!acc[stream.grade]) acc[stream.grade] = [];
                      acc[stream.grade].push(stream);
                      return acc;
                    }, {})
                  ).map(([grade, streams]: [string, any]) => (
                    <motion.div
                      key={grade}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-accent/20 rounded-lg glass"
                    >
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Grade {grade}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {streams.map((stream: any) => (
                          <Badge key={stream.id} variant="secondary" className="text-sm">
                            {stream.stream_name}
                          </Badge>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No streams found</p>
              )}
            </TabsContent>

            {/* Timetables Tab */}
            <TabsContent value="timetables" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">All Generated Timetables</h3>
                <Badge>{school.timetables.length} Total</Badge>
              </div>
              
              {school.timetables.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stream/Class</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Generated By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {school.timetables.map((tt: any, index: number) => (
                        <motion.tr
                          key={tt.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <TableCell className="font-medium">
                            {tt.streams ? `Grade ${tt.streams.grade} - ${tt.streams.stream_name}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tt.template_type || "Default"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(tt.generated_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge>{tt.generated_by || "AI"}</Badge>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No timetables generated yet</p>
              )}
            </TabsContent>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">All Subjects</h3>
                <Badge>{school.subjects.length} Total</Badge>
              </div>
              
              {school.subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {school.subjects.map((subject: any, index: number) => (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Badge variant="secondary" className="text-sm px-4 py-2">
                        <FileText className="w-3 h-3 mr-2" />
                        {subject.name}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No subjects found</p>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">School Users</h3>
                <Badge>{school.profiles.length} Total</Badge>
              </div>
              
              {school.profiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {school.profiles.map((profile: any, index: number) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-secondary/50 rounded-lg glass"
                    >
                      <div className="font-bold">{profile.full_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {profile.email}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Joined: {new Date(profile.created_at).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminSchoolDetail;
