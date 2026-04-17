import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Building2,
  Users,
  BookOpen,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Mail,
  GraduationCap,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface School {
  id: string;
  name: string;
  type: string;
  location: string | null;
  timetable_template: string;
  created_at: string;
  teacher_count?: number;
  stream_count?: number;
  timetable_count?: number;
  teachers?: any[];
  streams?: any[];
  subjects?: any[];
  profiles?: any[];
  timetables?: any[];
}

interface ExpandedSchool {
  [schoolId: string]: boolean;
}

const AdminSchools = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedSchools, setExpandedSchools] = useState<ExpandedSchool>({});

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch detailed data for each school
      const schoolsWithData = await Promise.all(
        (data || []).map(async (school) => {
          const [teachers, streams, timetables, subjects, profiles] = await Promise.all([
            supabase
              .from("teachers")
              .select("*")
              .eq("school_id", school.id),
            supabase
              .from("streams")
              .select("*")
              .eq("school_id", school.id)
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
              .eq("school_id", school.id),
            supabase
              .from("subjects")
              .select("*")
              .eq("school_id", school.id),
            supabase
              .from("profiles")
              .select("*")
              .eq("school_id", school.id),
          ]);

          return {
            ...school,
            teachers: teachers.data || [],
            streams: streams.data || [],
            subjects: subjects.data || [],
            profiles: profiles.data || [],
            timetables: timetables.data || [],
            teacher_count: teachers.data?.length || 0,
            stream_count: streams.data?.length || 0,
            timetable_count: timetables.data?.length || 0,
          };
        })
      );

      setSchools(schoolsWithData);
    } catch (error: any) {
      toast.error("Failed to load schools: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("schools").delete().eq("id", deleteId);
      if (error) throw error;

      toast.success("School deleted successfully");
      fetchSchools();
    } catch (error: any) {
      toast.error("Failed to delete school: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-lg opacity-30 glow" />
          <div className="relative bg-card p-6 rounded-lg">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              School Management
            </h1>
            <p className="text-muted-foreground">
              Manage all registered schools and their data
            </p>
          </div>
        </div>

        {/* Search */}
        <div>
          <Card className="p-4 glass">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="px-4">
                {filteredSchools.length} schools
              </Badge>
            </div>
          </Card>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-64 bg-secondary rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <>
              {filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    style={{ transformStyle: "preserve-3d" }}
                    className="cursor-pointer"
                  >
                  <Collapsible
                    open={expandedSchools[school.id]}
                    onOpenChange={() =>
                      setExpandedSchools({
                        ...expandedSchools,
                        [school.id]: !expandedSchools[school.id],
                      })
                    }
                  >
                      <Card onClick={() => navigate(`/admin/schools/${school.id}`)} className="p-6 relative overflow-hidden group card-hover">
                      {/* Static gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />

                      <div className="relative z-10 space-y-4">
                        {/* School Header */}
                        <div className="flex items-start justify-between">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center float">
                            <Building2 className="w-8 h-8 text-white" />
                          </div>

                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {expandedSchools[school.id] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        {/* School Info */}
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-foreground">
                            {school.name}
                          </h3>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{school.type}</Badge>
                            <Badge variant="secondary">
                              {school.timetable_template}
                            </Badge>
                            <Badge>{school.profiles?.length || 0} Users</Badge>
                          </div>

                          {school.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {school.location}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-4 pt-4">
                            <div className="text-center">
                              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                              <div className="text-lg font-bold">
                                {school.teacher_count}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Teachers
                              </div>
                            </div>

                            <div className="text-center">
                              <BookOpen className="w-5 h-5 mx-auto text-accent mb-1" />
                              <div className="text-lg font-bold">
                                {school.stream_count}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Streams
                              </div>
                            </div>

                            <div className="text-center">
                              <Calendar className="w-5 h-5 mx-auto text-success mb-1" />
                              <div className="text-lg font-bold">
                                {school.timetable_count}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Timetables
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <CollapsibleContent className="space-y-4 pt-4 border-t">
                          <Tabs defaultValue="teachers" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="teachers">Teachers</TabsTrigger>
                              <TabsTrigger value="streams">Streams</TabsTrigger>
                              <TabsTrigger value="timetables">Timetables</TabsTrigger>
                              <TabsTrigger value="users">Users</TabsTrigger>
                            </TabsList>

                            {/* Teachers Tab */}
                            <TabsContent value="teachers" className="space-y-4">
                              {school.teachers && school.teachers.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {school.teachers.map((teacher: any) => {
                                    const teacherTimetables = school.timetables?.filter(
                                      (tt: any) => tt.generated_by === teacher.id || tt.generated_by === teacher.name
                                    ) || [];
                                    
                                    return (
                                      <div
                                        key={teacher.id}
                                        className="p-3 bg-secondary/50 rounded-lg shimmer"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="font-bold text-base">{teacher.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                              <Mail className="w-3 h-3" />
                                              {teacher.email}
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                              <Badge variant="outline" className="text-xs">
                                                Workload: {teacher.workload || 20}
                                              </Badge>
                                              <Badge variant="outline" className="text-xs">
                                                Max Lessons: {teacher.max_lessons_per_week || 25}
                                              </Badge>
                                            </div>
                                          </div>
                                          {teacherTimetables.length > 0 && (
                                            <Badge variant="default">
                                              {teacherTimetables.length} TT
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No teachers found
                                </p>
                              )}
                            </TabsContent>

                            {/* Streams Tab */}
                            <TabsContent value="streams" className="space-y-4">
                              {school.streams && school.streams.length > 0 ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {school.streams.map((stream: any) => {
                                    const streamTimetables = school.timetables?.filter(
                                      (tt: any) => tt.stream_id === stream.id
                                    ) || [];
                                    
                                    return (
                                      <div
                                        key={stream.id}
                                        className="p-3 bg-accent/20 rounded-lg glass"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-accent" />
                                            <span className="font-bold">
                                              Grade {stream.grade} - {stream.stream_name}
                                            </span>
                                          </div>
                                          {streamTimetables.length > 0 && (
                                            <Badge variant="secondary">
                                              {streamTimetables.length} Timetable{streamTimetables.length > 1 ? 's' : ''}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {streamTimetables.length > 0 && (
                                          <div className="mt-2 space-y-1">
                                            {streamTimetables.map((tt: any, idx: number) => (
                                              <div
                                                key={tt.id}
                                                className="text-xs p-2 bg-background/50 rounded flex justify-between items-center"
                                              >
                                                <span>
                                                  Generated: {new Date(tt.generated_at).toLocaleDateString()}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                  {tt.template_type || 'Classic'}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No streams found
                                </p>
                              )}
                            </TabsContent>

                            {/* Timetables Tab */}
                            <TabsContent value="timetables" className="space-y-4">
                              {school.timetables && school.timetables.length > 0 ? (
                                <div className="max-h-96 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Stream/Class</TableHead>
                                        <TableHead>Template</TableHead>
                                        <TableHead>Generated</TableHead>
                                        <TableHead>By</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {school.timetables.map((tt: any) => (
                                        <tr
                                          key={tt.id}
                                          className="hover:bg-secondary/50 transition-colors"
                                        >
                                          <TableCell className="font-medium">
                                            {tt.streams ? (
                                              <Badge variant="outline">
                                                Grade {tt.streams.grade} - {tt.streams.stream_name}
                                              </Badge>
                                            ) : (
                                              <span className="text-muted-foreground text-xs">N/A</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="secondary">
                                              {tt.template_type || 'Classic'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {new Date(tt.generated_at).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                              {tt.generated_by || 'AI'}
                                            </Badge>
                                          </TableCell>
                                        </tr>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No timetables generated yet
                                </p>
                              )}
                            </TabsContent>

                            {/* Users Tab */}
                            <TabsContent value="users" className="space-y-4">
                              {school.profiles && school.profiles.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {school.profiles.map((profile: any) => (
                                    <div
                                      key={profile.id}
                                      className="p-3 bg-primary/10 rounded-lg glass"
                                    >
                                      <div className="font-bold">{profile.full_name}</div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Mail className="w-3 h-3" />
                                        {profile.email}
                                      </div>
                                      <div className="mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          Joined: {new Date(profile.created_at).toLocaleDateString()}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No users found
                                </p>
                              )}
                            </TabsContent>

                            {/* Subjects Info */}
                            {school.subjects && school.subjects.length > 0 && (
                              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                                  <FileText className="w-4 h-4" />
                                  Subjects ({school.subjects.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {school.subjects.map((subject: any) => (
                                    <Badge key={subject.id} variant="secondary" className="text-xs">
                                      {subject.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Tabs>
                        </CollapsibleContent>

                        {/* Delete Button */}
                        <div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => setDeleteId(school.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete School
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Collapsible>
                </div>
              ))}
            </>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete School</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the school and all associated data
                (teachers, streams, timetables). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSchools;
