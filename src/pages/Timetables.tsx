import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Download, RotateCcw, FileText, GraduationCap, Plus, X, Palette } from 'lucide-react';
import SchoolHeader from '@/features/timetable/components/SchoolHeader';
import TimetableGridComponent from '@/features/timetable/components/TimetableGrid';
import SubjectManager from '@/features/timetable/components/SubjectManager';
import DesignSelector from '@/features/timetable/components/DesignSelector';
import FontSelector, { FONT_OPTIONS } from '@/features/timetable/components/FontSelector';
import {
  createGridForLevel, CellData, TimetableGrid, DesignTheme, parseTimetableJSON,
  EducationLevel, EDUCATION_LEVELS, LEVEL_PERIODS, PeriodSlot, getSubjectsByLevel,
  DEFAULT_DAYS, ALL_DAYS, MasterTimetable, aggregateTeacherTimetable,
} from '@/features/timetable/lib/timetableData';
import { exportTimetableToXls } from '@/features/timetable/lib/exportToXls';
import { exportTimetableToPdf } from '@/features/timetable/lib/exportToPdf';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import PaymentDialog from '@/features/timetable/components/PaymentDialog';
import { useLocation } from 'react-router-dom';
import { paystackApi } from '@/lib/paystack';

type ActiveLevel = Exclude<EducationLevel, 'common'>;
type StreamRecord = { id: string; grade: number; stream_name: string };
type TeacherRecord = {
  id: string;
  name: string;
  subjects: string[];
  assignedStreamIds: string[];
  subjectClassLinks: Array<{ subject: string; streamId: string }>;
};
type TeacherCalendar = Record<string, Set<string>>;

const LEVELS: { key: ActiveLevel; defaultSchool: string; defaultClass: string }[] = [
  { key: 'pre_primary', defaultSchool: 'Brightstone Schools Pre-School', defaultClass: 'PP2' },
  { key: 'lower_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 2' },
  { key: 'upper_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 5' },
  { key: 'junior_secondary', defaultSchool: 'Brightstone Schools Junior Secondary', defaultClass: 'Grade 8' },
  { key: 'senior_secondary', defaultSchool: 'Brightstone Schools Senior School', defaultClass: 'Grade 11 - STEM' },
  { key: 'eight_four_four', defaultSchool: 'Brightstone Schools Secondary', defaultClass: 'Form 2A' },
];

const gradeToLevel = (grade: number): ActiveLevel => {
  if (grade <= 3) return 'lower_primary';
  if (grade <= 6) return 'upper_primary';
  if (grade <= 9) return 'junior_secondary';
  if (grade <= 12) return 'senior_secondary';
  return 'eight_four_four';
};

const formatStreamLabel = (stream: StreamRecord) => `Grade ${stream.grade} - ${stream.stream_name}`;

const normalizeText = (value: string) => value.trim().toLowerCase();
const slotKey = (dayIdx: number, periodIdx: number) => `${dayIdx}:${periodIdx}`;

function pickTeacherForSubject(
  teachers: TeacherRecord[],
  stream: StreamRecord,
  subject: string,
  slot: string,
  teacherCalendar: TeacherCalendar,
) {
  const exactMatches = teachers.filter((teacher) =>
    teacher.subjectClassLinks.some(
      (link) => link.streamId === stream.id && normalizeText(link.subject) === normalizeText(subject),
    ),
  );
  const assignedMatches = teachers.filter(
    (teacher) =>
      teacher.assignedStreamIds.includes(stream.id) && teacher.subjects.some((teacherSubject) => normalizeText(teacherSubject) === normalizeText(subject)),
  );
  const generalMatches = teachers.filter((teacher) => teacher.subjects.some((teacherSubject) => normalizeText(teacherSubject) === normalizeText(subject)));

  const candidateTeachers = [...exactMatches, ...assignedMatches, ...generalMatches].filter(
    (teacher, index, list) => list.findIndex((item) => item.id === teacher.id) === index,
  );

  for (const teacher of candidateTeachers) {
    const teacherKey = normalizeText(teacher.name);
    if (!teacherKey) continue;

    if (!teacherCalendar[teacherKey]) {
      teacherCalendar[teacherKey] = new Set<string>();
    }

    if (!teacherCalendar[teacherKey].has(slot)) {
      teacherCalendar[teacherKey].add(slot);
      return teacher.name;
    }
  }

  return '';
}

function buildStreamGrid(
  stream: StreamRecord,
  teachers: TeacherRecord[],
  periods: PeriodSlot[],
  activeLevel: ActiveLevel,
  teacherCalendar: TeacherCalendar,
): TimetableGrid {
  const levelSubjects = getSubjectsByLevel(activeLevel).filter(
    (subject) => !['BREAK', 'LUNCH', 'Games', 'Physical Education'].includes(subject),
  );

  const linkedSubjects = Array.from(
    new Set(
      teachers.flatMap((teacher) =>
        teacher.subjectClassLinks
          .filter((link) => link.streamId === stream.id)
          .map((link) => link.subject),
      ),
    ),
  ).filter(Boolean);

  const assignedTeacherSubjects = Array.from(
    new Set(
      teachers.flatMap((teacher) =>
        teacher.assignedStreamIds.includes(stream.id) ? teacher.subjects : [],
      ),
    ),
  ).filter(Boolean);

  const subjectPool = linkedSubjects.length > 0
    ? linkedSubjects
    : assignedTeacherSubjects.length > 0
      ? assignedTeacherSubjects
      : levelSubjects;

  if (subjectPool.length === 0) {
    return DEFAULT_DAYS.map(() => periods.map(() => ({ subject: '', teacher: '' })));
  }

  return DEFAULT_DAYS.map((_, dayIdx) =>
    periods.map((period, periodIdx) => {
      const label = period.label.toUpperCase();
      if (label === 'BREAK') return { subject: 'BREAK', teacher: '' };
      if (label === 'LUNCH') return { subject: 'LUNCH', teacher: '' };
      if (label.includes('GAME') || label.includes('OUTDOOR') || label.includes('FREE PLAY')) {
        return { subject: period.label, teacher: '' };
      }

      const startIndex = (dayIdx * periods.length + periodIdx) % subjectPool.length;
      for (let offset = 0; offset < subjectPool.length; offset += 1) {
        const subject = subjectPool[(startIndex + offset) % subjectPool.length];
        const teacher = pickTeacherForSubject(teachers, stream, subject, slotKey(dayIdx, periodIdx), teacherCalendar);
        if (teacher) {
          return { subject, teacher };
        }
      }

      return { subject: '', teacher: '' };
    }),
  );
}

function buildAllStreamGrids(streams: StreamRecord[], teachers: TeacherRecord[], periods: PeriodSlot[]) {
  const teacherCalendar: TeacherCalendar = {};
  const orderedStreams = [...streams].sort((a, b) => a.grade - b.grade || a.stream_name.localeCompare(b.stream_name));

  return orderedStreams.reduce<Record<string, TimetableGrid>>((acc, stream) => {
    acc[stream.id] = buildStreamGrid(stream, teachers, periods, gradeToLevel(stream.grade), teacherCalendar);
    return acc;
  }, {});
}

const Timetables = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [activeLevel, setActiveLevel] = useState<ActiveLevel>('eight_four_four');
  const [schoolName, setSchoolName] = useState('Brightstone Schools Secondary');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [className, setClassName] = useState('Form 2A');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState('2026');
  const [days, setDays] = useState<string[]>([...DEFAULT_DAYS]);
  const [periods, setPeriods] = useState<PeriodSlot[]>([...LEVEL_PERIODS.eight_four_four]);
  const [grid, setGrid] = useState<TimetableGrid>(() => createGridForLevel('eight_four_four'));
  const [theme, setTheme] = useState<DesignTheme>('classic_kenya');
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [colorless, setColorless] = useState(true);
  const [rowColors, setRowColors] = useState<Record<number, string>>({});
  const [colColors, setColColors] = useState<Record<number, string>>({});
  const [viewMode, setViewMode] = useState<'stream' | 'teacher'>('stream');
  const [masterData, setMasterData] = useState<MasterTimetable | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [streamGrids, setStreamGrids] = useState<Record<string, TimetableGrid>>({});
  const [lastVerifiedReference, setLastVerifiedReference] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserSchool = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', profile.school_id)
          .maybeSingle();

        if (schoolData?.name) {
          setSchoolName(schoolData.name);
        }

      setSchoolId(profile.school_id);
      setUserEmail(user.email || null);

      const [
        { data: streamsData },
        { data: teachersData },
      ] = await Promise.all([
        supabase
          .from('streams')
          .select('id, grade, stream_name')
          .eq('school_id', profile.school_id)
          .order('grade', { ascending: true }),
        supabase
          .from('teachers')
          .select(`
            id,
            name,
            teacher_subjects(subjects(name)),
            teacher_assigned_classes(stream_id),
            teacher_subject_classes(stream_id, subjects(name))
          `)
          .eq('school_id', profile.school_id),
      ]);

      const formattedTeachers: TeacherRecord[] = (teachersData || []).map((teacher: any) => ({
        id: teacher.id,
        name: teacher.name,
        subjects:
          teacher.teacher_subjects?.map((entry: any) => entry.subjects?.name).filter(Boolean) || [],
        assignedStreamIds:
          teacher.teacher_assigned_classes?.map((entry: any) => entry.stream_id).filter(Boolean) || [],
        subjectClassLinks:
          teacher.teacher_subject_classes?.map((entry: any) => ({
            subject: entry.subjects?.name || '',
            streamId: entry.stream_id,
          })).filter((entry: any) => entry.subject && entry.streamId) || [],
      }));

      setStreams((streamsData || []) as StreamRecord[]);
      setTeachers(formattedTeachers);

      // Fetch subscription status
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status')
          .eq('school_id', profile.school_id)
          .maybeSingle();
        
        setIsSubscribed(subData?.status === 'active');

        // Fetch usage count
        const { count } = await supabase
          .from('timetables')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', profile.school_id);
        
        setUsageCount(count || 0);

        if ((streamsData || []).length > 0) {
          const initialStream = (streamsData || [])[0] as StreamRecord;
          setActiveStreamId(initialStream.id);
        }
      }
    };

    fetchUserSchool();
  }, []);

  useEffect(() => {
    if (streams.length === 0 || teachers.length === 0) {
      return;
    }

    const nextStreamGrids = buildAllStreamGrids(streams, teachers, periods);

    const nextActiveStreamId = activeStreamId || streams[0]?.id || null;
    const nextActiveStream = streams.find((stream) => stream.id === nextActiveStreamId) || streams[0];

    setStreamGrids(nextStreamGrids);
    setActiveStreamId(nextActiveStream?.id || null);
    if (nextActiveStream) {
      setGrid(nextStreamGrids[nextActiveStream.id] || createGridForLevel(gradeToLevel(nextActiveStream.grade), periods));
      setClassName(formatStreamLabel(nextActiveStream));
    }

    setMasterData({
      schoolName,
      term,
      year,
      classes: streams.map((stream) => ({
        name: formatStreamLabel(stream),
        level: gradeToLevel(stream.grade),
        grid: nextStreamGrids[stream.id] || buildStreamGrid(stream, teachers, periods, gradeToLevel(stream.grade), {}),
        days: [...DEFAULT_DAYS],
        periods,
      })),
    });

    if (!selectedTeacher && teachers.length > 0) {
      setSelectedTeacher(teachers[0].name);
    }
  }, [streams, teachers, periods, activeStreamId, schoolName, term, year, selectedTeacher]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference');
    if (!reference || reference === lastVerifiedReference) {
      return;
    }

    setLastVerifiedReference(reference);
    void (async () => {
      try {
        const result = await paystackApi.verifyPayment(reference);
        if (result.subscription_status === 'active') {
          setIsSubscribed(true);
          toast({ title: 'Payment verified', description: 'Your subscription is now active.' });
        }
      } catch (error: any) {
        toast({ title: 'Verification error', description: error.message || 'Could not verify payment.', variant: 'destructive' });
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    })();
  }, [location.search, lastVerifiedReference, toast]);

  useEffect(() => {
    if (!activeStreamId) return;
    const activeStream = streams.find((stream) => stream.id === activeStreamId);
    if (!activeStream) return;

    const currentGrid = streamGrids[activeStreamId];
    if (currentGrid) {
      setGrid(currentGrid);
    }
    setClassName(formatStreamLabel(activeStream));
  }, [activeStreamId, streamGrids, streams]);

  const switchLevel = (level: ActiveLevel) => {
    const info = LEVELS.find((l) => l.key === level)!;
    setActiveLevel(level);
    setClassName(info.defaultClass);
    const newPeriods = [...LEVEL_PERIODS[level]];
    setPeriods(newPeriods);
    setDays([...DEFAULT_DAYS]);
    const newGrid = createGridForLevel(level, newPeriods);
    setGrid(newGrid);
    toast({ title: `${EDUCATION_LEVELS[level].emoji} ${EDUCATION_LEVELS[level].label}`, description: 'Template loaded.' });
  };

  const addDay = () => {
    const available = ALL_DAYS.filter(d => !days.includes(d));
    if (available.length === 0) return;
    const newDay = available[0];
    setDays(prev => [...prev, newDay]);
    setGrid(prev => [...prev, periods.map(() => ({ subject: '', teacher: '' }))]);
  };

  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays(prev => prev.filter((_, i) => i !== idx));
    setGrid(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCellChange = useCallback(
    (dayIdx: number, periodIdx: number, data: CellData) => {
      const nextTeacher = normalizeText(data.teacher);
      if (activeStreamId && nextTeacher) {
        const conflict = streams.some((stream) => {
          if (stream.id === activeStreamId) return false;
          const otherCell = streamGrids[stream.id]?.[dayIdx]?.[periodIdx];
          return normalizeText(otherCell?.teacher || '') === nextTeacher;
        });

        if (conflict) {
          toast({
            title: 'Teacher conflict',
            description: 'That teacher is already assigned to another stream at the same time.',
            variant: 'destructive',
          });
          return;
        }
      }

      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[dayIdx][periodIdx] = data;
        return next;
      });
      if (activeStreamId) {
        setStreamGrids((prev) => {
          const currentGrid = prev[activeStreamId] || grid;
          const nextGrid = currentGrid.map((row) => [...row]);
          if (nextGrid[dayIdx]) {
            nextGrid[dayIdx][periodIdx] = data;
          }
          return { ...prev, [activeStreamId]: nextGrid };
        });
      }
    },
    [activeStreamId, grid, streamGrids, streams, toast]
  );

  const handlePeriodChange = useCallback(
    (periodIdx: number, slot: PeriodSlot) => {
      setPeriods((prev) => {
        const next = [...prev];
        next[periodIdx] = slot;
        return next;
      });
    },
    []
  );

  const handleExportXls = async () => {
    if (!isSubscribed && usageCount >= 10) {
      toast({ title: 'Usage Limit Reached', description: 'Free users are limited to 10 generated timetables. Please subscribe to unlock unlimited usage.', variant: 'destructive' });
      setShowPaymentDialog(true);
      return;
    }
    if (!isSubscribed) {
      toast({ title: 'Subscription Required', description: 'Excel export is a premium feature. Please subscribe to download.', variant: 'destructive' });
      setShowPaymentDialog(true);
      return;
    }
    try {
      setIsGenerating(true);
      await exportTimetableToXls(grid, days, periods, `${schoolName.replace(/\s+/g, '_')}_Timetable_${className}.xlsx`);
      toast({ title: 'Exported!', description: 'Downloaded as Excel file.' });
    } catch {
      toast({ title: 'Error', description: 'Excel export failed.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isSubscribed && usageCount >= 10) {
      toast({ title: 'Usage Limit Reached', description: 'Free users are limited to 10 generated timetables. Please subscribe to unlock unlimited usage.', variant: 'destructive' });
      setShowPaymentDialog(true);
      return;
    }
    if (!isSubscribed) {
      toast({ title: 'Subscription Required', description: 'PDF export is a premium feature. Please subscribe to download.', variant: 'destructive' });
      setShowPaymentDialog(true);
      return;
    }
    try {
      setIsGenerating(true);
      await exportTimetableToPdf('timetable-print', `${schoolName.replace(/\s+/g, '_')}_Timetable_${className}.pdf`);
      toast({ title: 'Exported!', description: 'Downloaded as PDF file.' });
    } catch {
      toast({ title: 'Error', description: 'PDF export failed.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    const newPeriods = [...LEVEL_PERIODS[activeLevel]];
    setPeriods(newPeriods);
    setDays([...DEFAULT_DAYS]);

    if (streams.length > 0 && teachers.length > 0) {
      const regenerated = buildAllStreamGrids(streams, teachers, newPeriods);
      setStreamGrids(regenerated);

      const currentStream = activeStreamId ? streams.find((stream) => stream.id === activeStreamId) : streams[0];
      if (currentStream) {
        setGrid(regenerated[currentStream.id] || createGridForLevel(gradeToLevel(currentStream.grade), newPeriods));
        setClassName(formatStreamLabel(currentStream));
      }
    } else {
      setGrid(createGridForLevel(activeLevel, newPeriods));
    }

    toast({ title: 'Reset', description: 'Timetable has been reset.' });
  };

  const handleAddSubject = (name: string) => setCustomSubjects((prev) => [...prev, name]);
  const handleRemoveSubject = (name: string) => setCustomSubjects((prev) => prev.filter((s) => s !== name));

  const handleJsonImport = (json: string) => {
    const result = parseTimetableJSON(json);
    if (result) {
      if (result.master) {
        setMasterData(result.master);
        setSchoolName(result.master.schoolName);
        setTerm(result.master.term);
        setYear(result.master.year);
        // Default to the first class grid
        setGrid(result.master.classes[0].grid);
        setClassName(result.master.classes[0].name);
        setActiveLevel(result.master.classes[0].level);
        toast({ title: 'Master Imported', description: `Loaded ${result.master.classes.length} classes for ${result.master.schoolName}.` });
      } else {
        setGrid(result.grid);
      }
      if (result.subjects) setCustomSubjects((prev) => [...new Set([...prev, ...result.subjects!])]);
      toast({ title: 'Imported', description: 'Timetable loaded from JSON.' });
    } else {
      toast({ title: 'Error', description: 'Invalid JSON format.', variant: 'destructive' });
    }
  };

  const levelInfo = EDUCATION_LEVELS[activeLevel];
  const subjectCount = getSubjectsByLevel(activeLevel).filter(s => !['BREAK','LUNCH','Games'].includes(s)).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background py-4 px-3">
        <div className="max-w-[1200px] mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-display font-extrabold text-foreground flex items-center gap-2">
                🇰🇪 Kenya School Timetable Creator
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Click any cell to edit • Click time headers to edit periods • CBC & 8-4-4 Curriculum
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <FontSelector value={fontFamily} onChange={setFontFamily} />
              <button
                onClick={() => setColorless(!colorless)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-md border transition-all ${
                  colorless
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-foreground border-border hover:border-primary/50'
                }`}
                title={colorless ? 'Enable subject colors' : 'Disable subject colors (B&W)'}
              >
                <Palette className="w-3 h-3" />
                {colorless ? 'B&W' : 'Color'}
              </button>
              <div className="flex bg-muted p-0.5 rounded-md border border-border">
                <button
                  onClick={() => setViewMode('stream')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${
                    viewMode === 'stream' 
                      ? 'bg-background text-primary shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Stream View
                </button>
                <button
                  onClick={() => setViewMode('teacher')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${
                    viewMode === 'teacher' 
                      ? 'bg-background text-primary shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Teacher View
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} className="text-xs h-8">
                <FileText className="w-3 h-3 mr-1" /> PDF
              </Button>
              <Button size="sm" onClick={handleExportXls} className="text-xs h-8">
                <Download className="w-3 h-3 mr-1" /> Excel
              </Button>
            </div>
          </div>

          <Card className="mb-4 border-primary/10 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-sm font-bold text-foreground">Quick timetable guide</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this flow when building a new timetable. It keeps the editor readable and makes teacher review easier.
                </p>
              </div>
              <div className="grid gap-2 text-xs md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">1. Pick a level</div>
                  <div className="text-muted-foreground mt-1">Choose CBC or 8-4-4 so the right period template loads.</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">2. Edit times</div>
                  <div className="text-muted-foreground mt-1">Click a time header to edit the start and end timestamps.</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">3. Fill lessons</div>
                  <div className="text-muted-foreground mt-1">Click any cell to set the subject and teacher for that period.</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">4. Switch views</div>
                  <div className="text-muted-foreground mt-1">Use teacher view to inspect one teacher's weekly load.</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">5. Export when ready</div>
                  <div className="text-muted-foreground mt-1">PDF and Excel export unlock after subscription is verified.</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Education Level Selector */}
          <div className="bg-card border border-border rounded-xl p-3 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2.5">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-xs font-display font-bold text-foreground">Select Education Level</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {levelInfo.emoji} {levelInfo.label} • {subjectCount} subjects • {periods.length} periods
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {LEVELS.map(({ key }) => {
                const info = EDUCATION_LEVELS[key];
                const count = getSubjectsByLevel(key).filter(s => !['BREAK','LUNCH','Games'].includes(s)).length;
                const isActive = activeLevel === key;
                return (
                  <button
                    key={key}
                    onClick={() => switchLevel(key)}
                    className={`relative group rounded-lg border-2 p-2.5 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md scale-[1.02]'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{info.emoji}</div>
                    <div className={`text-[10px] font-bold leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {info.label}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{count} subjects</div>
                    {isActive && (
                      <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Management */}
          <div className="flex items-center gap-2 mb-2 max-w-[1120px] mx-auto">
            <span className="text-[10px] font-bold text-muted-foreground">Days:</span>
            {days.map((d, i) => (
              <span key={d} className="inline-flex items-center gap-0.5 bg-muted text-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full">
                {d}
                {days.length > 1 && (
                  <button onClick={() => removeDay(i)} className="ml-0.5 hover:text-destructive">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
            {days.length < ALL_DAYS.length && (
              <button
                onClick={addDay}
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full"
              >
                <Plus className="w-2.5 h-2.5" /> Add Day
              </button>
            )}
          </div>

          {streams.length > 0 && (
            <Card className="mb-4 border-border/70 bg-card/70 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold">Stream Toggles</h3>
                  <p className="text-xs text-muted-foreground">
                    Each stream keeps its own timetable. Toggle between them to review or edit individually.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stream toggles">
                  {streams.map((stream) => {
                    const isActive = stream.id === activeStreamId;
                    return (
                      <button
                        key={stream.id}
                        type="button"
                        onClick={() => setActiveStreamId(stream.id)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-all ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            isActive ? 'bg-primary-foreground' : 'bg-muted-foreground/50'
                          }`}
                        />
                        {formatStreamLabel(stream)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* A4 Landscape Timetable */}
          <div
            id="timetable-print"
            className="bg-card rounded-xl shadow-lg border border-border overflow-hidden"
            style={{ maxWidth: '1400px', margin: '0 auto', fontFamily }}
          >
            <SchoolHeader
              schoolName={schoolName}
              className={viewMode === 'teacher' ? `TEACHER: ${selectedTeacher || 'Unassigned'}` : className}
              term={term}
              year={year}
              onSchoolNameChange={setSchoolName}
              onClassNameChange={setClassName}
              onTermChange={setTerm}
              onYearChange={setYear}
              theme={theme}
            />
            <div className="p-1.5">
              {viewMode === 'teacher' && masterData && (
                <div className="mb-4 flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground">Select Teacher:</span>
                  <select 
                    className="bg-background border border-border rounded px-2 py-1 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-primary"
                    value={selectedTeacher || ''}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                  >
                    <option value="" disabled>Choose a teacher...</option>
                    {[...new Set(masterData.classes.flatMap(c => c.grid.flatMap(r => r.map(cell => cell.teacher))))]
                      .filter(t => t.trim() !== '')
                      .sort()
                      .map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))
                    }
                  </select>
                </div>
              )}
              <TimetableGridComponent
                grid={viewMode === 'teacher' && masterData && selectedTeacher 
                  ? aggregateTeacherTimetable(masterData, selectedTeacher).grid 
                  : grid}
                days={days}
                periods={periods}
                onCellChange={handleCellChange}
                onPeriodChange={handlePeriodChange}
                theme={theme}
                customSubjects={customSubjects}
                colorless={colorless}
                rowColors={rowColors}
                colColors={colColors}
                onRowColorChange={(idx, c) => setRowColors(prev => ({ ...prev, [idx]: c }))}
                onColColorChange={(idx, c) => setColColors(prev => ({ ...prev, [idx]: c }))}
                viewMode={viewMode}
                isGenerating={isGenerating}
              />
            </div>
          </div>

          <PaymentDialog 
            open={showPaymentDialog} 
            onOpenChange={setShowPaymentDialog}
            schoolId={schoolId || undefined}
            schoolName={schoolName}
            email={userEmail || undefined}
          />

          {/* Design & Subject Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1120px] mx-auto">
            <DesignSelector theme={theme} onThemeChange={setTheme} />
            <SubjectManager
              customSubjects={customSubjects}
              onAddSubject={handleAddSubject}
              onRemoveSubject={handleRemoveSubject}
              onJsonImport={handleJsonImport}
            />
          </div>

          <p className="text-center text-[9px] text-muted-foreground mt-3">
            Designed for Kenyan CBC & 8-4-4 curriculum schools • KICD aligned
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Timetables;
