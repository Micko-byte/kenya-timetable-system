import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paystackApi } from '@/lib/paystack';
import { friendlyError } from '@/lib/friendlyError';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  hasRecordedPlanGeneration,
  getSelectedFrontendPlan,
  recordPlanGeneration,
  calculatePricing,
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
const removeGridRow = (grid: TimetableGrid, rowIdx: number) => grid.filter((_, index) => index !== rowIdx);
const removeGridColumn = (grid: TimetableGrid, colIdx: number) => grid.map((row) => row.filter((_, index) => index !== colIdx));

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
  // A teacher only ever teaches streams they are ALLOCATED to — either via an
  // explicit subject↔class link, or by being assigned to the stream and teaching
  // the subject. We deliberately DO NOT fall back to "any teacher of this
  // subject", so a teacher added for one class never leaks into another.
  const candidateTeachers = [...exactMatches, ...assignedMatches].filter(
    (teacher, index, list) => list.findIndex((item) => item.id === teacher.id) === index,
  );

  const scoredCandidates = candidateTeachers
    .map((teacher) => {
      const priority = exactMatches.some((item) => item.id === teacher.id) ? 0 : 1;

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

// Approximate weekly lesson weighting for Kenyan curriculum subjects. Higher =
// more periods per week. Unknown subjects fall back to DEFAULT_SUBJECT_WEIGHT.
const DEFAULT_SUBJECT_WEIGHT = 3;
const SUBJECT_WEIGHTS: Array<{ match: RegExp; weight: number }> = [
  { match: /(^|\b)(math|mathematics|pure math|applied math|number work|counting)/, weight: 6 },
  { match: /(english|kiswahili|language activities|literacy|listening|reading|writing)/, weight: 5 },
  { match: /(integrated science|biology|chemistry|physics|science|environmental)/, weight: 4 },
  { match: /(history|geography|social studies|cre|ire|hre|religious)/, weight: 3 },
  { match: /(business|agriculture|computer|ict|home science|pre-technical|technology|electrical|mechanic)/, weight: 3 },
  { match: /(french|german|arabic|mandarin|kenyan sign|indigenous)/, weight: 2 },
  { match: /(music|art|creative|drama|dance|physical|games|\bpe\b|life skills|health|community|moral|character|outdoor|story)/, weight: 1 },
];

function getSubjectWeight(subject: string): number {
  const normalized = normalizeText(subject);
  for (const { match, weight } of SUBJECT_WEIGHTS) {
    if (match.test(normalized)) return weight;
  }
  return DEFAULT_SUBJECT_WEIGHT;
}

// Turn each subject's desired weekly periods into a concrete per-week quota.
// The desired count comes from the school's `periods_per_week` (falling back to
// the smart-guess weight). Each subject is hard-capped at `maxDays` so it can
// never be forced to repeat within a day, and the total never exceeds the
// available teaching `slotCount`. A greedy lowest-load fill keeps low-frequency
// subjects (e.g. PE = 2/week) spread across different days instead of daily.
function computeSubjectQuotas(
  subjects: string[],
  slotCount: number,
  periodsPerWeek: Record<string, number>,
  maxDays: number,
): Record<string, number> {
  const quotas: Record<string, number> = {};
  if (subjects.length === 0 || slotCount <= 0) return quotas;

  const desired: Record<string, number> = {}; // wanted periods per week
  const cap: Record<string, number> = {}; // hard cap = min(desired, maxDays)
  subjects.forEach((subject) => {
    quotas[subject] = 0;
    const wanted = Math.max(1, Math.round(periodsPerWeek[subject] ?? getSubjectWeight(subject)));
    desired[subject] = wanted;
    cap[subject] = Math.max(1, Math.min(wanted, maxDays));
  });

  const totalCap = subjects.reduce((sum, subject) => sum + cap[subject], 0);
  const fillTarget = Math.min(slotCount, totalCap);
  const totalAssigned = () => Object.values(quotas).reduce((sum, n) => sum + n, 0);

  // One each (highest desired first) so every staffed subject shows up at least once.
  [...subjects]
    .sort((a, b) => desired[b] - desired[a])
    .forEach((subject) => {
      if (totalAssigned() < fillTarget && quotas[subject] < cap[subject]) quotas[subject] = 1;
    });

  // Fill the remainder by lowest load-to-desired ratio, never exceeding each
  // subject's own cap, so a subject stops once it hits its weekly periods.
  while (totalAssigned() < fillTarget) {
    let best: string | null = null;
    let bestRatio = Number.POSITIVE_INFINITY;
    let bestDesired = -1;
    for (const subject of subjects) {
      if (quotas[subject] >= cap[subject]) continue;
      const ratio = quotas[subject] / desired[subject];
      if (ratio < bestRatio - 1e-9 || (Math.abs(ratio - bestRatio) < 1e-9 && desired[subject] > bestDesired)) {
        bestRatio = ratio;
        bestDesired = desired[subject];
        best = subject;
      }
    }
    if (best === null) break;
    quotas[best] += 1;
  }

  return quotas;
}

// BREAK / LUNCH / Games / outdoor slots are fixed and never receive a subject.
function getFixedPeriodCell(period: PeriodSlot): CellData | null {
  const label = period.label.toUpperCase();
  if (label === 'BREAK') return { subject: 'BREAK', teacher: '' };
  if (label === 'LUNCH') return { subject: 'LUNCH', teacher: '' };
  if (label.includes('GAME') || label.includes('OUTDOOR') || label.includes('FREE PLAY')) {
    return { subject: period.label, teacher: '' };
  }
  return null;
}

function buildStreamGrid(
  stream: StreamRecord,
  teachers: TeacherRecord[],
  days: string[],
  periods: PeriodSlot[],
  activeLevel: ActiveLevel,
  teacherCalendar: TeacherCalendar,
  subjectPeriods: Record<string, number>,
): TimetableGrid {
  // A stream's subjects come ONLY from teachers allocated to THIS stream —
  // either via an explicit subject↔class link, or by being assigned to the
  // stream. We never borrow subjects from unrelated teachers, so nothing the
  // school hasn't staffed for this class can appear (and no teacher leaks in).
  const linkedSubjects = teachers.flatMap((teacher) =>
    teacher.subjectClassLinks
      .filter((link) => link.streamId === stream.id)
      .map((link) => link.subject),
  );
  const assignedTeacherSubjects = teachers.flatMap((teacher) =>
    teacher.assignedStreamIds.includes(stream.id) ? teacher.subjects : [],
  );

  const subjectPool = Array.from(new Set([...linkedSubjects, ...assignedTeacherSubjects].filter(Boolean)));

  // Start from a correctly-sized blank grid (honors the configured days).
  const grid: TimetableGrid = days.map(() => periods.map(() => ({ subject: '', teacher: '' })));

  // Lay down fixed cells and collect the real teaching slots.
  const teachingSlots: Array<{ dayIdx: number; periodIdx: number }> = [];
  days.forEach((_, dayIdx) => {
    periods.forEach((period, periodIdx) => {
      const fixed = getFixedPeriodCell(period);
      if (fixed) {
        grid[dayIdx][periodIdx] = fixed;
      } else {
        teachingSlots.push({ dayIdx, periodIdx });
      }
    });
  });

  if (subjectPool.length === 0 || teachingSlots.length === 0) {
    return grid;
  }

  // Cap each subject at once per day so quotas never force a same-day repeat.
  const remaining = computeSubjectQuotas(subjectPool, teachingSlots.length, subjectPeriods, days.length);
  const placedToday: Array<Set<string>> = days.map(() => new Set<string>());

  // Visit slots column-major (across days first) so each subject's lessons
  // spread over different days rather than clustering on one day.
  const orderedSlots = [...teachingSlots].sort(
    (a, b) => a.periodIdx - b.periodIdx || a.dayIdx - b.dayIdx,
  );

  const byPreference = (a: string, b: string) =>
    (remaining[b] || 0) - (remaining[a] || 0) || getSubjectWeight(b) - getSubjectWeight(a);

  // Only allow a same-day repeat when the school simply doesn't have enough
  // distinct staffed subjects to fill a day without one. Otherwise a slot that
  // can't be staffed with a fresh subject is left blank rather than repeating.
  const teachingPerDay = Math.ceil(teachingSlots.length / Math.max(1, days.length));
  const allowRepeatFallback = subjectPool.length < teachingPerDay;

  orderedSlots.forEach(({ dayIdx, periodIdx }) => {
    const remainingSubjects = subjectPool.filter((subject) => (remaining[subject] || 0) > 0);
    if (remainingSubjects.length === 0) return; // quotas spent → leave blank

    // Pass 1: only subjects NOT already placed today (hard no same-day repeat).
    // Pass 2 (under-staffed schools only): any remaining subject, so a day with
    // too few subjects still fills instead of leaving large gaps.
    const fresh = remainingSubjects.filter((subject) => !placedToday[dayIdx].has(subject));
    const passes = allowRepeatFallback ? [fresh, remainingSubjects] : [fresh];
    for (const pool of passes) {
      for (const subject of [...pool].sort(byPreference)) {
        const teacher = pickTeacherForSubject(
          teachers, stream, subject, dayIdx, periodIdx, periods.length, teacherCalendar,
        );
        if (teacher) {
          grid[dayIdx][periodIdx] = { subject, teacher };
          remaining[subject] -= 1;
          placedToday[dayIdx].add(subject);
          return;
        }
      }
    }
    // No staffable subject for this slot → leave it blank.
  });

  return grid;
}

function buildAllStreamGrids(
  streams: StreamRecord[],
  teachers: TeacherRecord[],
  days: string[],
  periods: PeriodSlot[],
  subjectPeriods: Record<string, number>,
) {
  const teacherCalendar: TeacherCalendar = {};
  const orderedStreams = [...streams].sort((a, b) => a.grade - b.grade || a.stream_name.localeCompare(b.stream_name));

  return orderedStreams.reduce<Record<string, TimetableGrid>>((acc, stream) => {
    acc[stream.id] = buildStreamGrid(stream, teachers, days, periods, gradeToLevel(stream.grade), teacherCalendar, subjectPeriods);
    return acc;
  }, {});
}

const Timetables = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [showGenerationPricingPopup, setShowGenerationPricingPopup] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [subjectRows, setSubjectRows] = useState<Array<{ id: string; name: string; periodsPerWeek: number }>>([]);
  const [showSubjectFreq, setShowSubjectFreq] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [streamGrids, setStreamGrids] = useState<Record<string, TimetableGrid>>({});
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showLevelScrollCue, setShowLevelScrollCue] = useState(false);
  const levelScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedGenerationPlan = getSelectedFrontendPlan(schoolId) || 'payg';
  const generationPricing = useMemo(
    () => buildPricingSnapshot(selectedGenerationPlan, teachers.length, streams.length),
    [selectedGenerationPlan, streams.length, teachers.length],
  );
  // Subject name -> desired periods per week, used to size each subject's quota.
  const subjectPeriods = useMemo(
    () => Object.fromEntries(subjectRows.map((s) => [s.name, s.periodsPerWeek])),
    [subjectRows],
  );
  const updateSubjectPeriods = async (id: string, value: number) => {
    const next = Math.max(1, Math.min(Math.round(value) || 1, 12));
    setSubjectRows((rows) => rows.map((r) => (r.id === id ? { ...r, periodsPerWeek: next } : r)));
    const { error } = await supabase.from('subjects').update({ periods_per_week: next }).eq('id', id);
    if (error) toast({ title: 'Could not save frequency', description: error.message, variant: 'destructive' });
  };

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

      const [{ data: streamsData }, { data: teachersData }, { data: subData }, { count }, { data: subjectsData }] = await Promise.all([
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
        supabase
          .from('subjects')
          .select('id, name, periods_per_week')
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
      setSubjectRows(
        ((subjectsData as any[]) || [])
          .map((s) => ({
            id: s.id as string,
            name: s.name as string,
            periodsPerWeek: (s.periods_per_week as number | null) ?? getSubjectWeight(s.name),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setIsSubscribed(subData?.status === 'active');
      setUsageCount(count || 0);
      // Generation cap is now enforced server-side (consume_generation), so the
      // old localStorage "lock after first generate" no longer applies.
      setGenerationLocked(false);

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

    const nextStreamGrids = buildAllStreamGrids(streams, teachers, days, periods, subjectPeriods);
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
        grid: nextStreamGrids[stream.id] || buildStreamGrid(stream, teachers, days, periods, gradeToLevel(stream.grade), {}, subjectPeriods),
        days: [...days],
        periods,
      })),
    });

    if (!selectedTeacher && teachers.length > 0) {
      setSelectedTeacher(teachers[0].name);
    }
  }, [streams, teachers, days, periods, activeStreamId, schoolName, term, year, selectedTeacher, subjectPeriods]);

  const buildGeneratedState = useCallback(
    (nextPeriods: PeriodSlot[] = periods) => {
      if (streams.length === 0) {
        return null;
      }

      const nextStreamGrids = buildAllStreamGrids(streams, teachers, days, nextPeriods, subjectPeriods);
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
            grid: nextStreamGrids[stream.id] || buildStreamGrid(stream, teachers, days, nextPeriods, gradeToLevel(stream.grade), {}, subjectPeriods),
            days: [...days],
            periods: nextPeriods,
          })),
        } satisfies MasterTimetable,
      };
    },
    [activeLevel, activeStreamId, days, periods, schoolName, streams, teachers, term, year, subjectPeriods],
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
    if (generationLocked) {
      toast({
        title: 'Timetable locked',
        description: 'The first generated timetable is final, so the level cannot be changed now.',
        variant: 'destructive',
      });
      return;
    }

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
    deleteDayAt(idx);
  };

  const deleteDayAt = (dayIdx: number) => {
    if (days.length <= 1) {
      toast({
        title: 'Cannot delete',
        description: 'A timetable needs at least one day.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Delete this day row from the timetable?')) return;

    setDays((prev) => prev.filter((_, index) => index !== dayIdx));
    setGrid((prev) => removeGridRow(prev, dayIdx));
    setStreamGrids((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([streamId, streamGrid]) => [streamId, removeGridRow(streamGrid, dayIdx)]),
      ),
    );
    setMasterData((prev) =>
      prev
        ? {
            ...prev,
            classes: prev.classes.map((classItem) => ({
              ...classItem,
              days: classItem.days.filter((_, index) => index !== dayIdx),
              grid: removeGridRow(classItem.grid, dayIdx),
            })),
          }
        : prev,
    );
  };

  const deletePeriodAt = (periodIdx: number) => {
    if (periods.length <= 1) {
      toast({
        title: 'Cannot delete',
        description: 'A timetable needs at least one column.',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Delete this time column from the timetable?')) return;

    setPeriods((prev) => prev.filter((_, index) => index !== periodIdx));
    setGrid((prev) => removeGridColumn(prev, periodIdx));
    setStreamGrids((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([streamId, streamGrid]) => [streamId, removeGridColumn(streamGrid, periodIdx)]),
      ),
    );
    setMasterData((prev) =>
      prev
        ? {
            ...prev,
            classes: prev.classes.map((classItem) => ({
              ...classItem,
              periods: classItem.periods.filter((_, index) => index !== periodIdx),
              grid: removeGridColumn(classItem.grid, periodIdx),
            })),
          }
        : prev,
    );
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
    if (generationLocked) {
      toast({
        title: 'Timetable locked',
        description: 'The first generated timetable is final, so reset is disabled.',
        variant: 'destructive',
      });
      return;
    }

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
    if (generationLocked) {
      toast({
        title: 'Timetable locked',
        description: 'You have already generated the final timetable for this school.',
        variant: 'destructive',
      });
      return;
    }

    if (streams.length === 0) {
      toast({
        title: 'No streams yet',
        description: 'Add at least one stream before generating a timetable.',
        variant: 'destructive',
      });
      return;
    }

    if (teachers.length === 0) {
      toast({
        title: 'No teachers yet',
        description: 'Add teachers and link them to classes before generating a timetable.',
        variant: 'destructive',
      });
      return;
    }

    // Every teacher must be linked to at least one class (subject-class link)
    // so the generator knows which stream each teacher teaches.
    const unlinkedTeachers = teachers.filter((teacher) => teacher.subjectClassLinks.length === 0);
    if (unlinkedTeachers.length > 0) {
      const names = unlinkedTeachers.map((teacher) => teacher.name).filter(Boolean);
      const shown = names.slice(0, 4).join(', ');
      const extra = names.length > 4 ? ` and ${names.length - 4} more` : '';
      toast({
        title: 'Link every teacher to a class first',
        description: `${shown}${extra} ${names.length === 1 ? 'is' : 'are'} not linked to any class yet. Open Teachers → edit each teacher → add a Subject-Class link, then generate.`,
        variant: 'destructive',
      });
      return;
    }

    setShowGenerationPricingPopup(true);
  };

  // The actual generation, run once payment (if any) is settled.
  const runGeneration = () => {
    const generated = buildGeneratedState();

    if (!generated) {
      setIsGenerating(false);
      setShowGenerationPricingPopup(false);
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
    setShowGenerationPricingPopup(false);
    if (schoolId) {
      advanceSchoolOnboardingTour(schoolId);
    }

    window.setTimeout(() => setIsGenerating(false), 300);
    toast({
      title: 'Timetables generated',
      description: 'Your stream timetables are ready for review and export.',
    });
  };

  const confirmGenerate = async () => {
    setShowGenerationPricingPopup(false);
    setIsGenerating(true);

    // Server-enforced free trial: a free school gets a limited number of
    // generations, then must subscribe. Paid plans are unlimited. The cap lives
    // in Postgres (consume_generation) so it can't be bypassed from the UI.
    if (schoolId) {
      const { error } = await supabase.rpc('consume_generation', { p_school_id: schoolId });
      if (error) {
        const message = error.message || '';
        if (message.includes('FREE_LIMIT')) {
          setIsGenerating(false);
          toast({
            title: 'Free trial used up',
            description: message.replace('FREE_LIMIT: ', ''),
            variant: 'destructive',
          });
          setShowPaymentDialog(true);
          return;
        }
        // Any other error (e.g. the SQL function isn't deployed yet) — fail open
        // so generation keeps working; just log it.
        console.warn('consume_generation:', message);
      }
    }

    runGeneration();
  };

  const handlePaymentVerified = useCallback(async () => {
    // Optimistically unlock, then reconcile with the server's subscription row.
    setIsSubscribed(true);
    if (!schoolId) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('school_id', schoolId)
      .maybeSingle();
    if (data) {
      setIsSubscribed(data.status === 'active');
    }
  }, [schoolId]);

  // Safety net: if Paystack redirects back here with ?reference= (instead of the
  // inline popup callback firing), verify and activate on return.
  useEffect(() => {
    const reference = new URLSearchParams(location.search).get('reference');
    if (!reference) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await paystackApi.verifyPayment(reference);
        if (!cancelled && (result.subscription_status === 'active' || result.status === 'success')) {
          toast({ title: 'Subscription activated 🎉', description: 'Payment verified successfully.' });
          await handlePaymentVerified();
        }
      } catch {
        // Ignore — Billing also surfaces verification issues; avoid double-toasting here.
      } finally {
        navigate(location.pathname, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, location.pathname, navigate, toast, handlePaymentVerified]);

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
          onDayDelete={deleteDayAt}
          onPeriodDelete={deletePeriodAt}
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
              <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex-wrap xl:justify-start xl:overflow-visible xl:pb-0">
                  <div className="shrink-0">
                    <FontSelector value={fontFamily} onChange={setFontFamily} />
                  </div>

                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generationLocked}
                    data-tour-id="tour-timetables-generate"
                    className="h-10 shrink-0 rounded-full px-4 text-sm font-medium"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {generationLocked ? 'Finalized' : 'Generate'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                    className="h-10 shrink-0 rounded-full px-4 text-sm"
                  >
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Preview
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubjectFreq(true)}
                    className="h-10 shrink-0 rounded-full px-4 text-sm"
                  >
                    <BookOpenCheck className="mr-2 h-4 w-4" />
                    Subject frequency
                  </Button>

                  <Dialog open={showSubjectFreq} onOpenChange={setShowSubjectFreq}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Subject frequency (periods / week)</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Set how many periods each subject gets per week. Low numbers (e.g. PE = 2) are
                        spread across different days instead of appearing daily. Changes save automatically
                        and apply on the next Generate.
                      </p>
                      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                        {subjectRows.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No subjects yet — add subjects to your teachers first.
                          </p>
                        ) : (
                          subjectRows.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium">{s.name}</span>
                              <Input
                                type="number"
                                min={1}
                                max={12}
                                value={s.periodsPerWeek}
                                onChange={(e) => updateSubjectPeriods(s.id, Number(e.target.value))}
                                className="h-9 w-20 text-center"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <button
                    onClick={() => setViewMode('stream')}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'stream'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    Stream View
                  </button>

                  <button
                    onClick={() => setViewMode('teacher')}
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === 'teacher'
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    Teacher View
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={generationLocked}
                    className="h-10 shrink-0 rounded-full px-4 text-sm"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuideOpen(true)}
                    className="h-10 shrink-0 rounded-full px-4 text-sm"
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
                      disabled={generationLocked}
                      className={`relative min-w-[190px] overflow-hidden rounded-lg border text-left transition-all duration-200 ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      } ${generationLocked ? 'cursor-not-allowed opacity-60' : ''}`}
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
            onPaymentVerified={handlePaymentVerified}
          />

          <Dialog open={showGenerationPricingPopup} onOpenChange={setShowGenerationPricingPopup}>
            <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(248,250,255,0.96))] p-0 shadow-2xl">
              <div className="border-b border-border/60 px-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Review timetable pricing</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    This price is based on your current school size and selected billing plan. The first generated timetable becomes final.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="space-y-4 px-6 py-6">
                <div className="rounded-[1.5rem] border border-primary/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Selected plan</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {selectedGenerationPlan === 'payg' ? 'Pay-As-You-Go' : selectedGenerationPlan === 'basic' ? 'Basic' : 'Premium'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Based on {teachers.length} teacher{teachers.length === 1 ? '' : 's'} and {streams.length} stream{streams.length === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Real price</p>
                      <p className="text-4xl font-black text-primary">
                        {`KES ${generationPricing.calculated_price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Teachers</p>
                    <p className="mt-1 text-xl font-bold">{teachers.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Streams</p>
                    <p className="mt-1 text-xl font-bold">{streams.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Plan total</p>
                    <p className="mt-1 text-xl font-bold">{`KES ${generationPricing.calculated_price.toLocaleString()}`}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
                  <Button variant="outline" onClick={() => setShowGenerationPricingPopup(false)} className="rounded-full px-5">
                    Cancel
                  </Button>
                  <Button onClick={confirmGenerate} className="rounded-full px-6">
                    Continue and Generate
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
