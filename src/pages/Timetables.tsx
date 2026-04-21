import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Download,
  Eye,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
  Crown,
  CreditCard,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSchoolSession } from "@/lib/session";
import { PAYSTACK_PLANS } from "@/lib/paystack";
import {
  createGridForLevel,
  DEFAULT_DAYS,
  DESIGN_THEMES,
  EDUCATION_LEVELS,
  LEVEL_PERIODS,
  type CellData,
  type DesignTheme,
  type EducationLevel,
  type PeriodSlot,
  type TimetableGrid as StudioGrid,
  parseTimetableJSON,
} from "@/lib/timetableData";
import { exportTimetableToPdf } from "@/lib/exportToPdf";
import { exportTimetableToXls } from "@/lib/exportToXls";
import {
  exportTimetableFile,
  emailTimetablesToTeachers,
} from "@/pages/timetableExport";
import {
  generateStreamTimetable,
  type GeneratorTeacher,
  type GeneratorStream,
} from "@/lib/timetable-generator";
import SchoolHeader from "@/components/SchoolHeader";
import TimetableGrid from "@/components/TimetableGrid";
import DesignSelector from "@/components/DesignSelector";
import FontSelector, { FONT_OPTIONS } from "@/components/FontSelector";
import SubjectManager from "@/components/SubjectManager";

interface TimetableRow {
  id: string;
  school_id: string;
  stream_id: string;
  template_id: string | null;
  template_type: string | null;
  class_name: string | null;
  term: string | null;
  academic_year: string | null;
  generated_by: string | null;
  generated_at: string;
  status: "draft" | "final" | "exported";
  timetable_data: any[];
  streams?: {
    grade: number;
    stream_name: string;
  };
  templates?: {
    id: string;
    name: string;
  } | null;
}

// Local template using DESIGN_THEMES
type LocalTemplate = {
  id: DesignTheme;
  name: string;
  theme: DesignTheme;
};

interface BellScheduleData {
  totalLessons: number;
  lessonDurationMinutes: number;
  schoolStartTime: string;
  breaks: Array<{
    id: string;
    label: string;
    afterLesson: number;
    durationMinutes: number;
  }>;
}

const DEFAULT_TEMPLATE_NAME = "Monochrome";

type ActiveLevel = Exclude<EducationLevel, "common">;

function getLevelFromGrade(grade?: number): ActiveLevel {
  if (!grade) return "eight_four_four";
  if (grade <= 2) return "pre_primary";
  if (grade <= 3) return "lower_primary";
  if (grade <= 6) return "upper_primary";
  if (grade <= 9) return "junior_secondary";
  if (grade <= 12) return "senior_secondary";
  return "eight_four_four";
}

function getTimetableLabel(timetable: TimetableRow) {
  if (!timetable.streams) return "Unknown Stream";
  const templateName = timetable.templates?.name
    ? ` • ${timetable.templates.name}`
    : timetable.template_id
      ? ` • Template ${timetable.template_id.slice(0, 8)}`
      : "";
  return `Grade ${timetable.streams.grade} - ${timetable.streams.stream_name}${templateName}`;
}

function getHeaderClassName(timetable: TimetableRow | null): string {
  if (!timetable?.streams) return "Class";
  return timetable.class_name?.trim() || `Grade ${timetable.streams.grade} - ${timetable.streams.stream_name}`;
}

function getHeaderTerm(timetable: TimetableRow | null): string {
  return timetable?.term?.trim() || "Term 1";
}

function getHeaderYear(timetable: TimetableRow | null): string {
  return timetable?.academic_year?.trim() || new Date().getFullYear().toString();
}

function getThemeFromTemplateType(templateType: string | null): DesignTheme {
  if (templateType && templateType in DESIGN_THEMES) {
    return templateType as DesignTheme;
  }
  return "classic";
}

function buildGridFromTimetable(
  timetable: TimetableRow | null,
  days: string[],
  periods: PeriodSlot[]
): StudioGrid {
  const base = days.map(() => periods.map(() => ({ subject: "", teacher: "" })));
  if (!timetable?.timetable_data) return base;

  timetable.timetable_data.forEach((entry: any) => {
    const dayIdx = Math.max(0, (entry.day_of_week ?? 1) - 1);
    const periodIdx = Math.max(0, (entry.period_number ?? 1) - 1);
    if (!base[dayIdx] || !base[dayIdx][periodIdx]) return;
    base[dayIdx][periodIdx] = {
      subject: entry.subject_name ?? entry.subject ?? "",
      teacher: entry.teacher_name ?? entry.teacher ?? "",
    };
  });

  return base;
}

const Timetables = () => {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("ElimuTime School");
  const [userId, setUserId] = useState("");
  const [timetables, setTimetables] = useState<TimetableRow[]>([]);
  const [streams, setStreams] = useState<GeneratorStream[]>([]);
  const [teachers, setTeachers] = useState<GeneratorTeacher[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<DesignTheme>("monochrome");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null);
  const [headerClassName, setHeaderClassName] = useState("Class");
  const [headerTerm, setHeaderTerm] = useState("Term 1");
  const [headerYear, setHeaderYear] = useState(new Date().getFullYear().toString());

  const [theme, setTheme] = useState<DesignTheme>("classic");
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [days, setDays] = useState<string[]>([...DEFAULT_DAYS]);
  const [periods, setPeriods] = useState<PeriodSlot[]>([...LEVEL_PERIODS.eight_four_four]);
  const [grid, setGrid] = useState<StudioGrid>(() => createGridForLevel("eight_four_four"));
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [colorless, setColorless] = useState(false);
  const [rowColors, setRowColors] = useState<Record<number, string>>({});
  const [colColors, setColColors] = useState<Record<number, string>>({});

  // Subscription state for payment checks
  const [subscription, setSubscription] = useState<{ plan_type: string; status: string; expires_at: string | null } | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (!selectedTimetableId && timetables.length > 0) {
      setSelectedTimetableId(timetables[0].id);
    }
  }, [selectedTimetableId, timetables]);

  useEffect(() => {
    const selected = selectedTimetableId
      ? timetables.find((item) => item.id === selectedTimetableId)
      : timetables[0] || null;

    setHeaderClassName(getHeaderClassName(selected));
    setHeaderTerm(getHeaderTerm(selected));
    setHeaderYear(getHeaderYear(selected));
  }, [selectedTimetableId, timetables]);

  const parseTime = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

const convertBellScheduleToPeriods = (bellSchedule: BellScheduleData): PeriodSlot[] => {
  const periods: PeriodSlot[] = [];
  let currentTime = parseTime(bellSchedule.schoolStartTime);

  // Sort breaks by afterLesson
  const sortedBreaks = [...bellSchedule.breaks].sort((a, b) => a.afterLesson - b.afterLesson);
  const breakMap = new Map(sortedBreaks.map((b) => [b.afterLesson, b]));

  for (let i = 1; i <= bellSchedule.totalLessons; i++) {
    // Check if there's a break before this lesson
    const breakConfig = breakMap.get(i - 1);
    if (breakConfig && i > 1) {
      // Add break as a period slot
      const breakStart = new Date(currentTime);
      const breakEnd = addMinutes(breakStart, breakConfig.durationMinutes);
      periods.push({
        time: `${formatTime(breakStart)}-${formatTime(breakEnd)}`,
        label: breakConfig.label,
      });
      currentTime = breakEnd;
    }

    // Add lesson period
    const lessonStart = new Date(currentTime);
    const lessonEnd = addMinutes(lessonStart, bellSchedule.lessonDurationMinutes);
    periods.push({
      time: `${formatTime(lessonStart)}-${formatTime(lessonEnd)}`,
      label: `Lesson ${i}`,
    });
    currentTime = lessonEnd;
  }

  return periods;
};

const fetchData = async () => {
    setLoading(true);
    try {
      const session = await getCurrentSchoolSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setSchoolId(session.schoolId);
      setUserId(session.userId);

      const [
        schoolResult,
        streamsResult,
        subjectsResult,
        teachersResult,
        timetablesResult,
        subscriptionResult,
      ] = await Promise.all([
        supabase.from("schools").select("name, timetable_template, bell_schedule").eq("id", session.schoolId).single(),
        supabase
          .from("streams")
          .select("id, grade, stream_name")
          .eq("school_id", session.schoolId)
          .order("grade", { ascending: true })
          .order("stream_name", { ascending: true }),
        supabase.from("subjects").select("name").eq("school_id", session.schoolId).order("name"),
        supabase
          .from("teachers")
          .select(`
            id,
            name,
            teacher_subjects(subject_id, subjects(name)),
            teacher_assigned_classes(stream_id),
            teacher_responsibilities(stream_id)
          `)
          .eq("school_id", session.schoolId),
        supabase
          .from("timetables")
          .select(`
            *,
            streams(grade, stream_name),
            templates(id, name)
          `)
          .eq("school_id", session.schoolId)
          .order("generated_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("plan_type, status, expires_at")
          .eq("school_id", session.schoolId)
          .single(),
      ]);

      if (schoolResult.error) throw schoolResult.error;
      if (streamsResult.error) throw streamsResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      if (timetablesResult.error) throw timetablesResult.error;

      // Set subscription (allow null for new schools)
      setSubscription(subscriptionResult.data || null);

      setSchoolName(schoolResult.data?.name || "ElimuTime School");
      
      // Use local theme from school setting or default to monochrome
      const schoolTheme = (schoolResult.data?.timetable_template as DesignTheme) || "";
      const validTheme = schoolTheme in DESIGN_THEMES ? schoolTheme : "monochrome";
      const activeTheme = validTheme as DesignTheme;
      
      setCurrentTheme(activeTheme);
      setTheme(activeTheme);
      
      // Save default if none set
      if (!validTheme) {
        await supabase
          .from("schools")
          .update({ timetable_template: "monochrome" })
          .eq("id", session.schoolId);
      }

      // Load bell schedule and convert to periods (bell schedule takes precedence)
      const bellSchedule = schoolResult.data?.bell_schedule as BellScheduleData | null;
      if (bellSchedule) {
        const bellPeriods = convertBellScheduleToPeriods(bellSchedule);
        setPeriods(bellPeriods);
      }

      setStreams((streamsResult.data || []) as GeneratorStream[]);
      setSubjects((subjectsResult.data || []).map((item) => item.name));
      setTimetables((timetablesResult.data || []) as TimetableRow[]);
      setTeachers(
        (teachersResult.data || []).map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          subjects:
            teacher.teacher_subjects?.map((entry: any) => entry.subjects?.name).filter(Boolean) || [],
          assignedStreamIds: Array.from(
            new Set([
              ...(teacher.teacher_assigned_classes?.map((entry: any) => entry.stream_id) || []),
              ...(teacher.teacher_responsibilities?.map((entry: any) => entry.stream_id) || []),
            ].filter(Boolean))
          ),
        }))
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to load timetables");
    } finally {
      setLoading(false);
    }
  };

  // Local templates list for UI
  const LOCAL_TEMPLATES: LocalTemplate[] = [
    { id: "monochrome", name: "Monochrome (B&W)", theme: "monochrome" },
    { id: "kenyan", name: "Kenyan Flag", theme: "kenyan" },
    { id: "classic", name: "Classic Kenya", theme: "classic" },
    { id: "modern", name: "Modern Glass", theme: "modern" },
    { id: "vibrant", name: "Vibrant Colors", theme: "vibrant" },
    { id: "midnight", name: "Midnight Black", theme: "midnight" },
    { id: "slate", name: "Slate Pro", theme: "slate" },
  ];

  const filteredTimetables = useMemo(() => {
    if (!searchQuery.trim()) return timetables;
    return timetables.filter((timetable) =>
      getTimetableLabel(timetable).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, timetables]);

  const selectedTimetable =
    timetables.find((item) => item.id === selectedTimetableId) ?? timetables[0] ?? null;

  useEffect(() => {
    if (!selectedTimetable) return;

    const nextDays = [...DEFAULT_DAYS];
    setDays(nextDays);
    // Only set default periods if we don't have bell schedule periods already
    setPeriods((currentPeriods) => {
      if (currentPeriods && currentPeriods.length > 0) {
        return currentPeriods; // Keep bell schedule periods
      }
      const level = getLevelFromGrade(selectedTimetable.streams?.grade);
      return [...LEVEL_PERIODS[level]];
    });
    setGrid((currentGrid) => {
      const newPeriods = periods.length > 0 ? periods : LEVEL_PERIODS[getLevelFromGrade(selectedTimetable.streams?.grade)];
      return buildGridFromTimetable(selectedTimetable, nextDays, newPeriods);
    });
    setTheme(getThemeFromTemplateType(selectedTimetable.template_type));
    setRowColors({});
    setColColors({});
    setCustomSubjects([]);
  }, [selectedTimetable]);

  const handleGenerate = async () => {
    if (!schoolId) return toast.error("School information is missing.");
    if (streams.length === 0) return toast.error("Create streams first before generating timetables.");
    if (teachers.length === 0) return toast.error("Add teachers first before generating timetables.");

    setGenerating(true);
    try {
      const payload = streams.map((stream) => {
        // Use current periods and days
        const templatePeriods = periods;
        const templateDays = days;
        
        const generated = generateStreamTimetable({
          stream,
          teachers,
          fallbackSubjects: subjects,
        });

        return {
          school_id: schoolId,
          stream_id: stream.id,
          template_id: null,
          template_type: theme,
          class_name: headerClassName,
          term: headerTerm,
          academic_year: headerYear,
          generated_by: userId,
          generated_at: new Date().toISOString(),
          status: generated.status,
          timetable_data: generated.timetable_data,
          // Store elimutime template config
          template_config: {
            days: templateDays,
            periods: templatePeriods,
            theme: theme,
            font_family: fontFamily,
            colorless: colorless,
          }
        };
      });

      const { error } = await supabase.from("timetables").upsert(payload, { onConflict: "school_id,stream_id" });
      if (error) throw error;

      toast.success("Timetables generated and saved successfully.");
      setSelectedTimetableId(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate timetables");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveStudio = async () => {
    if (!selectedTimetable) return toast.error("Choose a timetable to save.");

    setSaving(true);
    try {
      const teacherByName = new Map(teachers.map((teacher) => [teacher.name.toLowerCase(), teacher.id]));
      const entries = days.flatMap((day, dayIdx) =>
        periods.map((period, periodIdx) => {
          const cell = grid[dayIdx]?.[periodIdx] ?? { subject: "", teacher: "" };
          const teacherId = teacherByName.get(cell.teacher.toLowerCase()) ?? cell.teacher.toLowerCase().replace(/\s+/g, "-");

          return {
            id: `${selectedTimetable.stream_id}-${dayIdx + 1}-${periodIdx + 1}`,
            period_id: `${dayIdx + 1}-${periodIdx + 1}`,
            day_of_week: dayIdx + 1,
            subject_id: cell.subject.toLowerCase().replace(/\s+/g, "-"),
            subject_name: cell.subject || period.label,
            teacher_id: teacherId || "unassigned",
            teacher_name: cell.teacher || "Unassigned Teacher",
            stream_id: selectedTimetable.stream_id,
            notes: `${day} ${period.label}`,
            is_locked: false,
            period_number: periodIdx + 1,
          };
        })
      );

      const { error } = await supabase
        .from("timetables")
        .update({
          template_id: selectedTimetable.template_id || selectedTemplate?.id || null,
          template_type: theme,
          class_name: headerClassName,
          term: headerTerm,
          academic_year: headerYear,
          timetable_data: entries,
          generated_at: new Date().toISOString(),
        })
        .eq("id", selectedTimetable.id);

      if (error) throw error;
      toast.success("Timetable changes saved.");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("timetables").delete().eq("id", id);
      if (error) throw error;
      toast.success("Timetable deleted.");
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete timetable");
    }
  };

  // Check if user has active subscription for exports
  const hasActiveSubscription = () => {
    if (!subscription) return false;
    if (subscription.status !== "active") return false;
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return false;
    return true;
  };

  // Prompt user to upgrade if they try to export without subscription
  const promptPayment = (feature: string) => {
    const plan = subscription?.plan_type && subscription.plan_type in PAYSTACK_PLANS
      ? PAYSTACK_PLANS[subscription.plan_type as keyof typeof PAYSTACK_PLANS]
      : PAYSTACK_PLANS.basic;

    toast.error(
      <div className="space-y-2">
        <p className="font-semibold">Upgrade Required</p>
        <p className="text-sm">{feature} requires an active subscription.</p>
        <Button
          size="sm"
          onClick={() => navigate("/billing")}
          className="w-full mt-2"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Upgrade to {plan.name}
        </Button>
      </div>,
      { duration: 8000 }
    );
  };

  const handlePdfExport = async () => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
    if (!hasActiveSubscription()) {
      return promptPayment("PDF export");
    }
    const safeName = getTimetableLabel(selectedTimetable).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    await exportTimetableToPdf("timetable-studio-print", `${safeName}.pdf`);
  };

  const handleExcelExport = () => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
    if (!hasActiveSubscription()) {
      return promptPayment("Excel export");
    }
    exportTimetableToXls(grid, schoolName, headerClassName, headerTerm, headerYear, periods);
    toast.success("Excel file exported.");
  };

  const handleImageExport = async (format: "pdf" | "png" | "jpeg") => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
    if (!hasActiveSubscription()) {
      return promptPayment(`${format.toUpperCase()} export`);
    }
    await exportTimetableFile(
      {
        ...(selectedTimetable as any),
        name: headerClassName,
        timetable_data: days.flatMap((_, dayIdx) =>
          periods.map((_, periodIdx) => ({
            id: `${dayIdx + 1}-${periodIdx + 1}`,
            day_of_week: dayIdx + 1,
            period_number: periodIdx + 1,
            subject_name: grid[dayIdx]?.[periodIdx]?.subject || "",
            teacher_name: grid[dayIdx]?.[periodIdx]?.teacher || "",
          }))
        ),
      },
      format
    );
  };

  const handleEmailTeachers = async () => {
    if (filteredTimetables.length === 0) return toast.error("No generated timetables to email.");
    await emailTimetablesToTeachers(
      filteredTimetables.map((timetable) => ({ ...(timetable as any), name: getTimetableLabel(timetable) })),
      schoolId
    );
    toast.success("Email dispatch request prepared.");
  };

  const handleJsonImport = (json: string) => {
    const result = parseTimetableJSON(json);
    if (!result) {
      toast.error("Invalid JSON format.");
      return;
    }
    setGrid(result.grid);
    if (result.subjects) {
      setCustomSubjects((prev) => Array.from(new Set([...prev, ...result.subjects!])));
    }
    toast.success("JSON imported into the studio.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/teachers")} className="gap-2 rounded-full font-semibold">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            <div className="hidden md:flex gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={() => navigate("/bell-schedule")} className="gap-2 rounded-full font-semibold">
                <Bell className="w-4 h-4" />
                Bell Schedule
              </Button>
              <Button variant="outline" onClick={handleEmailTeachers} className="gap-2 rounded-full font-semibold">
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="bg-[#359AFF] text-white hover:bg-[#1F73E0] gap-2 font-semibold rounded-full">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate New
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold inline-flex items-center gap-3" style={{ fontFamily: "Recoleta, serif", color: "rgb(13, 60, 68)" }}>
              <Calendar className="w-8 h-8" />
              AI Timetable Studio
            </h1>
            <p className="text-muted-foreground mt-2 mx-auto max-w-3xl">
              Generate, edit, and export Kenyan school timetables using the current ElimuTime theme.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:hidden">
            <Button variant="outline" onClick={() => navigate("/bell-schedule")} className="gap-2 rounded-full font-semibold">
              <Bell className="w-4 h-4" />
              Bell Schedule
            </Button>
            <Button variant="outline" onClick={handleEmailTeachers} className="gap-2 rounded-full font-semibold">
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-[#359AFF] text-white hover:bg-[#1F73E0] gap-2 font-semibold rounded-full">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate New
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current theme</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{DESIGN_THEMES[currentTheme].name}</p>
                <Badge variant="outline" className="text-xs">
                  {currentTheme}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Streams</p>
              <p className="font-semibold">{streams.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teachers</p>
              <p className="font-semibold">{teachers.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saved timetables</p>
              <p className="font-semibold">{timetables.length}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Select visual theme</p>
            <div className="flex flex-wrap gap-2">
              {LOCAL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setCurrentTheme(template.theme);
                    setTheme(template.theme);
                    // Save selection to school
                    supabase.from("schools").update({ timetable_template: template.theme }).eq("id", schoolId);
                    toast.success(`Switched to ${template.name}`);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    currentTheme === template.theme
                      ? "bg-primary text-white"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by stream..." className="pl-10" />
          </div>
        </Card>

        {loading ? (
          <Card className="p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Loading timetable data...</p>
          </Card>
        ) : filteredTimetables.length === 0 ? (
          <Card className="p-6 text-center sm:p-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No timetables yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate timetables after setting up streams, teachers, subjects, and a template.
            </p>
            <Button onClick={handleGenerate} className="bg-[#359AFF] text-white hover:bg-[#1F73E0] gap-2 font-semibold rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Generate Timetables
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <Card className="p-4 space-y-3">
              {filteredTimetables.map((timetable) => {
                const active = timetable.id === selectedTimetable?.id;
                return (
                  <button
                    key={timetable.id}
                    type="button"
                    onClick={() => setSelectedTimetableId(timetable.id)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge>{timetable.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(timetable.generated_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-semibold">{getTimetableLabel(timetable)}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{Array.isArray(timetable.timetable_data) ? timetable.timetable_data.length : 0} entries</p>
                  </button>
                );
              })}
            </Card>

            <div className="space-y-6">
              {selectedTimetable && (
                <>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-bold">{getTimetableLabel(selectedTimetable)}</h2>
                        <p className="text-muted-foreground">
                          {EDUCATION_LEVELS[getLevelFromGrade(selectedTimetable.streams?.grade)].label} • Theme {DESIGN_THEMES[theme].name}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <FontSelector value={fontFamily} onChange={setFontFamily} />
                        <Button variant="outline" onClick={() => setColorless(!colorless)} className="gap-2">
                          <Eye className="w-4 h-4" />
                          {colorless ? "Color" : "B&W"}
                        </Button>
                        <Button variant="outline" onClick={handlePdfExport} className="gap-2">
                          <Download className="w-4 h-4" />
                          PDF
                        </Button>
                        <Button variant="outline" onClick={handleExcelExport} className="gap-2">
                          <Download className="w-4 h-4" />
                          Excel
                        </Button>
                        <Button variant="outline" onClick={() => handleImageExport("png")} className="gap-2">
                          <Download className="w-4 h-4" />
                          PNG
                        </Button>
                        <Button onClick={handleSaveStudio} disabled={saving} className="gap-2 bg-[#359AFF] text-white hover:bg-[#1F73E0]">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => handleDelete(selectedTimetable.id)} className="gap-2 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-primary/10 bg-primary/5">
                    <p className="text-sm text-foreground">
                      Click any timetable cell to edit subjects and teachers, then adjust the school, class, term, and year fields above before saving.
                    </p>
                  </Card>

                  <div
                    id="timetable-studio-print"
                    className="bg-card rounded-xl shadow-lg border border-border overflow-hidden"
                    style={{ fontFamily }}
                  >
                    <SchoolHeader
                      schoolName={schoolName}
                      className={headerClassName}
                      term={headerTerm}
                      year={headerYear}
                      onSchoolNameChange={setSchoolName}
                      onClassNameChange={setHeaderClassName}
                      onTermChange={setHeaderTerm}
                      onYearChange={setHeaderYear}
                      theme={theme}
                    />
                    <div className="p-3">
                      <TimetableGrid
                        grid={grid}
                        days={days}
                        periods={periods}
                        onCellChange={(dayIdx, periodIdx, data) =>
                          setGrid((prev) => {
                            const next = prev.map((row) => [...row]);
                            next[dayIdx][periodIdx] = data;
                            return next;
                          })
                        }
                        onPeriodChange={(periodIdx, slot) =>
                          setPeriods((prev) => {
                            const next = [...prev];
                            next[periodIdx] = slot;
                            return next;
                          })
                        }
                        theme={theme}
                        customSubjects={customSubjects}
                        colorless={colorless}
                        rowColors={rowColors}
                        colColors={colColors}
                        onRowColorChange={(idx, color) => setRowColors((prev) => ({ ...prev, [idx]: color }))}
                        onColColorChange={(idx, color) => setColColors((prev) => ({ ...prev, [idx]: color }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <DesignSelector theme={theme} onThemeChange={setTheme} />
                    <SubjectManager
                      customSubjects={customSubjects}
                      onAddSubject={(name) => setCustomSubjects((prev) => [...prev, name])}
                      onRemoveSubject={(name) => setCustomSubjects((prev) => prev.filter((subject) => subject !== name))}
                      onJsonImport={handleJsonImport}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Timetables;
