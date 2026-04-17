export type EducationLevel =
  | "pre_primary"
  | "lower_primary"
  | "upper_primary"
  | "junior_secondary"
  | "senior_secondary"
  | "eight_four_four"
  | "common";

export type SubjectKey =
  | "math"
  | "english"
  | "kiswahili"
  | "science"
  | "social"
  | "cre"
  | "phy"
  | "chem"
  | "bio"
  | "hist"
  | "geo"
  | "business"
  | "agriculture"
  | "break"
  | "games"
  | "default"
  | "ire"
  | "hre"
  | "ict"
  | "french"
  | "german"
  | "arabic"
  | "mandarin"
  | "music"
  | "art"
  | "home_science"
  | "computer"
  | "life_skills"
  | "health"
  | "pre_tech"
  | "community"
  | "ksl"
  | "indigenous"
  | "math_activities"
  | "env_activities"
  | "hygiene"
  | "movement"
  | "sci_tech"
  | "creative_arts"
  | "phe"
  | "pure_math"
  | "applied_math"
  | "statistics"
  | "env_science"
  | "electrical"
  | "mechatronics"
  | "building"
  | "automotive"
  | "wood_tech"
  | "metal_tech"
  | "marine"
  | "aviation"
  | "economics"
  | "sociology"
  | "psychology"
  | "citizenship"
  | "visual_arts"
  | "performing_arts"
  | "theatre"
  | "sports_science"
  | "power_mech"
  | "drawing_design"
  | "religious"
  | "language_activities"
  | "psychomotor"
  | "sensory"
  | "number_work"
  | "outdoor"
  | "listening_speaking"
  | "pre_reading"
  | "pre_writing"
  | "storytelling"
  | "counting"
  | "shapes"
  | "sorting_patterns"
  | "measurement"
  | "family_community"
  | "plants_animals"
  | "weather_safety"
  | "drawing_painting"
  | "modeling"
  | "music_movement"
  | "dance_drama"
  | "moral_values"
  | "character_dev";

export type SubjectInfo = {
  label: string;
  mnemonic: string;
  color: SubjectKey;
  level: EducationLevel[];
};

export const SUBJECTS: Record<string, SubjectInfo> = {
  English: { label: "English", mnemonic: "ENG", color: "english", level: ["pre_primary", "lower_primary", "upper_primary", "junior_secondary", "senior_secondary", "eight_four_four"] },
  Kiswahili: { label: "Kiswahili", mnemonic: "KSW", color: "kiswahili", level: ["pre_primary", "lower_primary", "upper_primary", "junior_secondary", "senior_secondary", "eight_four_four"] },
  Mathematics: { label: "Mathematics", mnemonic: "MAT", color: "math", level: ["upper_primary", "junior_secondary", "senior_secondary", "eight_four_four"] },
  "Mathematical Activities": { label: "Mathematical Activities", mnemonic: "MTA", color: "math_activities", level: ["pre_primary", "lower_primary"] },
  "Environmental Activities": { label: "Environmental Activities", mnemonic: "EVA", color: "env_activities", level: ["pre_primary", "lower_primary"] },
  "Science and Technology": { label: "Science and Technology", mnemonic: "S&T", color: "sci_tech", level: ["upper_primary"] },
  "Social Studies": { label: "Social Studies", mnemonic: "SST", color: "social", level: ["upper_primary", "junior_secondary"] },
  "Creative Arts": { label: "Creative Arts", mnemonic: "CRA", color: "creative_arts", level: ["upper_primary", "junior_secondary"] },
  "Physical and Health Education": { label: "Physical & Health Education", mnemonic: "PHE", color: "phe", level: ["upper_primary"] },
  CRE: { label: "CRE", mnemonic: "CRE", color: "cre", level: ["pre_primary", "lower_primary", "upper_primary", "junior_secondary", "eight_four_four"] },
  IRE: { label: "IRE", mnemonic: "IRE", color: "ire", level: ["pre_primary", "lower_primary", "upper_primary", "junior_secondary", "eight_four_four"] },
  HRE: { label: "HRE", mnemonic: "HRE", color: "hre", level: ["pre_primary", "lower_primary", "upper_primary", "junior_secondary", "eight_four_four"] },
  "Integrated Science": { label: "Integrated Science", mnemonic: "ISC", color: "science", level: ["junior_secondary"] },
  "Pre-Technical Studies": { label: "Pre-Technical Studies", mnemonic: "PTS", color: "pre_tech", level: ["junior_secondary"] },
  "Life Skills Education": { label: "Life Skills Education", mnemonic: "LSE", color: "life_skills", level: ["junior_secondary"] },
  "Business Studies": { label: "Business Studies", mnemonic: "BUS", color: "business", level: ["junior_secondary", "senior_secondary", "eight_four_four"] },
  Agriculture: { label: "Agriculture", mnemonic: "AGR", color: "agriculture", level: ["junior_secondary", "senior_secondary", "eight_four_four"] },
  Physics: { label: "Physics", mnemonic: "PHY", color: "phy", level: ["eight_four_four", "senior_secondary"] },
  Chemistry: { label: "Chemistry", mnemonic: "CHM", color: "chem", level: ["eight_four_four", "senior_secondary"] },
  Biology: { label: "Biology", mnemonic: "BIO", color: "bio", level: ["eight_four_four", "senior_secondary"] },
  Geography: { label: "Geography", mnemonic: "GEO", color: "geo", level: ["eight_four_four", "senior_secondary"] },
  French: { label: "French", mnemonic: "FRE", color: "french", level: ["eight_four_four", "junior_secondary", "senior_secondary"] },
  ICT: { label: "ICT", mnemonic: "ICT", color: "ict", level: ["junior_secondary", "senior_secondary", "eight_four_four"] },
  BREAK: { label: "BREAK", mnemonic: "BRK", color: "break", level: ["common"] },
  LUNCH: { label: "LUNCH", mnemonic: "LCH", color: "break", level: ["common"] },
  Games: { label: "Games/PE", mnemonic: "PE", color: "games", level: ["common"] },
};

export function getSubjectMnemonic(subject: string): string {
  const trimmed = subject.trim();
  if (SUBJECTS[trimmed]) return SUBJECTS[trimmed].mnemonic;
  return trimmed.split(/[\s&]+/).map((word) => word[0]?.toUpperCase() || "").join("").slice(0, 3) || "?";
}

export const EDUCATION_LEVELS: Record<EducationLevel, { label: string; emoji: string }> = {
  pre_primary: { label: "Pre-Primary (PP1-PP2)", emoji: "PP" },
  lower_primary: { label: "Lower Primary (Gr 1-3)", emoji: "LP" },
  upper_primary: { label: "Upper Primary (Gr 4-6)", emoji: "UP" },
  junior_secondary: { label: "Junior Secondary (Gr 7-9)", emoji: "JS" },
  senior_secondary: { label: "Senior School (Gr 10-12)", emoji: "SS" },
  eight_four_four: { label: "8-4-4 Secondary", emoji: "844" },
  common: { label: "Common", emoji: "CM" },
};

export const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAYS = DEFAULT_DAYS;

export type PeriodSlot = { time: string; label: string };

export const LEVEL_PERIODS: Record<Exclude<EducationLevel, "common">, PeriodSlot[]> = {
  pre_primary: [
    { time: "8:00-8:30", label: "Arrival & Free Play" },
    { time: "8:30-9:00", label: "Activity 1" },
    { time: "9:00-9:30", label: "Activity 2" },
    { time: "9:30-9:50", label: "BREAK" },
    { time: "9:50-10:20", label: "Activity 3" },
    { time: "10:20-10:50", label: "Activity 4" },
    { time: "10:50-11:20", label: "Activity 5" },
    { time: "11:20-12:00", label: "LUNCH" },
    { time: "12:00-12:30", label: "Activity 6" },
    { time: "12:30-1:00", label: "Outdoor Play" },
  ],
  lower_primary: [
    { time: "8:00-8:40", label: "Lesson 1" },
    { time: "8:40-9:20", label: "Lesson 2" },
    { time: "9:20-10:00", label: "Lesson 3" },
    { time: "10:00-10:20", label: "BREAK" },
    { time: "10:20-11:00", label: "Lesson 4" },
    { time: "11:00-11:40", label: "Lesson 5" },
    { time: "11:40-12:20", label: "Lesson 6" },
    { time: "12:20-1:20", label: "LUNCH" },
    { time: "1:20-2:00", label: "Lesson 7" },
    { time: "2:00-2:40", label: "Games" },
  ],
  upper_primary: [
    { time: "8:00-8:40", label: "Lesson 1" },
    { time: "8:40-9:20", label: "Lesson 2" },
    { time: "9:20-10:00", label: "Lesson 3" },
    { time: "10:00-10:20", label: "BREAK" },
    { time: "10:20-11:00", label: "Lesson 4" },
    { time: "11:00-11:40", label: "Lesson 5" },
    { time: "11:40-12:20", label: "Lesson 6" },
    { time: "12:20-1:20", label: "LUNCH" },
    { time: "1:20-2:00", label: "Lesson 7" },
    { time: "2:00-2:40", label: "Lesson 8" },
    { time: "2:40-3:20", label: "Games" },
  ],
  junior_secondary: [
    { time: "7:30-8:10", label: "Lesson 1" },
    { time: "8:10-8:50", label: "Lesson 2" },
    { time: "8:50-9:30", label: "Lesson 3" },
    { time: "9:30-9:50", label: "BREAK" },
    { time: "9:50-10:30", label: "Lesson 4" },
    { time: "10:30-11:10", label: "Lesson 5" },
    { time: "11:10-11:50", label: "Lesson 6" },
    { time: "11:50-12:30", label: "Lesson 7" },
    { time: "12:30-1:30", label: "LUNCH" },
    { time: "1:30-2:10", label: "Lesson 8" },
    { time: "2:10-2:50", label: "Lesson 9" },
    { time: "2:50-3:30", label: "Games" },
  ],
  senior_secondary: [
    { time: "7:30-8:10", label: "Lesson 1" },
    { time: "8:10-8:50", label: "Lesson 2" },
    { time: "8:50-9:30", label: "Lesson 3" },
    { time: "9:30-9:50", label: "BREAK" },
    { time: "9:50-10:30", label: "Lesson 4" },
    { time: "10:30-11:10", label: "Lesson 5" },
    { time: "11:10-11:50", label: "Lesson 6" },
    { time: "11:50-12:30", label: "Lesson 7" },
    { time: "12:30-1:30", label: "LUNCH" },
    { time: "1:30-2:10", label: "Lesson 8" },
    { time: "2:10-2:50", label: "Lesson 9" },
    { time: "2:50-3:30", label: "Games" },
  ],
  eight_four_four: [
    { time: "7:30-8:10", label: "Lesson 1" },
    { time: "8:10-8:50", label: "Lesson 2" },
    { time: "8:50-9:30", label: "Lesson 3" },
    { time: "9:30-9:50", label: "BREAK" },
    { time: "9:50-10:30", label: "Lesson 4" },
    { time: "10:30-11:10", label: "Lesson 5" },
    { time: "11:10-11:50", label: "Lesson 6" },
    { time: "11:50-12:30", label: "Lesson 7" },
    { time: "12:30-1:30", label: "LUNCH" },
    { time: "1:30-2:10", label: "Lesson 8" },
    { time: "2:10-2:50", label: "Lesson 9" },
    { time: "2:50-3:30", label: "Games" },
  ],
};

export type CellData = { subject: string; teacher: string };
export type TimetableGrid = CellData[][];
export type DesignTheme = "classic" | "modern" | "vibrant" | "minimal" | "kenyan" | "midnight" | "slate" | "monochrome" | "ocean" | "forest";

export function getSubjectColor(subject: string): SubjectKey {
  const trimmed = subject.trim();
  if (SUBJECTS[trimmed]) return SUBJECTS[trimmed].color;
  if (trimmed.toUpperCase() === "BREAK") return "break";
  if (trimmed.toUpperCase() === "LUNCH") return "break";
  if (trimmed.toLowerCase().includes("game") || trimmed.toLowerCase().includes("pe")) return "games";
  return "default";
}

export function getSubjectsByLevel(level: EducationLevel): string[] {
  return Object.entries(SUBJECTS)
    .filter(([, info]) => info.level.includes(level))
    .map(([name]) => name);
}

export function createGridForLevel(level: Exclude<EducationLevel, "common">, periods?: PeriodSlot[]): TimetableGrid {
  const activePeriods = periods || LEVEL_PERIODS[level];
  const levelSubjects = getSubjectsByLevel(level).filter(
    (item) => item !== "BREAK" && item !== "LUNCH" && item !== "Games" && item !== "Physical Education"
  );

  if (levelSubjects.length === 0) {
    return DAYS.map(() => activePeriods.map(() => ({ subject: "", teacher: "" })));
  }

  return DAYS.map((_, dayIdx) =>
    activePeriods.map((period, periodIdx) => {
      const label = period.label.toUpperCase();
      if (label === "BREAK") return { subject: "BREAK", teacher: "" };
      if (label === "LUNCH") return { subject: "LUNCH", teacher: "" };
      if (label.includes("GAME") || label.includes("OUTDOOR")) return { subject: period.label, teacher: "" };
      const index = (dayIdx * activePeriods.length + periodIdx) % levelSubjects.length;
      return { subject: levelSubjects[index], teacher: "" };
    })
  );
}

export const SUBJECT_HEX_COLORS: Record<SubjectKey, string> = {
  math: "#3B6FE8",
  english: "#2D9B4E",
  kiswahili: "#E88A1A",
  science: "#8B45D6",
  social: "#E04365",
  cre: "#2D9B8A",
  phy: "#1A8FD6",
  chem: "#C9A800",
  bio: "#1F8F5E",
  hist: "#D66A1A",
  geo: "#5A9E2D",
  business: "#6B45C9",
  agriculture: "#4D8F1F",
  default: "#7A8FA6",
  break: "#E8B833",
  games: "#D64580",
  ire: "#8B6914",
  hre: "#6B8E23",
  ict: "#2196F3",
  french: "#1565C0",
  german: "#455A64",
  arabic: "#795548",
  mandarin: "#C62828",
  music: "#AB47BC",
  art: "#FF7043",
  home_science: "#26A69A",
  computer: "#42A5F5",
  life_skills: "#66BB6A",
  health: "#EF5350",
  pre_tech: "#78909C",
  community: "#8D6E63",
  ksl: "#7E57C2",
  indigenous: "#8D6E63",
  math_activities: "#5C6BC0",
  env_activities: "#4CAF50",
  hygiene: "#FF8A65",
  movement: "#EC407A",
  sci_tech: "#7C4DFF",
  creative_arts: "#FF6E40",
  phe: "#26C6DA",
  pure_math: "#3949AB",
  applied_math: "#1E88E5",
  statistics: "#0097A7",
  env_science: "#2E7D32",
  electrical: "#F57C00",
  mechatronics: "#546E7A",
  building: "#6D4C41",
  automotive: "#D84315",
  wood_tech: "#A1887F",
  metal_tech: "#757575",
  marine: "#0288D1",
  aviation: "#5D4037",
  economics: "#00897B",
  sociology: "#8E24AA",
  psychology: "#C0CA33",
  citizenship: "#43A047",
  visual_arts: "#E91E63",
  performing_arts: "#9C27B0",
  theatre: "#AD1457",
  sports_science: "#00BCD4",
  power_mech: "#BF360C",
  drawing_design: "#FF5722",
  religious: "#00695C",
  language_activities: "#7986CB",
  psychomotor: "#F06292",
  sensory: "#FFB74D",
  number_work: "#4DB6AC",
  outdoor: "#81C784",
  listening_speaking: "#5C6BC0",
  pre_reading: "#9575CD",
  pre_writing: "#7E57C2",
  storytelling: "#FF8A65",
  counting: "#4DD0E1",
  shapes: "#AED581",
  sorting_patterns: "#FFD54F",
  measurement: "#4FC3F7",
  family_community: "#A1887F",
  plants_animals: "#66BB6A",
  weather_safety: "#42A5F5",
  drawing_painting: "#EF5350",
  modeling: "#FFAB91",
  music_movement: "#CE93D8",
  dance_drama: "#F48FB1",
  moral_values: "#80CBC4",
  character_dev: "#B39DDB",
};

export const DESIGN_THEMES: Record<
  DesignTheme,
  {
    name: string;
    headerBg: string;
    headerText: string;
    dayBg: string;
    borderStyle: string;
    fontStyle: string;
    accent: string;
    pattern: string;
    palette: string[];
  }
> = {
  classic: {
    name: "Classic Kenya",
    headerBg: "bg-primary",
    headerText: "text-primary-foreground",
    dayBg: "bg-secondary",
    borderStyle: "border-2 border-border",
    fontStyle: "font-display",
    accent: "shadow-lg",
    pattern: "",
    palette: ["#2D9B4E", "#E88A1A", "#3B6FE8", "#E04365", "#8B45D6", "#1A8FD6", "#C9A800", "#D66A1A", "#FFFFFF", "#F5F5F5"],
  },
  modern: {
    name: "Modern Glass",
    headerBg: "bg-gradient-to-r from-blue-600 to-indigo-700",
    headerText: "text-white",
    dayBg: "bg-gradient-to-r from-slate-100 to-slate-200",
    borderStyle: "border border-white/20",
    fontStyle: "font-body",
    accent: "shadow-2xl backdrop-blur-sm",
    pattern: "",
    palette: ["#3B82F6", "#6366F1", "#8B5CF6", "#2563EB", "#1D4ED8", "#4F46E5", "#E0E7FF", "#EEF2FF", "#FFFFFF", "#F1F5F9"],
  },
  vibrant: {
    name: "Vibrant Colors",
    headerBg: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500",
    headerText: "text-white",
    dayBg: "bg-gradient-to-r from-amber-50 to-orange-50",
    borderStyle: "border-2 border-orange-200",
    fontStyle: "font-display",
    accent: "shadow-xl shadow-orange-200/50",
    pattern: "",
    palette: ["#F97316", "#EF4444", "#EC4899", "#F59E0B", "#FB923C", "#E11D48", "#FFF7ED", "#FEF2F2", "#FFFFFF", "#FFFBEB"],
  },
  minimal: {
    name: "Clean Minimal",
    headerBg: "bg-foreground",
    headerText: "text-background",
    dayBg: "bg-muted",
    borderStyle: "border border-border/50",
    fontStyle: "font-body",
    accent: "shadow-sm",
    pattern: "",
    palette: ["#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB", "#FFFFFF", "#111827", "#1F2937"],
  },
  kenyan: {
    name: "Kenyan Flag",
    headerBg: "bg-gradient-to-r from-black via-red-700 to-green-700",
    headerText: "text-white",
    dayBg: "bg-gradient-to-r from-red-50 to-green-50",
    borderStyle: "border-2 border-green-800/30",
    fontStyle: "font-display",
    accent: "shadow-xl ring-2 ring-red-700/20",
    pattern: "",
    palette: ["#000000", "#B91C1C", "#15803D", "#FFFFFF", "#DC2626", "#166534", "#FEF2F2", "#F0FDF4", "#991B1B", "#14532D"],
  },
  midnight: {
    name: "Midnight Black",
    headerBg: "bg-gradient-to-r from-gray-900 via-black to-gray-900",
    headerText: "text-white",
    dayBg: "bg-gray-900",
    borderStyle: "border border-gray-700",
    fontStyle: "font-body",
    accent: "shadow-2xl shadow-black/40",
    pattern: "",
    palette: ["#000000", "#111827", "#1F2937", "#374151", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#FFFFFF", "#F9FAFB"],
  },
  slate: {
    name: "Slate Pro",
    headerBg: "bg-gradient-to-r from-slate-700 to-slate-800",
    headerText: "text-white",
    dayBg: "bg-slate-100",
    borderStyle: "border border-slate-300",
    fontStyle: "font-body",
    accent: "shadow-lg shadow-slate-300/50",
    pattern: "",
    palette: ["#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9", "#F8FAFC", "#FFFFFF", "#1E293B"],
  },
  monochrome: {
    name: "Monochrome",
    headerBg: "bg-black",
    headerText: "text-white",
    dayBg: "bg-white",
    borderStyle: "border-2 border-black",
    fontStyle: "font-display",
    accent: "",
    pattern: "",
    palette: ["#000000", "#262626", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5", "#F5F5F5", "#FAFAFA", "#FFFFFF"],
  },
  ocean: {
    name: "Ocean Blue",
    headerBg: "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800",
    headerText: "text-white",
    dayBg: "bg-gradient-to-r from-cyan-50 to-blue-50",
    borderStyle: "border border-cyan-300",
    fontStyle: "font-display",
    accent: "shadow-xl shadow-blue-200/40",
    pattern: "",
    palette: ["#0891B2", "#2563EB", "#1E40AF", "#06B6D4", "#0EA5E9", "#38BDF8", "#CFFAFE", "#DBEAFE", "#FFFFFF", "#ECFEFF"],
  },
  forest: {
    name: "Forest Green",
    headerBg: "bg-gradient-to-r from-emerald-800 via-green-700 to-teal-700",
    headerText: "text-white",
    dayBg: "bg-gradient-to-r from-emerald-50 to-green-50",
    borderStyle: "border border-emerald-300",
    fontStyle: "font-display",
    accent: "shadow-xl shadow-emerald-200/40",
    pattern: "",
    palette: ["#065F46", "#15803D", "#0F766E", "#10B981", "#34D399", "#6EE7B7", "#D1FAE5", "#ECFDF5", "#FFFFFF", "#F0FDFA"],
  },
};

export function parseTimetableJSON(json: string): { grid: TimetableGrid; subjects?: string[] } | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.grid && Array.isArray(parsed.grid)) {
      return { grid: parsed.grid as TimetableGrid, subjects: parsed.subjects };
    }
    if (parsed.subjects && Array.isArray(parsed.subjects)) {
      return { grid: createGridForLevel("eight_four_four"), subjects: parsed.subjects };
    }
    return null;
  } catch {
    return null;
  }
}
