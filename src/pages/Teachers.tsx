import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, Mail, BookOpen, Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AssignedClassesDropdown } from "@/components/AssignedClassesDropdown";
import { SubjectClassAssignmentsEditor } from "@/components/SubjectClassAssignmentsEditor";
import { getCurrentSchoolSession } from "@/lib/session";

interface Teacher {
  id: string;
  name: string;
  email: string;
  max_lessons_per_week: number;
  subjects: string[];
  classResponsibility?: string;
  assignedClasses?: Array<{ id: string; grade: number; stream_name: string }>;
  subjectClassAssignments?: Array<{
    subject: string;
    classes: Array<{ id: string; grade: number; stream_name: string }>;
  }>;
}

const Teachers = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    maxLessons: 25,
    subjects: [] as string[],
    classResponsibility: "",
    assignedClasses: [] as string[],
    subjectClassAssignments: {} as Record<string, string[]>,
  });
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    const session = await getCurrentSchoolSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setSchoolId(session.schoolId);

    const { data: subjectsData } = await supabase.from("subjects").select("*").eq("school_id", session.schoolId);
    const { data: streamsData } = await supabase.from("streams").select("*").eq("school_id", session.schoolId);

    setSubjects(subjectsData || []);
    setStreams(streamsData || []);

    const { data: teachersData } = await supabase
      .from("teachers")
      .select(`
          *,
          teacher_subjects(subject_id, subjects(name)),
          teacher_responsibilities(stream_id, streams(grade, stream_name)),
          teacher_assigned_classes(stream_id, streams(id, grade, stream_name)),
          teacher_subject_classes(subject_id, stream_id, subjects(name), streams(id, grade, stream_name))
        `)
      .eq("school_id", session.schoolId);

    if (teachersData) {
      const formattedTeachers = teachersData.map((teacher: any) => ({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        max_lessons_per_week: teacher.max_lessons_per_week,
        subjects: teacher.teacher_subjects?.map((ts: any) => ts.subjects?.name) || [],
        classResponsibility: teacher.teacher_responsibilities?.[0]?.streams
          ? `Grade ${teacher.teacher_responsibilities[0].streams.grade} - ${teacher.teacher_responsibilities[0].streams.stream_name}`
          : undefined,
        assignedClasses:
          teacher.teacher_assigned_classes?.map((tac: any) => ({
            id: tac.streams.id,
            grade: tac.streams.grade,
            stream_name: tac.streams.stream_name,
          })) || [],
        subjectClassAssignments: Object.values(
          (teacher.teacher_subject_classes || []).reduce((acc: any, item: any) => {
            const subjectName = item.subjects?.name || "Unknown subject";
            if (!acc[subjectName]) {
              acc[subjectName] = { subject: subjectName, classes: [] };
            }
            if (item.streams) {
              acc[subjectName].classes.push({
                id: item.streams.id,
                grade: item.streams.grade,
                stream_name: item.streams.stream_name,
              });
            }
            return acc;
          }, {}),
        ),
      }));
      setTeachers(formattedTeachers);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .insert({
          school_id: schoolId,
          name: formData.name,
          email: formData.email,
          max_lessons_per_week: formData.maxLessons,
        })
        .select()
        .single();

      if (teacherError) throw teacherError;

      if (formData.subjects.length > 0) {
        for (const subjectName of formData.subjects) {
          let { data: existingSubject } = await supabase
            .from("subjects")
            .select("id")
            .eq("school_id", schoolId)
            .eq("name", subjectName)
            .maybeSingle();

          let subjectId = existingSubject?.id;
          if (!subjectId) {
            const { data: createdSubject, error: subjectError } = await supabase
              .from("subjects")
              .insert({ school_id: schoolId, name: subjectName })
              .select()
              .single();
            if (subjectError) throw subjectError;
            subjectId = createdSubject.id;
          }

          const { error: linkError } = await supabase
            .from("teacher_subjects")
            .insert({ teacher_id: teacher.id, subject_id: subjectId });

          if (linkError) throw linkError;
        }
      }

      if (formData.classResponsibility) {
        const { error: responsibilityError } = await supabase
          .from("teacher_responsibilities")
          .insert({ teacher_id: teacher.id, stream_id: formData.classResponsibility });
        if (responsibilityError) throw responsibilityError;
      }

      if (formData.assignedClasses.length > 0) {
        const assignedClassesData = formData.assignedClasses.map((streamId) => ({
          teacher_id: teacher.id,
          stream_id: streamId,
        }));

        const { error: assignError } = await supabase.from("teacher_assigned_classes").insert(assignedClassesData);
        if (assignError) throw assignError;
      }

      const subjectClassLinks = Object.entries(formData.subjectClassAssignments).flatMap(([subjectName, streamIds]) =>
        streamIds.map((streamId) => ({ subjectName, streamId })),
      );

      if (subjectClassLinks.length > 0) {
        for (const link of subjectClassLinks) {
          const subjectId = await (async () => {
            const { data: existingSubject } = await supabase
              .from("subjects")
              .select("id")
              .eq("school_id", schoolId)
              .eq("name", link.subjectName)
              .maybeSingle();

            if (existingSubject?.id) return existingSubject.id;

            const { data: createdSubject, error: subjectError } = await supabase
              .from("subjects")
              .insert({ school_id: schoolId, name: link.subjectName })
              .select("id")
              .single();

            if (subjectError) throw subjectError;
            return createdSubject.id;
          })();

          const { error: linkError } = await supabase.from("teacher_subject_classes").insert({
            teacher_id: teacher.id,
            subject_id: subjectId,
            stream_id: link.streamId,
          });

          if (linkError) throw linkError;
        }
      }

      toast.success("Teacher added successfully!");
      setFormData({
        name: "",
        email: "",
        maxLessons: 25,
        subjects: [],
        classResponsibility: "",
        assignedClasses: [],
        subjectClassAssignments: {},
      });
      setNewSubject("");
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    try {
      const { error } = await supabase.from("teachers").delete().eq("id", teacherId);
      if (error) throw error;
      toast.success("Teacher removed");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete teacher");
    }
  };

  const addSubject = () => {
    if (newSubject.trim() && !formData.subjects.includes(newSubject.trim())) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, newSubject.trim()],
        subjectClassAssignments: {
          ...prev.subjectClassAssignments,
          [newSubject.trim()]: prev.subjectClassAssignments[newSubject.trim()] || [],
        },
      }));
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== subject),
      subjectClassAssignments: Object.fromEntries(
        Object.entries(prev.subjectClassAssignments).filter(([key]) => key !== subject),
      ),
    }));
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => navigate("/streams")} className="gap-2 rounded-full font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => navigate("/timetables")}
              className="rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0] lg:hidden"
            >
              Next →
            </Button>
          </motion.div>

          <div className="order-first px-1 text-center lg:order-none">
            <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-black sm:text-3xl">
              <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                <Users className="h-8 w-8" />
              </motion.div>
              Teachers Management
            </h1>
            <p className="mt-2 text-muted-foreground">Add and manage your teaching staff</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full gap-2 rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0] sm:w-auto"
            >
              + Add Teacher
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => navigate("/timetables")}
                className="hidden w-full gap-2 rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0] sm:w-auto lg:inline-flex"
              >
                Next →
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass shimmer p-6">
                <h2 className="mb-4 text-xl font-semibold">Add New Teacher</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Teacher Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@school.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxLessons">Maximum Lessons per Week</Label>
                    <Input
                      id="maxLessons"
                      type="number"
                      min="1"
                      max="40"
                      value={formData.maxLessons}
                      onChange={(e) => setFormData({ ...formData, maxLessons: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subjects Taught</Label>
                    <p className="mb-2 text-xs text-muted-foreground">Add subjects this teacher will teach</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter subject name"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSubject();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addSubject} disabled={!newSubject.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.subjects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.subjects.map((subject, idx) => (
                          <Badge key={idx} variant="default" className="cursor-pointer gap-1 transition-transform hover:scale-105">
                            {subject}
                            <button
                              type="button"
                              onClick={() => removeSubject(subject)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Subject-Class Links</Label>
                    <p className="text-xs text-muted-foreground">
                      Choose the classes where each subject will be taught. This helps timetable generation avoid clashes.
                    </p>
                    <SubjectClassAssignmentsEditor
                      subjects={formData.subjects}
                      classes={streams}
                      value={formData.subjectClassAssignments}
                      onChange={(next) => setFormData({ ...formData, subjectClassAssignments: next })}
                    />
                  </div>

                  <AssignedClassesDropdown
                    classes={streams}
                    selectedClassIds={formData.assignedClasses}
                    onSelectionChange={(classIds) => setFormData({ ...formData, assignedClasses: classIds })}
                  />

                  {streams.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="classResponsibility">Class Responsibility (Optional)</Label>
                      <select
                        id="classResponsibility"
                        value={formData.classResponsibility}
                        onChange={(e) => setFormData({ ...formData, classResponsibility: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select a class (optional)</option>
                        {streams
                          .sort((a, b) => a.grade - b.grade)
                          .map((stream) => (
                            <option key={stream.id} value={stream.id}>
                              Grade {stream.grade} - {stream.stream_name}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Assign this teacher as class teacher for a specific class
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Teacher"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-full sm:w-auto">
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {teachers.map((teacher) => (
              <motion.div
                key={teacher.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="group relative overflow-hidden p-6 transition-all hover:shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="float flex h-12 w-12 items-center justify-center rounded-full bg-primary"
                      >
                        <Users className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(teacher.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{teacher.name}</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {teacher.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Max {teacher.max_lessons_per_week} lessons/week
                      </p>
                    </div>
                    {(teacher.subjects.length > 0 ||
                      teacher.classResponsibility ||
                      (teacher.assignedClasses?.length || 0) > 0 ||
                      (teacher.subjectClassAssignments?.length || 0) > 0) && (
                      <div className="mt-4 space-y-3 border-t border-border pt-4">
                        {teacher.subjects.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-primary">Subjects:</p>
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.map((subject, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {subject}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {teacher.subjectClassAssignments && teacher.subjectClassAssignments.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-primary">Subject-Class Links:</p>
                            <div className="space-y-2">
                              {teacher.subjectClassAssignments.map((assignment) => (
                                <div key={assignment.subject} className="rounded-lg border border-border/70 p-2">
                                  <div className="mb-1 text-xs font-semibold">{assignment.subject}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {assignment.classes.map((cls) => (
                                      <Badge key={cls.id} variant="outline" className="text-[10px]">
                                        Grade {cls.grade} - {cls.stream_name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-primary">Classes Taught:</p>
                            <div className="flex flex-wrap gap-1">
                              {teacher.assignedClasses.map((cls, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  Grade {cls.grade} - {cls.stream_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {teacher.classResponsibility && (
                          <div>
                            <p className="mb-1 text-xs font-semibold text-primary">Class Teacher:</p>
                            <Badge variant="default" className="text-xs">
                              {teacher.classResponsibility}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {teachers.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="glass p-6 text-center sm:p-12">
              <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No teachers yet</h3>
              <p className="mb-4 text-muted-foreground">Start by adding your first teacher</p>
              <Button onClick={() => setShowForm(true)} className="rounded-full gradient-primary text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Teacher
              </Button>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Teachers;
