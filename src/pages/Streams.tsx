import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";
import { getCurrentSchoolSession } from "@/lib/session";
import { advanceSchoolOnboardingTour } from "@/lib/onboardingTour";
import {
  Plus,
  BookOpen,
  Trash2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Stream {
  id: string;
  grade: number;
  stream_name: string;
}

const Streams = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstGrade: "",
    lastGrade: "",
    streamNames: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["streams-page"],
    queryFn: async () => {
      const session = await getCurrentSchoolSession();
      if (!session) return null;
      const { data: streamsData } = await supabase
        .from("streams")
        .select("*")
        .eq("school_id", session.schoolId)
        .order("grade", { ascending: true })
        .order("stream_name", { ascending: true });
      return { schoolId: session.schoolId, streams: (streamsData || []) as Stream[] };
    },
  });

  useEffect(() => {
    if (data === null) navigate("/auth");
  }, [data, navigate]);

  const schoolId = data?.schoolId ?? "";
  const streams = data?.streams ?? [];
  const refreshStreams = () => queryClient.invalidateQueries({ queryKey: ["streams-page"] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const firstGrade = parseInt(formData.firstGrade);
      const lastGrade = parseInt(formData.lastGrade);
      const streamNamesArray = formData.streamNames
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      if (firstGrade > lastGrade) {
        toast.error("First grade must be less than or equal to last grade");
        setLoading(false);
        return;
      }

      if (streamNamesArray.length === 0) {
        toast.error("Please enter at least one stream name");
        setLoading(false);
        return;
      }

      const streamsToCreate = [];
      for (let grade = firstGrade; grade <= lastGrade; grade++) {
        for (const streamName of streamNamesArray) {
          streamsToCreate.push({
            school_id: schoolId,
            grade,
            stream_name: streamName,
          });
        }
      }

      const { error } = await supabase.from("streams").insert(streamsToCreate);
      if (error) throw error;

      toast.success(`Successfully created ${streamsToCreate.length} streams!`);
      setFormData({ firstGrade: "", lastGrade: "", streamNames: "" });
      setShowForm(false);
      refreshStreams();
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to create streams"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (streamId: string) => {
    try {
      const { error } = await supabase.from("streams").delete().eq("id", streamId);
      if (error) throw error;
      toast.success("Stream deleted");
      refreshStreams();
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to delete stream"));
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase.from("streams").delete().eq("school_id", schoolId);
      if (error) throw error;
      toast.success("All streams deleted");
      setDeleteAllOpen(false);
      setStreamToDelete(null);
      await refreshStreams();
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to delete streams"));
    }
  };

  const groupedStreams = streams.reduce((acc, stream) => {
    if (!acc[stream.grade]) acc[stream.grade] = [];
    acc[stream.grade].push(stream);
    return acc;
  }, {} as Record<number, Stream[]>);
  const hasStreams = Object.keys(groupedStreams).length > 0;

  const handleOpenStreamsForm = () => {
    setShowForm(true);
    if (schoolId) {
      advanceSchoolOnboardingTour(schoolId);
    }
  };

  const handleGoToTeachers = () => {
    if (schoolId) {
      advanceSchoolOnboardingTour(schoolId);
    }
    navigate("/teachers");
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] space-y-6 text-foreground">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 rounded-full font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleGoToTeachers}
              data-tour-id="tour-streams-next"
              className="rounded-full bg-[#359AFF] text-base font-semibold text-white hover:bg-[#1F73E0] lg:hidden"
            >
              Next →
            </Button>
          </div>

          <div className="order-first px-1 text-center lg:order-none">
            <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-black sm:text-3xl">
              <BookOpen className="h-8 w-8" />
              Streams & Classes
            </h1>
            <p className="mt-2 text-muted-foreground">Configure grades and stream organization</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            {hasStreams && (
              <Button
                variant="outline"
                onClick={() => setDeleteAllOpen(true)}
                className="w-full gap-2 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            )}
            <Button
              onClick={handleOpenStreamsForm}
              data-tour-id="tour-streams-add"
              className="w-full gap-2 rounded-full bg-[#359AFF] text-base font-semibold text-white hover:bg-[#1F73E0] sm:w-auto"
            >
              + Add Streams
            </Button>
            <Button
              onClick={handleGoToTeachers}
              data-tour-id="tour-streams-next"
              className="hidden w-full gap-2 rounded-full bg-[#359AFF] text-base font-semibold text-white hover:bg-[#1F73E0] sm:w-auto lg:inline-flex"
            >
              Next →
            </Button>
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
              <Card className="border-primary/10 bg-white p-6 shadow-[0_18px_40px_rgba(1,16,39,0.06)]">
                <h2 className="mb-4 text-xl font-semibold text-foreground">Create Streams</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstGrade">First Grade *</Label>
                      <Input
                        id="firstGrade"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 1"
                        value={formData.firstGrade}
                        onChange={(e) => setFormData({ ...formData, firstGrade: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastGrade">Last Grade *</Label>
                      <Input
                        id="lastGrade"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 9"
                        value={formData.lastGrade}
                        onChange={(e) => setFormData({ ...formData, lastGrade: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="streamNames">Stream Names *</Label>
                    <Input
                      id="streamNames"
                      placeholder="e.g., Blue, Pink (comma-separated)"
                      value={formData.streamNames}
                      onChange={(e) => setFormData({ ...formData, streamNames: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter stream names separated by commas. Each stream will be created for every grade in the range.
                    </p>
                  </div>

                  <div className="rounded-lg bg-secondary p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Preview:</p>
                    <p className="font-semibold text-foreground">
                      {formData.firstGrade && formData.lastGrade && formData.streamNames
                        ? `Will create ${
                            (parseInt(formData.lastGrade) - parseInt(formData.firstGrade) + 1) *
                            formData.streamNames.split(",").filter((s) => s.trim()).length
                          } streams (Grades ${formData.firstGrade}-${formData.lastGrade} with streams: ${formData.streamNames})`
                        : "Enter details to see preview"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-full bg-[#359AFF] font-semibold text-white hover:bg-[#1F73E0]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Streams"
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

        <section className="rounded-[2rem] border border-primary/10 bg-white/92 p-6 shadow-[0_18px_40px_rgba(1,16,39,0.06)]">
          {isLoading && !hasStreams ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hasStreams ? (
            <div className="space-y-6">
              {Object.entries(groupedStreams)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([grade, gradeStreams]) => (
                  <div key={grade}>
                    <Card className="relative overflow-hidden border-primary/10 bg-white p-6 shadow-[0_12px_30px_rgba(1,16,39,0.05)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity hover:opacity-100" />
                      <div className="relative z-10">
                        <h3 className="mb-4 text-xl font-bold text-primary">Grade {grade}</h3>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                          {gradeStreams.map((stream) => (
                            <div
                              key={stream.id}
                              className="group/item flex flex-col items-start gap-2 rounded-xl border border-primary/10 bg-[hsl(var(--secondary)/0.12)] p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <Badge variant="outline" className="max-w-full border-primary/20 bg-white font-semibold text-foreground">
                                {stream.stream_name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setStreamToDelete(stream)}
                                className="text-destructive opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
            </div>
          ) : (
            !showForm && (
              <div className="flex min-h-[320px] items-center justify-center">
                <Card className="w-full max-w-2xl border-primary/10 bg-white p-6 text-center shadow-[0_12px_30px_rgba(1,16,39,0.05)] sm:p-12">
                  <BookOpen className="mx-auto mb-4 h-16 w-16 text-primary" />
                  <h3 className="mb-2 text-2xl font-semibold text-foreground">No streams configured yet</h3>
                  <p className="mb-6 text-muted-foreground">
                    Create your first stream to organize classes and unlock timetable generation.
                  </p>
                  <Button onClick={handleOpenStreamsForm} className="rounded-full gradient-primary text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Streams
                  </Button>
                </Card>
              </div>
            )
          )}
        </section>

        <AlertDialog open={!!streamToDelete} onOpenChange={(open) => !open && setStreamToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete stream?</AlertDialogTitle>
              <AlertDialogDescription>
                {streamToDelete
                  ? `This will permanently remove ${streamToDelete.stream_name} from Grade ${streamToDelete.grade}.`
                  : "This will permanently remove the selected stream."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => streamToDelete && handleDelete(streamToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Stream
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all streams?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove every stream and class for your school. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete All Streams
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </DashboardLayout>
  );
};

export default Streams;
