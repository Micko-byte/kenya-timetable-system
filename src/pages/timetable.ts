// types/timetable.ts

export type TimetableType = "master" | "class" | "teacher" | "stream";
export type TimetableStatus = "draft" | "final" | "exported";
export type ExportFormat = "pdf" | "png" | "jpeg";

export interface TimetableEntry {
  id: string;
  period_id: string;
  day_of_week: number;
  subject_id: string;
  teacher_id: string;
  stream_id: string;
  room_id?: string;
  notes?: string;
  is_locked: boolean;
}

export interface Timetable {
  id: string;
  name: string;
  type: TimetableType;
  status: TimetableStatus;
  stream_id?: string;
  teacher_id?: string;
  template_id?: string;
  grade?: number;
  generated_at: string;
  updated_at: string;
  timetable_data: TimetableEntry[];
  streams?: {
    grade: number;
    stream_name: string;
  };
  templates?: {
    id: string;
    name: string;
  } | null;
  teacher?: {
    name: string;
  };
}

export interface Stream {
  id: string;
  grade: number;
  stream_name: string;
  school_id: string;
}

export interface Teacher {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color?: string;
}

export interface Period {
  id: string;
  period_number: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  break_type?: string;
}

export interface TimetableConfig {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  period_duration: number;
  break_duration: number;
  days_per_week: number;
  periods_per_day: number;
}

export interface CBCRequirement {
  grade: number;
  lessons_per_week: number;
  lesson_duration: number; // in minutes
  core_subjects: string[];
  optional_subjects: string[];
  cocurricular: string[];
}

export const CBC_REQUIREMENTS: CBCRequirement[] = [
  {
    grade: 1,
    lessons_per_week: 40,
    lesson_duration: 35,
    core_subjects: ["English", "Kiswahili", "Mathematics", "Environmental Activities"],
    optional_subjects: ["Religious Education"],
    cocurricular: ["PE", "Music", "Art & Craft"],
  },
  {
    grade: 2,
    lessons_per_week: 40,
    lesson_duration: 35,
    core_subjects: ["English", "Kiswahili", "Mathematics", "Environmental Activities"],
    optional_subjects: ["Religious Education"],
    cocurricular: ["PE", "Music", "Art & Craft"],
  },
  {
    grade: 3,
    lessons_per_week: 40,
    lesson_duration: 35,
    core_subjects: ["English", "Kiswahili", "Mathematics", "Environmental Activities"],
    optional_subjects: ["Religious Education"],
    cocurricular: ["PE", "Music", "Art & Craft"],
  },
  {
    grade: 4,
    lessons_per_week: 40,
    lesson_duration: 40,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science",
      "Social Studies",
    ],
    optional_subjects: ["Religious Education", "Foreign Languages"],
    cocurricular: ["PE", "Music", "Art & Craft", "Agriculture"],
  },
  {
    grade: 5,
    lessons_per_week: 40,
    lesson_duration: 40,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science",
      "Social Studies",
    ],
    optional_subjects: ["Religious Education", "Foreign Languages"],
    cocurricular: ["PE", "Music", "Art & Craft", "Agriculture"],
  },
  {
    grade: 6,
    lessons_per_week: 40,
    lesson_duration: 40,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science",
      "Social Studies",
    ],
    optional_subjects: ["Religious Education", "Foreign Languages"],
    cocurricular: ["PE", "Music", "Art & Craft", "Agriculture"],
  },
  {
    grade: 7,
    lessons_per_week: 45,
    lesson_duration: 40,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Health Education",
      "Pre-Technical Studies",
      "Social Studies",
    ],
    optional_subjects: [
      "Religious Education",
      "Foreign Languages",
      "Business Studies",
    ],
    cocurricular: [
      "PE",
      "Performing Arts",
      "Visual Arts",
      "Agriculture",
      "Computer Science",
    ],
  },
  {
    grade: 8,
    lessons_per_week: 45,
    lesson_duration: 40,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Health Education",
      "Pre-Technical Studies",
      "Social Studies",
    ],
    optional_subjects: [
      "Religious Education",
      "Foreign Languages",
      "Business Studies",
    ],
    cocurricular: [
      "PE",
      "Performing Arts",
      "Visual Arts",
      "Agriculture",
      "Computer Science",
    ],
  },
  {
    grade: 9,
    lessons_per_week: 45,
    lesson_duration: 45,
    core_subjects: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Health Education",
      "Pre-Technical Studies",
      "Social Studies",
    ],
    optional_subjects: [
      "Religious Education",
      "Foreign Languages",
      "Business Studies",
    ],
    cocurricular: [
      "PE",
      "Performing Arts",
      "Visual Arts",
      "Agriculture",
      "Computer Science",
    ],
  },
];

export interface CustomizationSettings {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    border: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
  };
  layout: {
    cellPadding: number;
    borderWidth: number;
    headerHeight: number;
  };
}

export const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  colorPalette: {
    primary: "#FACC15",
    secondary: "#0D3C44",
    accent: "#10B981",
    text: "#1F2937",
    border: "#E5E7EB",
  },
  font: {
    family: "Recoleta, serif",
    size: 14,
    weight: 400,
  },
  layout: {
    cellPadding: 8,
    borderWidth: 1,
    headerHeight: 60,
  },
};
