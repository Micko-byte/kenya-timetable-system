import { EducationLevel, TimetableGrid, DesignTheme } from "./lib/timetableData";

export interface TimetableTemplate {
  id: string;
  name: string;
  design: DesignTheme;
  level: EducationLevel;
  curriculum: string;
  description: string | null;
  preview_image_url: string | null;
  theme_config: {
    headerBg: string;
    headerText: string;
    dayBg: string;
    borderStyle: string;
    fontStyle: string;
    accent: string;
    pattern: string;
    palette: string[];
  };
  font_family: string;
  days: string[];
  periods: { time: string; label: string }[];
  grid_json: TimetableGrid;
  custom_subjects: string[];
  row_colors: Record<number, string>;
  col_colors: Record<number, string>;
  status: 'draft' | 'published' | 'archived';
  version: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface SchoolTimetable {
  id: string;
  school_id: string;
  template_id: string | null;
  class_name: string;
  term: string | null;
  year: string | null;
  colorless: boolean;
  overrides: {
    grid?: TimetableGrid;
    theme_config?: Partial<TimetableTemplate['theme_config']>;
    subjectColors?: Record<string, string>;
    font_family?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}
