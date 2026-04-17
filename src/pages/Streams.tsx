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
import { getCurrentSchoolSession } from "@/lib/session";
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
  const [streams, setStreams] = useState<Stream[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstGrade: "",
    lastGrade: "",
    streamNames: "",
  });

  useEffect(() => {
    fetchStreams();
  }, [navigate]);

  const fetchStreams = async () => {
    const session = await getCurrentSchoolSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setSchoolId(session.schoolId);

    const { data: streamsData } = await supabase
      .from("streams")
      .select("*")
      .eq("school_id", session.schoolId)
      .order("grade", { ascending: true })
      .order("stream_name", { ascending: true });

    setStreams(streamsData || []);
  };

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

      // Create all combinations of grades and streams
      const streamsToCreate = [];
      for (let grade = firstGrade; grade <= lastGrade; grade++) {
        for (const streamName of streamNamesArray) {
          streamsToCreate.push({
            school_id: schoolId,
            grade: grade,
            stream_name: streamName,
          });
        }
      }

      const { error } = await supabase.from("streams").insert(streamsToCreate);

      if (error) throw error;

      toast.success(
        `Successfully created ${streamsToCreate.length} streams!`
      );
      setFormData({
        firstGrade: "",
        lastGrade: "",
        streamNames: "",
      });
      setShowForm(false);
      fetchStreams();
    } catch (error: any) {
      toast.error(error.message || "Failed to create streams");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (streamId: string) => {
    try {
      const { error } = await supabase
        .from("streams")
        .delete()
        .eq("id", streamId);

      if (error) throw error;

      toast.success("Stream deleted");
      fetchStreams();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete stream");
    }
  };

  const groupedStreams = streams.reduce((acc, stream) => {
    if (!acc[stream.grade]) {
      acc[stream.grade] = [];
    }
    acc[stream.grade].push(stream);
    return acc;
  }, {} as Record<number, Stream[]>);

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
    className="flex items-center justify-between w-full"
  >
    {/* Back Button (Left) */}
    <div>
      <Button
        variant="outline"
        onClick={() => navigate("/dashboard")}
        className="gap-2 font-semibold rounded-full"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
    </div>

    {/* Centered Title + Subtitle */}
    <div className="text-center">
      <h1 className="text-3xl font-bold text-black flex items-center justify-center gap-3">
        <BookOpen className="w-8 h-8" />
        Streams & Classes
      </h1>
      <p className="text-muted-foreground mt-2">
        Configure grades and stream organization
      </p>
    </div>

    {/* Next Button (Right) */}
    <div>
      <Button
        onClick={() => navigate("/teachers")}
        className="bg-[#FACC15] text-[#000000] hover:bg-[#F5BD0D] text-base gap-2 font-semibold rounded-full"
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
              <Card className="p-6 glass shimmer">
            <h2 className="text-xl font-semibold mb-4">Create Streams</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstGrade">First Grade *</Label>
                  <Input
                    id="firstGrade"
                    type="number"
                    min="1"
                    max="12"
                    placeholder="e.g., 1"
                    value={formData.firstGrade}
                    onChange={(e) =>
                      setFormData({ ...formData, firstGrade: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, lastGrade: e.target.value })
                    }
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
                  onChange={(e) =>
                    setFormData({ ...formData, streamNames: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter stream names separated by commas. Each stream will be
                  created for every grade in the range.
                </p>
              </div>

              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Preview:
                </p>
                <p className="font-semibold">
                  {formData.firstGrade && formData.lastGrade && formData.streamNames
                    ? `Will create ${
                        (parseInt(formData.lastGrade) - parseInt(formData.firstGrade) + 1) *
                        formData.streamNames.split(",").filter((s) => s.trim()).length
                      } streams (Grades ${formData.firstGrade}-${formData.lastGrade} with streams: ${formData.streamNames})`
                    : "Enter details to see preview"}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#FACC15] text-[#000000] hover:bg-[#F5BD0D] font-semibold rounded-full"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {Object.keys(groupedStreams).length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
            className="space-y-6"
          >
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedStreams)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([grade, gradeStreams], index) => (
                  <motion.div
                    key={grade}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card className="p-6 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-primary mb-4">
                          Grade {grade}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {gradeStreams.map((stream) => (
                            <motion.div
                              key={stream.id}
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                              className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-accent transition-colors group/item"
                            >
                              <Badge variant="outline" className="font-semibold">
                                {stream.stream_name}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(stream.id)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          !showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-12 text-center glass">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                No streams configured yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first stream to organize classes
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="rounded-full gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Streams
              </Button>
            </Card>
            </motion.div>
          )
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Streams;
