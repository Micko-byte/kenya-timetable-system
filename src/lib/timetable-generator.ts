import { CBC_REQUIREMENTS } from "@/pages/timetable";

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

export interface GeneratorTemplate {
  id: string;
  name: string;
  periods_per_day?: number | null;
  days_per_week?: number | null;
  break_config?: Array<{
    afterPeriod?: number;
    duration?: number;
    label?: string;
  }> | null;
}

export interface GeneratedEntry {
  id: string;
  period_id: string;
  day_of_week: number;
  subject_id: string;
  teacher_id: string;
  stream_id: string;
  room_id?: string;
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
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getSubjectsForGrade(grade: number, fallbackSubjects: string[]) {
  const requirement = CBC_REQUIREMENTS.find((item) => item.grade === grade);
  const subjects = requirement
    ? [...requirement.core_subjects, ...requirement.optional_subjects, ...requirement.cocurricular]
    : fallbackSubjects;

  return Array.from(new Set(subjects)).filter(Boolean);
}

function getTeacherForSubject(subject: string, streamId: string, teachers: GeneratorTeacher[]) {
  const assignedMatch = teachers.find(
    (teacher) =>
      teacher.subjects.includes(subject) && teacher.assignedStreamIds.includes(streamId)
  );

  if (assignedMatch) {
    return assignedMatch;
  }

  return (
    teachers.find((teacher) => teacher.subjects.includes(subject)) ?? {
      id: "unassigned",
      name: "Unassigned Teacher",
      subjects: [],
      assignedStreamIds: [],
    }
  );
}

export function generateStreamTimetable(args: {
  stream: GeneratorStream;
  teachers: GeneratorTeacher[];
  fallbackSubjects: string[];
  template?: GeneratorTemplate | null;
}): GeneratedTimetable {
  const { stream, teachers, fallbackSubjects, template } = args;
  const daysPerWeek = Math.max(1, template?.days_per_week ?? 5);
  const periodsPerDay = Math.max(1, template?.periods_per_day ?? 8);
  const breakPeriods = new Set(
    (template?.break_config ?? [])
      .map((item) => item.afterPeriod)
      .filter((value): value is number => typeof value === "number")
  );

  const subjectPool = getSubjectsForGrade(stream.grade, fallbackSubjects);
  let subjectCursor = 0;
  const timetable_data: GeneratedEntry[] = [];

  for (let day = 1; day <= daysPerWeek; day += 1) {
    for (let period = 1; period <= periodsPerDay; period += 1) {
      if (breakPeriods.has(period - 1)) {
        timetable_data.push({
          id: `${stream.id}-${day}-${period}-break`,
          period_id: `${day}-${period}`,
          day_of_week: day,
          subject_id: "break",
          subject_name: "Break",
          teacher_id: "break",
          teacher_name: "Break",
          stream_id: stream.id,
          notes: `${DAY_NAMES[day - 1] ?? "Day"} break`,
          is_locked: false,
          period_number: period,
        });
        continue;
      }

      const subject = subjectPool[subjectCursor % subjectPool.length] ?? "Study Period";
      const teacher = getTeacherForSubject(subject, stream.id, teachers);

      timetable_data.push({
        id: `${stream.id}-${day}-${period}`,
        period_id: `${day}-${period}`,
        day_of_week: day,
        subject_id: subject.toLowerCase().replace(/\s+/g, "-"),
        subject_name: subject,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        stream_id: stream.id,
        notes: `${DAY_NAMES[day - 1] ?? "Day"} period ${period}`,
        is_locked: false,
        period_number: period,
      });

      subjectCursor += 1;
    }
  }

  return {
    name: `Grade ${stream.grade} - ${stream.stream_name}`,
    type: "stream",
    status: "draft",
    timetable_data,
  };
}
