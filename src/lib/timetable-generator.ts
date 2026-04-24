export interface GeneratorTeacher {
  id: string;
  name: string;
  subjects: string[];
  assignedStreamIds: string[];
}

export interface GeneratorStream {
  id: string;
  grade: number;
  stream_name: string;
}

export interface GeneratorTemplatePeriod {
  time?: string;
  label?: string;
}

export interface GeneratorLesson {
  id?: string;
  day?: string | number;
  day_of_week?: number;
  period_id?: string;
  period_number?: number;
  time?: string;
  slot?: string;
  stream_id?: string;
  teacher_id?: string;
  subject_id?: string;
  subject_name?: string;
  subject?: string;
  teacher_name?: string;
  teacher?: string;
  room_id?: string | null;
  notes?: string | null;
  is_locked?: boolean;
}

export interface GeneratorTemplate {
  id: string;
  name: string;
  periods_per_day?: number | null;
  days_per_week?: number | null;
  days?: string[] | null;
  periods?: GeneratorTemplatePeriod[] | null;
  break_config?: Array<{
    afterPeriod?: number;
    duration?: number;
    label?: string;
  }> | null;
  lessons?: GeneratorLesson[] | null;
  entries?: GeneratorLesson[] | null;
  assignments?: GeneratorLesson[] | null;
  timetable_data?: GeneratorLesson[] | null;
  structure_config?: {
    days?: string[];
    periods?: GeneratorTemplatePeriod[];
    cells?: unknown[];
    rows?: unknown[];
    columns?: unknown[];
  } | null;
}

export interface GeneratedEntry {
  id: string;
  period_id: string;
  day_of_week: number;
  subject_id: string;
  teacher_id: string;
  stream_id: string;
  room_id?: string | null;
  notes?: string;
  is_locked: boolean;
  subject_name: string;
  teacher_name: string;
  period_number: number;
}

export interface GeneratedTimetable {
  name: string;
  type: "stream";
  status: "draft";
  timetable_data: GeneratedEntry[];
  grid: Array<Array<GeneratedEntry | null>>;
  days: string[];
  periods: GeneratorTemplatePeriod[];
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function getDays(template: GeneratorTemplate | null | undefined, daysPerWeek: number): string[] {
  const structureDays = template?.structure_config?.days;
  if (Array.isArray(structureDays) && structureDays.length > 0) {
    return structureDays.map((day) => String(day).trim()).filter(Boolean);
  }

  if (Array.isArray(template?.days) && template.days.length > 0) {
    return template.days.map((day) => String(day).trim()).filter(Boolean);
  }

  return DAY_NAMES.slice(0, daysPerWeek);
}

function getPeriods(template: GeneratorTemplate | null | undefined, periodsPerDay: number): GeneratorTemplatePeriod[] {
  const structurePeriods = template?.structure_config?.periods;
  if (Array.isArray(structurePeriods) && structurePeriods.length > 0) {
    return structurePeriods.filter((period): period is GeneratorTemplatePeriod => Boolean(period && typeof period === "object"));
  }

  if (Array.isArray(template?.periods) && template.periods.length > 0) {
    return template.periods;
  }

  const breakPeriods = new Set(
    (template?.break_config ?? [])
      .map((item) => item.afterPeriod)
      .filter((value): value is number => typeof value === "number"),
  );

  const periods: GeneratorTemplatePeriod[] = [];
  for (let index = 1; index <= periodsPerDay; index += 1) {
    if (breakPeriods.has(index - 1)) {
      periods.push({ time: `Period ${index}`, label: "BREAK" });
      continue;
    }
    periods.push({ time: `Period ${index}`, label: `Lesson ${index}` });
  }

  return periods;
}

function slotKey(dayValue: unknown, periodValue: unknown, streamId = "", teacherId = ""): string {
  return [normalize(dayValue), normalize(periodValue), normalize(streamId), normalize(teacherId)].join("|");
}

function getLessons(template: GeneratorTemplate | null | undefined): GeneratorLesson[] {
  const sources = [
    template?.lessons,
    template?.entries,
    template?.assignments,
    template?.timetable_data,
  ];

  for (const source of sources) {
    if (Array.isArray(source)) {
      return source.filter((item): item is GeneratorLesson => Boolean(item && typeof item === "object"));
    }
  }

  return [];
}

function lessonKeys(lesson: GeneratorLesson, days: string[], periods: GeneratorTemplatePeriod[]): string[] {
  const dayValue = lesson.day ?? lesson.day_of_week;
  const periodValue = lesson.time ?? lesson.period_id ?? lesson.period_number ?? lesson.slot;
  const streamId = lesson.stream_id ?? "";
  const teacherId = lesson.teacher_id ?? "";

  const keys = [
    slotKey(dayValue, periodValue, streamId, teacherId),
    slotKey(dayValue, periodValue, streamId, ""),
    slotKey(dayValue, periodValue, "", ""),
  ];

  if (typeof dayValue === "number" && dayValue > 0 && dayValue <= days.length) {
    const dayName = days[dayValue - 1];
    keys.push(
      slotKey(dayName, periodValue, streamId, teacherId),
      slotKey(dayName, periodValue, streamId, ""),
      slotKey(dayName, periodValue, "", ""),
    );
  }

  const periodIndex = toInt(periodValue, 0);
  if (periodIndex > 0 && periodIndex <= periods.length) {
    const period = periods[periodIndex - 1];
    const periodIdentity = period.time ?? period.label ?? periodIndex;
    keys.push(
      slotKey(dayValue, periodIdentity, streamId, teacherId),
      slotKey(dayValue, periodIdentity, streamId, ""),
      slotKey(dayValue, periodIdentity, "", ""),
    );
  }

  return unique(keys);
}

function lessonToEntry(
  lesson: GeneratorLesson,
  stream: GeneratorStream,
  dayIndex: number,
  periodIndex: number,
  dayName: string,
  period: GeneratorTemplatePeriod,
): GeneratedEntry {
  const subjectName = String(
    lesson.subject_name ?? lesson.subject ?? lesson.subject_id ?? "Untitled",
  );
  const teacherName = String(lesson.teacher_name ?? lesson.teacher ?? "Unassigned Teacher");
  const teacherId = String(lesson.teacher_id ?? "unassigned");
  const streamId = String(lesson.stream_id ?? stream.id);

  return {
    id: String(lesson.id ?? `${stream.id}-${dayIndex}-${periodIndex}`),
    period_id: String(lesson.period_id ?? `${dayIndex}-${periodIndex}`),
    day_of_week: toInt(lesson.day_of_week, dayIndex),
    subject_id: String(lesson.subject_id ?? subjectName.toLowerCase().replace(/\s+/g, "-")),
    subject_name: subjectName,
    teacher_id: teacherId,
    teacher_name: teacherName,
    stream_id: streamId,
    room_id: lesson.room_id ?? null,
    notes: lesson.notes ?? `${dayName} ${period.label ?? periodIndex}`,
    is_locked: Boolean(lesson.is_locked ?? false),
    period_number: toInt(lesson.period_number, periodIndex),
  };
}

export function generateStreamTimetable(args: {
  stream: GeneratorStream;
  teachers: GeneratorTeacher[];
  fallbackSubjects: string[];
  template?: GeneratorTemplate | null;
}): GeneratedTimetable {
  const { stream, teachers, template } = args;
  const daysPerWeek = Math.max(1, template?.days_per_week ?? 5);
  const periodsPerDay = Math.max(1, template?.periods_per_day ?? 8);
  const days = getDays(template, daysPerWeek);
  const periods = getPeriods(template, periodsPerDay);
  const lessons = getLessons(template);

  const lessonLookup = new Map<string, GeneratorLesson>();
  for (const lesson of lessons) {
    for (const key of lessonKeys(lesson, days, periods)) {
      if (!lessonLookup.has(key)) {
        lessonLookup.set(key, lesson);
      }
    }
  }

  const grid: Array<Array<GeneratedEntry | null>> = [];
  const timetable_data: GeneratedEntry[] = [];

  days.forEach((dayName, dayIndex) => {
    const row: Array<GeneratedEntry | null> = [];

    periods.forEach((period, periodIndex) => {
      const periodIdentity = period.time ?? period.label ?? periodIndex + 1;
      const candidates = [
        slotKey(dayName, periodIdentity, stream.id, ""),
        slotKey(dayName, periodIdentity, "", ""),
        slotKey(dayIndex + 1, periodIndex + 1, stream.id, ""),
        slotKey(dayIndex + 1, periodIndex + 1, "", ""),
      ];

      const matchedLesson = candidates.map((key) => lessonLookup.get(key)).find(Boolean);
      if (!matchedLesson) {
        row.push(null);
        return;
      }

      const entry = lessonToEntry(matchedLesson, stream, dayIndex + 1, periodIndex + 1, dayName, period);
      row.push(entry);
      timetable_data.push(entry);
    });

    grid.push(row);
  });

  return {
    name: `Grade ${stream.grade} - ${stream.stream_name}`,
    type: "stream",
    status: "draft",
    timetable_data,
    grid,
    days,
    periods,
  };
}
