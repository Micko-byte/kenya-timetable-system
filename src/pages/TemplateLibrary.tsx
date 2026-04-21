import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Palette, Eye } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSchoolSession } from "@/lib/session";
import { DesignTheme, DESIGN_THEMES, DEFAULT_DAYS, LEVEL_PERIODS } from "@/lib/timetableData";

// Sample subjects for preview
const SAMPLE_SUBJECTS = ["Math", "English", "Science", "History", "Art", "PE"];
const SAMPLE_TEACHERS = ["Mr. Smith", "Ms. Jones", "Mr. Kimani", "Mrs. Wanjiku", "Mr. Omondi", "Ms. Achieng"];

// Mini timetable preview component
function MiniTimetablePreview({ theme, templateId }: { theme: typeof DESIGN_THEMES[DesignTheme]; templateId: DesignTheme }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const periods = [1, 2, 3, 4, 5];

  return (
    <div className="w-full overflow-hidden rounded border text-xs">
      {/* Header */}
      <div className={`${theme.headerBg} ${theme.headerText} px-2 py-1 font-semibold text-center`}>
        Sample Timetable Preview
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className={theme.headerBg.replace("bg-gradient-to-r", "").replace("from-black", "bg-gray-800").replace("from-blue-600", "bg-blue-600").replace("from-purple-600", "bg-purple-600").replace("from-orange-500", "bg-orange-500").replace("from-gray-900", "bg-gray-900").replace("from-slate-700", "bg-slate-700")}>
            <th className={`border p-1 ${theme.headerText}`}>Day</th>
            {periods.map((p) => (
              <th key={p} className={`border p-1 ${theme.headerText}`}>P{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dayIdx) => (
            <tr key={day} style={{ backgroundColor: dayIdx % 2 === 0 ? "white" : "#f9fafb" }}>
              <td className="border p-1 font-medium bg-gray-50">{day}</td>
              {periods.map((period, periodIdx) => {
                const subjectIdx = (dayIdx + periodIdx) % SAMPLE_SUBJECTS.length;
                const cellBg = theme.palette[subjectIdx % theme.palette.length];
                const isMonochrome = templateId === "monochrome";
                return (
                  <td
                    key={period}
                    className="border p-1 text-center"
                    style={{
                      backgroundColor: isMonochrome ? "white" : cellBg + "20",
                      color: isMonochrome ? "black" : cellBg
                    }}
                  >
                    <div className="font-medium truncate">{SAMPLE_SUBJECTS[subjectIdx]}</div>
                    <div className="text-[8px] truncate opacity-70">{SAMPLE_TEACHERS[subjectIdx]}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 7 Visual Modes - each looks distinctly different
const LOCAL_TEMPLATES: Array<{
  id: DesignTheme;
  name: string;
  description: string;
  theme: DesignTheme;
}> = [
  {
    id: "monochrome",
    name: "Monochrome (B&W)",
    description: "Clean black and white. Perfect for printing.",
    theme: "monochrome",
  },
  {
    id: "kenyan",
    name: "Kenyan Flag",
    description: "Black, red, green with Maasai shield pattern.",
    theme: "kenyan",
  },
  {
    id: "classic",
    name: "Classic Kenya",
    description: "Traditional Kenyan school colors.",
    theme: "classic",
  },
  {
    id: "modern",
    name: "Modern Glass",
    description: "Blue gradient with glass effect.",
    theme: "modern",
  },
  {
    id: "vibrant",
    name: "Vibrant Colors",
    description: "Orange, red, pink energetic gradient.",
    theme: "vibrant",
  },
  {
    id: "midnight",
    name: "Midnight Black",
    description: "Dark mode with sleek blacks.",
    theme: "midnight",
  },
  {
    id: "slate",
    name: "Slate Pro",
    description: "Professional slate gray.",
    theme: "slate",
  },
];

const DEFAULT_THEME: DesignTheme = "monochrome";

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<DesignTheme>(DEFAULT_THEME);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const session = await getCurrentSchoolSession();
      if (!session) return navigate("/auth");
      setSchoolId(session.schoolId);

      const { data: school } = await supabase
        .from("schools")
        .select("timetable_template")
        .eq("id", session.schoolId)
        .single();

      // Use stored theme or default to monochrome
      const storedTheme = (school?.timetable_template as DesignTheme) || "";
      const validTheme = LOCAL_TEMPLATES.find((t) => t.id === storedTheme)?.id;
      const activeTheme = validTheme || DEFAULT_THEME;
      setCurrentTheme(activeTheme);

      // Save default if none set
      if (!validTheme) {
        await supabase
          .from("schools")
          .update({ timetable_template: DEFAULT_THEME })
          .eq("id", session.schoolId);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTheme = async (theme: DesignTheme) => {
    if (!schoolId || theme === currentTheme) return;

    const { error } = await supabase
      .from("schools")
      .update({ timetable_template: theme })
      .eq("id", schoolId);

    if (error) return toast.error(error.message || "Failed to update template");
    setCurrentTheme(theme);
    toast.success(`Switched to ${DESIGN_THEMES[theme].name}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Palette className="w-7 h-7" />
              Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a visual theme. Monochrome (B&W) is the default for printing.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/timetables")} className="rounded-full">
            Go to Timetables
          </Button>
        </div>

        {loading ? (
          <Card className="p-8">Loading...</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LOCAL_TEMPLATES.map((template) => {
              const selected = template.id === currentTheme;
              const theme = DESIGN_THEMES[template.theme];
              return (
                <Card
                  key={template.id}
                  className={`p-5 space-y-4 border transition-all ${selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                >
                  {/* Header Preview */}
                  <div className={`h-16 rounded-lg ${theme.headerBg} ${theme.headerText} flex items-center justify-center text-lg font-bold`}>
                    {theme.name}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    {selected && (
                      <Badge className="gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    )}
                  </div>

                  {/* Full Timetable Preview */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>Timetable Preview</span>
                    </div>
                    <MiniTimetablePreview theme={theme} templateId={template.id} />
                  </div>

                  {/* Color Palette Preview */}
                  <div className="flex gap-1 flex-wrap">
                    {theme.palette.slice(0, 5).map((color, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      onClick={() => void handleSelectTheme(template.theme)}
                      disabled={selected}
                      className="flex-1 rounded-full"
                      variant={selected ? "secondary" : "default"}
                    >
                      {selected ? "Currently selected" : "Select"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
