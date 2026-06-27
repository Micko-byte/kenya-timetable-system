import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";
import { Upload, FileText, Trash2, Loader2, Sparkles, Users } from "lucide-react";
import { useEffect } from "react";
import { getCurrentSchoolSession } from "@/lib/session";
import { extractTeachersFromFile, importExtractedTeachers, type ExtractedTeacher } from "@/lib/parseTimetable";

interface Upload {
  id: string;
  file_url: string;
  type: string;
  uploaded_at: string;
}

export const PastTimetableUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedTeacher[] | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    const session = await getCurrentSchoolSession();
    if (!session) return;

    setSchoolId(session.schoolId);

    const { data: uploadsData } = await supabase
      .from("uploads")
      .select("*")
      .eq("school_id", session.schoolId)
      .eq("type", "past_tt")
      .order("uploaded_at", { ascending: false });

    setUploads(uploadsData || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !schoolId) return;

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${schoolId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("timetable-uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("timetable-uploads")
        .getPublicUrl(fileName);

      // Save to uploads table
      const { error: insertError } = await supabase
        .from("uploads")
        .insert({
          school_id: schoolId,
          file_url: publicUrl,
          type: "past_tt",
        });

      if (insertError) throw insertError;

      toast.success("Past timetable uploaded successfully");
      fetchUploads();
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to upload file"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (uploadId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("timetable-uploads")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("uploads")
        .delete()
        .eq("id", uploadId);

      if (dbError) throw dbError;

      toast.success("File deleted");
      fetchUploads();
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to delete file"));
    }
  };

  const handleExtract = async (upload: Upload) => {
    setExtractingId(upload.id);
    setExtracted(null);
    try {
      const teachers = await extractTeachersFromFile(upload.file_url);
      if (teachers.length === 0) {
        toast.error("No teachers could be read from that file. Try a clearer image or a different file.");
      } else {
        setExtracted(teachers);
        toast.success(`Found ${teachers.length} teacher${teachers.length === 1 ? "" : "s"} in the timetable.`);
      }
    } catch (error: any) {
      toast.error(friendlyError(error, "Could not read the timetable."));
    } finally {
      setExtractingId(null);
    }
  };

  const handleImport = async () => {
    if (!extracted || !schoolId) return;
    setImporting(true);
    try {
      const { imported, unmatchedClasses } = await importExtractedTeachers(schoolId, extracted);
      toast.success(`Imported ${imported} teacher${imported === 1 ? "" : "s"}.`);
      if (unmatchedClasses.length) {
        toast(`Heads up — these classes aren't streams yet: ${unmatchedClasses.join(", ")}. Add those streams, then re-import to link them.`);
      }
      setExtracted(null);
    } catch (error: any) {
      toast.error(friendlyError(error, "Failed to import teachers."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Upload Past Timetables</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Upload a previous timetable (image, PDF, or Excel) and let AI read out the
        teachers, their subjects, and the classes they teach — then import them in one click.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File (PDF, Excel, Image)</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        )}

        {uploads.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files</Label>
            <div className="space-y-2">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm">
                      {new Date(upload.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={extractingId !== null || importing}
                      onClick={() => handleExtract(upload)}
                    >
                      {extractingId === upload.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Extract teachers
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(upload.id, upload.file_url)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {extracted && extracted.length > 0 && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">
                Found {extracted.length} teacher{extracted.length === 1 ? "" : "s"}
              </h4>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {extracted.map((t, i) => (
                <div key={i} className="rounded-md border bg-card p-2 text-xs">
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-muted-foreground">{t.subjects.join(", ") || "No subjects detected"}</div>
                  <div className="mt-0.5 text-muted-foreground">
                    {(t.classes || []).map((c) => `Grade ${c.grade} ${c.stream}`).join(" · ") || "No classes detected"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" disabled={importing} onClick={handleImport}>
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Import {extracted.length} teacher{extracted.length === 1 ? "" : "s"}
              </Button>
              <Button size="sm" variant="ghost" disabled={importing} onClick={() => setExtracted(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
