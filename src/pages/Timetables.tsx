import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSchoolSession } from "@/lib/session";
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
  type GeneratorTemplate,
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

interface TemplateRecord extends GeneratorTemplate {}

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
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>("");
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
        templatesResult,
      ] = await Promise.all([
        supabase.from("schools").select("name, timetable_template").eq("id", session.schoolId).single(),
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
          .from("templates")
          .select("id, name, periods_per_day, days_per_week, break_config")
          .or("status.eq.deployed,is_deployed.eq.true")
          .eq("is_active", true),
      ]);

      if (schoolResult.error) throw schoolResult.error;
      if (streamsResult.error) throw streamsResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      if (timetablesResult.error) throw timetablesResult.error;
      if (templatesResult.error) throw templatesResult.error;

      setSchoolName(schoolResult.data?.name || "ElimuTime School");
      setCurrentTemplateId(schoolResult.data?.timetable_template || "");
      setStreams((streamsResult.data || []) as GeneratorStream[]);
      setSubjects((subjectsResult.data || []).map((item) => item.name));
      setTemplates((templatesResult.data || []) as TemplateRecord[]);
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === currentTemplateId) || null,
    [templates, currentTemplateId]
  );

  const filteredTimetables = useMemo(
    () => timetables.filter((timetable) => getTimetableLabel(timetable).toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, timetables]
  );

  const selectedTimetable =
    filteredTimetables.find((item) => item.id === selectedTimetableId) ?? filteredTimetables[0] ?? null;

  useEffect(() => {
    if (!selectedTimetable) return;

    const level = getLevelFromGrade(selectedTimetable.streams?.grade);
    const nextPeriods = [...LEVEL_PERIODS[level]];
    const nextDays = [...DEFAULT_DAYS];
    setDays(nextDays);
    setPeriods(nextPeriods);
    setGrid(buildGridFromTimetable(selectedTimetable, nextDays, nextPeriods));
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
        const generated = generateStreamTimetable({
          stream,
          teachers,
          fallbackSubjects: subjects,
          template: selectedTemplate,
        });

        return {
          school_id: schoolId,
          stream_id: stream.id,
          template_id: selectedTemplate?.id || currentTemplateId || null,
          template_type: theme,
          class_name: headerClassName,
          term: headerTerm,
          academic_year: headerYear,
          generated_by: userId,
          generated_at: new Date().toISOString(),
          status: generated.status,
          timetable_data: generated.timetable_data,
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

  const handlePdfExport = async () => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
    const safeName = getTimetableLabel(selectedTimetable).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    await exportTimetableToPdf("timetable-studio-print", `${safeName}.pdf`);
  };

  const handleExcelExport = () => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
    exportTimetableToXls(grid, schoolName, headerClassName, headerTerm, headerYear, periods);
    toast.success("Excel file exported.");
  };

  const handleImageExport = async (format: "pdf" | "png" | "jpeg") => {
    if (!selectedTimetable) return toast.error("Choose a timetable to export.");
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/teachers")} className="gap-2 rounded-full font-semibold">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: "Recoleta, serif", color: "rgb(13, 60, 68)" }}>
                <Calendar className="w-8 h-8" />
                AI Timetable Studio
              </h1>
              <p className="text-muted-foreground mt-2">
                Generate, edit, and export Kenyan school timetables using the current ElimuTime theme.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={handleEmailTeachers} className="gap-2 rounded-full font-semibold">
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D] gap-2 font-semibold rounded-full">
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
              <p className="text-sm text-muted-foreground">Current template</p>
              <p className="font-semibold">{selectedTemplate?.name || currentTemplateId || "Classic"}</p>
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
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No timetables yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate timetables after setting up streams, teachers, subjects, and a template.
            </p>
            <Button onClick={handleGenerate} className="bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D] gap-2 font-semibold rounded-full">
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
                        <Button onClick={handleSaveStudio} disabled={saving} className="gap-2 bg-[#FACC15] text-[#0D3C44] hover:bg-[#F5BD0D]">
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
