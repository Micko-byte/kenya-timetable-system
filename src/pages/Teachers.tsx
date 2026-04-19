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
import { getCurrentSchoolSession } from "@/lib/session";

interface Teacher {
  id: string;
  name: string;
  email: string;
  max_lessons_per_week: number;
  subjects: string[];
  classResponsibility?: string;
  assignedClasses?: Array<{ id: string; grade: number; stream_name: string }>;
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

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("*")
        .eq("school_id", session.schoolId);

      const { data: streamsData } = await supabase
        .from("streams")
        .select("*")
        .eq("school_id", session.schoolId);

      setSubjects(subjectsData || []);
      setStreams(streamsData || []);

      // Fetch teachers with their subjects, responsibilities, and assigned classes
      const { data: teachersData } = await supabase
        .from("teachers")
        .select(
          `
          *,
          teacher_subjects(subject_id, subjects(name)),
          teacher_responsibilities(stream_id, streams(grade, stream_name)),
          teacher_assigned_classes(stream_id, streams(id, grade, stream_name))
        `
        )
        .eq("school_id", session.schoolId);

      if (teachersData) {
        const formattedTeachers = teachersData.map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          max_lessons_per_week: teacher.max_lessons_per_week,
          subjects:
            teacher.teacher_subjects?.map(
              (ts: any) => ts.subjects?.name
            ) || [],
          classResponsibility: teacher.teacher_responsibilities?.[0]?.streams
            ? `Grade ${teacher.teacher_responsibilities[0].streams.grade} - ${teacher.teacher_responsibilities[0].streams.stream_name}`
            : undefined,
          assignedClasses: teacher.teacher_assigned_classes?.map(
            (tac: any) => ({
              id: tac.streams.id,
              grade: tac.streams.grade,
              stream_name: tac.streams.stream_name,
            })
          ) || [],
        }));
        setTeachers(formattedTeachers);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert teacher
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

      // Link subjects - create subjects if they don't exist
      if (formData.subjects.length > 0) {
        for (const subjectName of formData.subjects) {
          // Check if subject exists
          let { data: existingSubject } = await supabase
            .from("subjects")
            .select("id")
            .eq("school_id", schoolId)
            .eq("name", subjectName)
            .maybeSingle();

          let subjectId = existingSubject?.id;

          // Create subject if it doesn't exist
          if (!subjectId) {
            const { data: newSubject, error: subjectError } = await supabase
              .from("subjects")
              .insert({ school_id: schoolId, name: subjectName })
              .select()
              .single();

            if (subjectError) throw subjectError;
            subjectId = newSubject.id;
          }

          // Link teacher to subject
          const { error: linkError } = await supabase
            .from("teacher_subjects")
            .insert({ teacher_id: teacher.id, subject_id: subjectId });

          if (linkError) throw linkError;
        }
      }

      // Link class responsibility
      if (formData.classResponsibility) {
        const { error: responsibilityError } = await supabase
          .from("teacher_responsibilities")
          .insert({
            teacher_id: teacher.id,
            stream_id: formData.classResponsibility,
          });

        if (responsibilityError) throw responsibilityError;
      }

      // Link assigned classes
      if (formData.assignedClasses.length > 0) {
        const assignedClassesData = formData.assignedClasses.map((streamId) => ({
          teacher_id: teacher.id,
          stream_id: streamId,
        }));

        const { error: assignError } = await supabase
          .from("teacher_assigned_classes")
          .insert(assignedClassesData);

        if (assignError) throw assignError;
      }

      toast.success("Teacher added successfully! 🎉");
      setFormData({
        name: "",
        email: "",
        maxLessons: 25,
        subjects: [],
        classResponsibility: "",
        assignedClasses: [],
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
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherId);

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
      }));
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== subject),
    }));
  };

  return (
    <DashboardLayout>
     <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="space-y-6"
>
  <motion.div
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
  >
    {/* Back Button (Left) */}
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex justify-start">
      <Button
        variant="outline"
        onClick={() => navigate("/streams")}
        className="gap-2 font-semibold rounded-full"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
    </motion.div>

    {/* Centered Title + Subtitle */}
    <div className="order-first px-1 text-center lg:order-none">
      <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-black sm:text-3xl">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          <Users className="w-8 h-8" />
        </motion.div>
        Teachers Management
      </h1>
      <p className="text-muted-foreground mt-2">
        Add and manage your teaching staff
      </p>
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
          className="w-full gap-2 rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0] sm:w-auto"
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
              <Card className="p-6 glass shimmer">
            <h2 className="text-xl font-semibold mb-4">Add New Teacher</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Teacher Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLessons">
                  Maximum Lessons per Week
                </Label>
                <Input
                  id="maxLessons"
                  type="number"
                  min="1"
                  max="40"
                  value={formData.maxLessons}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxLessons: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Subjects Taught</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add subjects this teacher will teach
                </p>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSubject}
                    disabled={!newSubject.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.subjects.map((subject, idx) => (
                      <Badge
                        key={idx}
                        variant="default"
                        className="cursor-pointer hover:scale-105 transition-transform gap-1"
                      >
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

              <AssignedClassesDropdown
                classes={streams}
                selectedClassIds={formData.assignedClasses}
                onSelectionChange={(classIds) =>
                  setFormData({
                    ...formData,
                    assignedClasses: classIds,
                  })
                }
              />

              {streams.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="classResponsibility">
                    Class Responsibility (Optional)
                  </Label>
                  <select
                    id="classResponsibility"
                    value={formData.classResponsibility}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        classResponsibility: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="rounded-full sm:w-auto"
                >
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
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {teachers.map((teacher, index) => (
              <motion.div
                key={teacher.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-12 h-12 bg-primary rounded-full flex items-center justify-center float"
                      >
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </motion.div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(teacher.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {teacher.name}
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {teacher.email}
                </p>
                <p className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Max {teacher.max_lessons_per_week} lessons/week
                </p>
              </div>
              {(teacher.subjects.length > 0 || teacher.classResponsibility || teacher.assignedClasses?.length || 0 > 0) && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  {teacher.subjects.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary mb-2">
                        Subjects:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.map((subject, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary mb-2">
                        Classes Taught:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.assignedClasses.map((cls, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            Grade {cls.grade} - {cls.stream_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {teacher.classResponsibility && (
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">
                        Class Teacher:
                      </p>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 text-center glass sm:p-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No teachers yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding your first teacher
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="gradient-primary text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
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
