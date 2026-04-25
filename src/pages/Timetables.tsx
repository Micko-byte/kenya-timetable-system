import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  RotateCcw,
  FileText,
  GraduationCap,
  ChevronDown,
  BookOpenCheck,
  ChevronRight,
  Wand2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import SchoolHeader from '@/features/timetable/components/SchoolHeader';
import TimetableGridComponent from '@/features/timetable/components/TimetableGrid';
import DesignSelector from '@/features/timetable/components/DesignSelector';
import FontSelector, { FONT_OPTIONS } from '@/features/timetable/components/FontSelector';
import {
  createGridForLevel, CellData, TimetableGrid, DesignTheme,
  EducationLevel, EDUCATION_LEVELS, LEVEL_PERIODS, PeriodSlot, getSubjectsByLevel,
  DEFAULT_DAYS, ALL_DAYS, MasterTimetable, aggregateTeacherTimetable,
} from '@/features/timetable/lib/timetableData';
import { exportTimetableToXls } from '@/features/timetable/lib/exportToXls';
import { exportTimetableToPdf } from '@/features/timetable/lib/exportToPdf';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import PaymentDialog from '@/features/timetable/components/PaymentDialog';
import {
  buildPricingSnapshot,
  getSelectedFrontendPlan,
  recordPlanGeneration,
} from '@/lib/planSelection';
import { advanceSchoolOnboardingTour } from '@/lib/onboardingTour';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ActiveLevel = Exclude<EducationLevel, 'common'>;
type StreamRecord = { id: string; grade: number; stream_name: string };
type TeacherRecord = {
  id: string;
  name: string;
  maxLessonsPerWeek: number;
  subjects: string[];
  assignedStreamIds: string[];
  subjectClassLinks: Array<{ subject: string; streamId: string }>;
};
type TeacherLoad = {
  slots: Set<string>;
  total: number;
  byDay: Record<number, number>;
};
type TeacherCalendar = Record<string, TeacherLoad>;

const LEVELS: { key: ActiveLevel; defaultSchool: string; defaultClass: string }[] = [
  { key: 'pre_primary', defaultSchool: 'Brightstone Schools Pre-School', defaultClass: 'PP2' },
  { key: 'lower_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 2' },
  { key: 'upper_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 5' },
  { key: 'junior_secondary', defaultSchool: 'Brightstone Schools Junior Secondary', defaultClass: 'Grade 8' },
  { key: 'senior_secondary', defaultSchool: 'Brightstone Schools Senior School', defaultClass: 'Grade 11 - STEM' },
  { key: 'eight_four_four', defaultSchool: 'Brightstone Schools Secondary', defaultClass: 'Form 2A' },
];

const LEVEL_ACCENTS: Record<ActiveLevel, string> = {
  pre_primary: 'bg-rose-500',
  lower_primary: 'bg-orange-500',
  upper_primary: 'bg-amber-500',
  junior_secondary: 'bg-emerald-500',
  senior_secondary: 'bg-sky-500',
  eight_four_four: 'bg-violet-500',
};

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

function getTeacherLoad(calendar: TeacherCalendar, teacherId: string): TeacherLoad {
  if (!calendar[teacherId]) {
    calendar[teacherId] = { slots: new Set<string>(), total: 0, byDay: {} };
  }
  return calendar[teacherId];
}

function scoreTeacherCandidate(
  teacher: TeacherRecord,
  priority: number,
  dayIdx: number,
  teacherCalendar: TeacherCalendar,
  periodsPerDay: number,
) {
  const load = getTeacherLoad(teacherCalendar, teacher.id);
  const dailyLoad = load.byDay[dayIdx] || 0;
  const dailyCap = Math.max(1, Math.ceil(periodsPerDay / 2));
  const maxLessons = teacher.maxLessonsPerWeek > 0 ? teacher.maxLessonsPerWeek : Number.POSITIVE_INFINITY;

  if (load.total >= maxLessons) {
    return null;
  }

  return {
    teacher,
    priority,
    dailyLoad,
    totalLoad: load.total,
    overDailyCap: dailyLoad >= dailyCap,
  };
}

function pickTeacherForSubject(
  teachers: TeacherRecord[],
  stream: StreamRecord,
  subject: string,
  dayIdx: number,
  periodIdx: number,
  periodsPerDay: number,
  teacherCalendar: TeacherCalendar,
) {
  const slot = slotKey(dayIdx, periodIdx);
  const exactMatches = teachers.filter((teacher) =>
    teacher.subjectClassLinks.some(
      (link) => link.streamId === stream.id && normalizeText(link.subject) === normalizeText(subject),
    ),
  );
  const assignedMatches = teachers.filter(
    (teacher) =>
      teacher.assignedStreamIds.includes(stream.id) &&
      teacher.subjects.some((teacherSubject) => normalizeText(teacherSubject) === normalizeText(subject)),
  );
  const generalMatches = teachers.filter((teacher) =>
    teacher.subjects.some((teacherSubject) => normalizeText(teacherSubject) === normalizeText(subject)),
  );

  const candidateTeachers = [...exactMatches, ...assignedMatches, ...generalMatches].filter(
    (teacher, index, list) => list.findIndex((item) => item.id === teacher.id) === index,
  );

  const scoredCandidates = candidateTeachers
    .map((teacher) => {
      const priority =
        exactMatches.some((item) => item.id === teacher.id) ? 0 :
        assignedMatches.some((item) => item.id === teacher.id) ? 1 : 2;

      const score = scoreTeacherCandidate(teacher, priority, dayIdx, teacherCalendar, periodsPerDay);
      if (!score) return null;
      return score;
    })
    .filter((item): item is NonNullable<ReturnType<typeof scoreTeacherCandidate>> => Boolean(item))
    .filter((item) => {
      const load = getTeacherLoad(teacherCalendar, item.teacher.id);
      return !load.slots.has(slot);
    });

  const preferred = scoredCandidates
    .filter((item) => !item.overDailyCap)
    .sort((a, b) =>
      a.priority - b.priority ||
      a.dailyLoad - b.dailyLoad ||
      a.totalLoad - b.totalLoad ||
      a.teacher.name.localeCompare(b.teacher.name),
    );

  const fallback = scoredCandidates
    .sort((a, b) =>
      a.priority - b.priority ||
      a.dailyLoad - b.dailyLoad ||
      a.totalLoad - b.totalLoad ||
      a.teacher.name.localeCompare(b.teacher.name),
    );

  const chosen = preferred[0] || fallback[0];
  if (chosen) {
    const load = getTeacherLoad(teacherCalendar, chosen.teacher.id);
    load.slots.add(slot);
    load.total += 1;
    load.byDay[dayIdx] = (load.byDay[dayIdx] || 0) + 1;
    return chosen.teacher.name;
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
      teachers.flatMap((teacher) => (teacher.assignedStreamIds.includes(stream.id) ? teacher.subjects : [])),
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
        const teacher = pickTeacherForSubject(
          teachers,
          stream,
          subject,
          dayIdx,
          periodIdx,
          periods.length,
          teacherCalendar,
        );
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
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [streamGrids, setStreamGrids] = useState<Record<string, TimetableGrid>>({});
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showLevelScrollCue, setShowLevelScrollCue] = useState(false);
  const levelScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUserSchool = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.school_id) {
        return;
      }

      setSchoolId(profile.school_id);
      setSchoolEmail(user.email || '');

      const { data: schoolData } = await supabase
        .from('schools')
        .select('name')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (schoolData?.name) {
        setSchoolName(schoolData.name);
      }

      const [{ data: streamsData }, { data: teachersData }, { data: subData }, { count }] = await Promise.all([
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
            max_lessons_per_week,
            teacher_subjects(subjects(name)),
            teacher_assigned_classes(stream_id),
            teacher_subject_classes(stream_id, subjects(name))
          `)
          .eq('school_id', profile.school_id),
        supabase
          .from('subscriptions')
          .select('status')
          .eq('school_id', profile.school_id)
          .maybeSingle(),
        supabase
          .from('timetables')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', profile.school_id),
      ]);

      const formattedTeachers: TeacherRecord[] = (teachersData || []).map((teacher: any) => ({
        id: teacher.id,
        name: teacher.name,
        maxLessonsPerWeek: teacher.max_lessons_per_week ?? 0,
        subjects: teacher.teacher_subjects?.map((entry: any) => entry.subjects?.name).filter(Boolean) || [],
        assignedStreamIds: teacher.teacher_assigned_classes?.map((entry: any) => entry.stream_id).filter(Boolean) || [],
        subjectClassLinks:
          teacher.teacher_subject_classes?.map((entry: any) => ({
            subject: entry.subjects?.name || '',
            streamId: entry.stream_id,
          })).filter((entry: any) => entry.subject && entry.streamId) || [],
      }));

      setStreams((streamsData || []) as StreamRecord[]);
      setTeachers(formattedTeachers);
      setIsSubscribed(subData?.status === 'active');
      setUsageCount(count || 0);

      if ((streamsData || []).length > 0) {
        const initialStream = (streamsData || [])[0] as StreamRecord;
        setActiveStreamId(initialStream.id);
      }
    };

    void fetchUserSchool();
  }, []);

  useEffect(() => {
    if (streams.length === 0) {
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

  const buildGeneratedState = useCallback(
    (nextPeriods: PeriodSlot[] = periods) => {
      if (streams.length === 0) {
        return null;
      }

      const nextStreamGrids = buildAllStreamGrids(streams, teachers, nextPeriods);
      const nextActiveStreamId = activeStreamId || streams[0]?.id || null;
      const nextActiveStream = streams.find((stream) => stream.id === nextActiveStreamId) || streams[0];

      return {
        streamGrids: nextStreamGrids,
        activeStream: nextActiveStream,
        grid:
          nextActiveStream
            ? nextStreamGrids[nextActiveStream.id] || createGridForLevel(gradeToLevel(nextActiveStream.grade), nextPeriods)
            : createGridForLevel(activeLevel, nextPeriods),
        masterData: {
          schoolName,
          term,
          year,
          classes: streams.map((stream) => ({
            name: formatStreamLabel(stream),
            level: gradeToLevel(stream.grade),
            grid: nextStreamGrids[stream.id] || buildStreamGrid(stream, teachers, nextPeriods, gradeToLevel(stream.grade), {}),
            days: [...DEFAULT_DAYS],
            periods: nextPeriods,
          })),
        } satisfies MasterTimetable,
      };
    },
    [activeLevel, activeStreamId, periods, schoolName, streams, teachers, term, year],
  );

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

  useEffect(() => {
    const element = levelScrollRef.current;
    if (!element) return;

    const updateScrollCue = () => {
      const canScroll = element.scrollWidth > element.clientWidth + 8;
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 8;
      setShowLevelScrollCue(canScroll && !atEnd);
    };

    updateScrollCue();
    element.addEventListener('scroll', updateScrollCue);
    window.addEventListener('resize', updateScrollCue);

    return () => {
      element.removeEventListener('scroll', updateScrollCue);
      window.removeEventListener('resize', updateScrollCue);
    };
  }, []);

  const switchLevel = (level: ActiveLevel) => {
    const info = LEVELS.find((item) => item.key === level)!;
    setActiveLevel(level);
    setClassName(info.defaultClass);
    const newPeriods = [...LEVEL_PERIODS[level]];
    setPeriods(newPeriods);
    setDays([...DEFAULT_DAYS]);
    setGrid(createGridForLevel(level, newPeriods));
    toast({ title: EDUCATION_LEVELS[level].label, description: 'Template loaded.' });
  };

  const addDay = () => {
    const available = ALL_DAYS.filter((day) => !days.includes(day));
    if (available.length === 0) return;
    const newDay = available[0];
    setDays((prev) => [...prev, newDay]);
    setGrid((prev) => [...prev, periods.map(() => ({ subject: '', teacher: '' }))]);
  };

  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, index) => index !== idx));
    setGrid((prev) => prev.filter((_, index) => index !== idx));
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
    [activeStreamId, grid, streamGrids, streams, toast],
  );

  const handlePeriodChange = useCallback((periodIdx: number, slot: PeriodSlot) => {
    setPeriods((prev) => {
      const next = [...prev];
      next[periodIdx] = slot;
      return next;
    });
  }, []);

  const handleExportXls = async () => {
    if (!isSubscribed && usageCount >= 10) {
      toast({
        title: 'Usage Limit Reached',
        description: 'Free users are limited to 10 generated timetables. Please subscribe to unlock unlimited usage.',
        variant: 'destructive',
      });
      setShowPaymentDialog(true);
      return;
    }
    if (!isSubscribed) {
      toast({
        title: 'Subscription Required',
        description: 'Excel export is a premium feature. Please subscribe to download.',
        variant: 'destructive',
      });
      setShowPaymentDialog(true);
      return;
    }
    try {
      setIsGenerating(true);
      await exportTimetableToXls(
        previewGrid,
        schoolName,
        className,
        term,
        year,
        periods,
      );
      toast({ title: 'Exported!', description: 'Downloaded as Excel file.' });
    } catch {
      toast({ title: 'Error', description: 'Excel export failed.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!isSubscribed && usageCount >= 10) {
      toast({
        title: 'Usage Limit Reached',
        description: 'Free users are limited to 10 generated timetables. Please subscribe to unlock unlimited usage.',
        variant: 'destructive',
      });
      setShowPaymentDialog(true);
      return;
    }
    if (!isSubscribed) {
      toast({
        title: 'Subscription Required',
        description: 'PDF export is a premium feature. Please subscribe to download.',
        variant: 'destructive',
      });
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

    const generated = buildGeneratedState(newPeriods);
    if (generated) {
      setStreamGrids(generated.streamGrids);
      setMasterData(generated.masterData);
      setActiveStreamId(generated.activeStream?.id || null);
      setGrid(generated.grid);
      if (generated.activeStream) {
        setClassName(formatStreamLabel(generated.activeStream));
      }
    } else {
      setGrid(createGridForLevel(activeLevel, newPeriods));
    }

    toast({ title: 'Reset', description: 'Timetable has been reset.' });
  };

  const handleGenerate = () => {
    if (streams.length === 0) {
      toast({
        title: 'No streams yet',
        description: 'Add at least one stream before generating a timetable.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    const generated = buildGeneratedState();

    if (!generated) {
      setIsGenerating(false);
      return;
    }

    setStreamGrids(generated.streamGrids);
    setMasterData(generated.masterData);
    setActiveStreamId(generated.activeStream?.id || null);
    setGrid(generated.grid);
    if (generated.activeStream) {
      setClassName(formatStreamLabel(generated.activeStream));
    }

    if (!selectedTeacher && teachers.length > 0) {
      setSelectedTeacher(teachers[0].name);
    }

    const selectedPlan = getSelectedFrontendPlan(schoolId) || 'payg';
    const generationSnapshot = buildPricingSnapshot(selectedPlan, teachers.length, streams.length);
    recordPlanGeneration(generationSnapshot, schoolId);
    if (schoolId) {
      advanceSchoolOnboardingTour(schoolId);
    }

    window.setTimeout(() => setIsGenerating(false), 300);
    toast({
      title: 'Timetables generated',
      description: `Your stream timetables are ready for review and export. ${selectedPlan === 'payg' ? `Estimated Pay-As-You-Go cost: KES ${generationSnapshot.calculated_price.toLocaleString()}.` : 'This generation is covered by your selected plan.'}`,
    });
  };

  const previewGrid =
    viewMode === 'teacher' && masterData && selectedTeacher
      ? aggregateTeacherTimetable(masterData, selectedTeacher).grid
      : grid;

  const teacherOptions = masterData
    ? [...new Set(masterData.classes.flatMap((classItem) => classItem.grid.flatMap((row) => row.map((cell) => cell.teacher))))]
        .filter((teacher) => teacher.trim() !== '')
        .sort()
    : [];

  const timetableContent = (fullscreen = false) => (
    <div
      id="timetable-print"
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${fullscreen ? 'h-full' : ''}`}
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
      <div className={`p-1.5 ${fullscreen ? 'h-[calc(100%-88px)] overflow-auto' : ''}`}>
        {viewMode === 'teacher' && masterData && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-muted-foreground">Select Teacher:</span>
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
              value={selectedTeacher || ''}
              onChange={(event) => setSelectedTeacher(event.target.value)}
            >
              <option value="" disabled>Choose a teacher...</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          </div>
        )}
        <TimetableGridComponent
          grid={previewGrid}
          days={days}
          periods={periods}
          onCellChange={handleCellChange}
          onPeriodChange={handlePeriodChange}
          theme={theme}
          customSubjects={customSubjects}
          colorless={colorless}
          rowColors={rowColors}
          colColors={colColors}
          onRowColorChange={(idx, color) => setRowColors((prev) => ({ ...prev, [idx]: color }))}
          onColColorChange={(idx, color) => setColColors((prev) => ({ ...prev, [idx]: color }))}
          viewMode={viewMode}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background px-3 py-4 md:px-4 md:py-6">
        <div className="mx-auto max-w-[1320px] space-y-6">
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary">
                Kenya School Timetable Creator
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate, inspect, preview, and export your school timetable from one clean workspace.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-4 shadow-sm backdrop-blur-sm md:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex flex-1 flex-wrap items-center justify-center gap-2 xl:justify-start">
                  <FontSelector value={fontFamily} onChange={setFontFamily} />

                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    data-tour-id="tour-timetables-generate"
                    className="h-10 rounded-full px-4 text-sm font-medium"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                    className="h-10 rounded-full px-4 text-sm"
                  >
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Preview
                  </Button>

                  <button
                    onClick={() => setViewMode('stream')}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'stream'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    Stream View
                  </button>

                  <button
                    onClick={() => setViewMode('teacher')}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'teacher'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    Teacher View
                  </button>

                  <Button variant="outline" size="sm" onClick={handleReset} className="h-10 rounded-full px-4 text-sm">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuideOpen(true)}
                    className="h-10 rounded-full px-4 text-sm"
                  >
                    <BookOpenCheck className="mr-2 h-4 w-4" /> Guide
                  </Button>
                </div>

                <div className="flex justify-center xl:justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-10 rounded-full px-4 text-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => void handleExportPdf()}>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleExportXls()}>
                        <Download className="mr-2 h-4 w-4" />
                        Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm">
            <div className="mb-2.5 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-display font-bold text-foreground">Select Education Level</span>
            </div>
            <div className="relative">
              <div
                ref={levelScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {LEVELS.map(({ key }) => {
                  const info = EDUCATION_LEVELS[key];
                  const isActive = activeLevel === key;
                  return (
                    <button
                      key={key}
                      onClick={() => switchLevel(key)}
                      className={`relative min-w-[190px] overflow-hidden rounded-lg border text-left transition-all duration-200 ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`absolute inset-y-0 left-0 w-2 ${LEVEL_ACCENTS[key]}`} />
                      <div className="px-5 py-4">
                        <div className={`text-sm font-semibold leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {info.label}
                        </div>
                      </div>
                      {isActive && (
                        <div className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              {showLevelScrollCue && (
                <button
                  type="button"
                  onClick={() => levelScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center justify-center p-2 text-primary sm:inline-flex"
                  aria-label="Scroll to see more education levels"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {streams.length > 0 && (
          <Card className="mb-4 border-border/70 bg-card/70 p-4">
            <div className="space-y-4">
              <div className="text-center">
                  <h3 className="text-lg font-bold text-foreground">Stream Toggles</h3>
                  <p className="text-sm text-muted-foreground">
                    Each stream keeps its own timetable. Toggle between them to review or edit individually.
                  </p>
                </div>
                <div className="mx-auto max-w-md">
                  <Select value={activeStreamId || undefined} onValueChange={setActiveStreamId}>
                    <SelectTrigger className="h-12 rounded-2xl border-border bg-background text-sm font-medium">
                      <SelectValue placeholder="Select a stream to review" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {streams.map((stream) => (
                        <SelectItem key={stream.id} value={stream.id}>
                          {formatStreamLabel(stream)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}

          {timetableContent()}

          <PaymentDialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            schoolId={schoolId}
            schoolName={schoolName}
            email={schoolEmail}
          />

          <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 md:grid-cols-2">
            <DesignSelector
              theme={theme}
              onThemeChange={setTheme}
              days={days}
              canAddDay={days.length < ALL_DAYS.length}
              onAddDay={addDay}
              onRemoveDay={removeDay}
            />
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Designed for Kenyan CBC & 8-4-4 curriculum schools • KICD aligned
          </p>
        </div>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick timetable guide</DialogTitle>
            <DialogDescription>
              A quick checklist to keep the build flow simple.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Pick a level</p>
              <p>Choose CBC or 8-4-4 so the right period template loads.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Edit times</p>
              <p>Click a time header to edit the start and end timestamps.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Fill lessons</p>
              <p>Click any cell to set the subject and teacher for that period.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Switch views</p>
              <p>Use teacher view to inspect one teacher&apos;s weekly load.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Export when ready</p>
              <p>PDF and Excel export unlock after subscription is verified.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="h-screen w-screen max-w-none rounded-none border-0 p-0 sm:max-w-none">
          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Timetable Preview</p>
                <p className="text-xs text-muted-foreground">Full-screen view for easier inspection.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} className="rounded-full px-4">
                <Minimize2 className="mr-2 h-4 w-4" />
                Minimize
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="mx-auto max-w-[1500px]">
                {timetableContent(true)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Timetables;
