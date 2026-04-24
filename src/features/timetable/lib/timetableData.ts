// ─── Education Levels ──────────────────────────────
export type EducationLevel =
  | 'pre_primary'      // PP1 & PP2
  | 'lower_primary'    // Grade 1-3
  | 'upper_primary'    // Grade 4-6
  | 'junior_secondary' // Grade 7-9 (CBC) / Form 1-4 (8-4-4)
  | 'senior_secondary' // Grade 10-12 (CBC) / Form 1-4 (8-4-4)
  | 'eight_four_four'  // 8-4-4 system
  | 'common';          // Breaks, Games, etc.

export type SubjectKey =
  | 'math' | 'english' | 'kiswahili' | 'science' | 'social'
  | 'cre' | 'phy' | 'chem' | 'bio' | 'hist' | 'geo'
  | 'business' | 'agriculture' | 'break' | 'games' | 'default'
  | 'ire' | 'hre' | 'ict' | 'french' | 'german' | 'arabic' | 'mandarin'
  | 'music' | 'art' | 'home_science' | 'computer' | 'life_skills'
  | 'health' | 'pre_tech' | 'community'
  | 'ksl' | 'indigenous' | 'math_activities' | 'env_activities'
  | 'hygiene' | 'movement' | 'sci_tech' | 'creative_arts' | 'phe'
  | 'pure_math' | 'applied_math' | 'statistics' | 'env_science'
  | 'electrical' | 'mechatronics' | 'building' | 'automotive'
  | 'wood_tech' | 'metal_tech' | 'marine' | 'aviation'
  | 'economics' | 'sociology' | 'psychology' | 'citizenship'
  | 'visual_arts' | 'performing_arts' | 'theatre' | 'sports_science'
  | 'power_mech' | 'drawing_design' | 'religious'
  | 'language_activities' | 'psychomotor' | 'sensory' | 'number_work' | 'outdoor'
  | 'listening_speaking' | 'pre_reading' | 'pre_writing' | 'storytelling'
  | 'counting' | 'shapes' | 'sorting_patterns' | 'measurement'
  | 'family_community' | 'plants_animals' | 'weather_safety'
  | 'drawing_painting' | 'modeling' | 'music_movement' | 'dance_drama'
  | 'moral_values' | 'character_dev';

export type SubjectInfo = {
  label: string;
  mnemonic: string;
  color: SubjectKey;
  level: EducationLevel[];
};

export const SUBJECTS: Record<string, SubjectInfo> = {
  // ─── PRE-PRIMARY (PP1 & PP2) ─────────────────────
  'Language Activities': { label: 'Language Activities', mnemonic: 'LANG', color: 'language_activities', level: ['pre_primary'] },
  'Listening & Speaking': { label: 'Listening & Speaking', mnemonic: 'L&S', color: 'listening_speaking', level: ['pre_primary'] },
  'Pre-Reading Skills': { label: 'Pre-Reading Skills', mnemonic: 'PRD', color: 'pre_reading', level: ['pre_primary'] },
  'Pre-Writing Skills': { label: 'Pre-Writing Skills', mnemonic: 'PWR', color: 'pre_writing', level: ['pre_primary'] },
  'Storytelling': { label: 'Storytelling', mnemonic: 'STR', color: 'storytelling', level: ['pre_primary'] },
  'Counting': { label: 'Counting', mnemonic: 'CNT', color: 'counting', level: ['pre_primary'] },
  'Shapes': { label: 'Shapes', mnemonic: 'SHP', color: 'shapes', level: ['pre_primary'] },
  'Sorting & Patterns': { label: 'Sorting & Patterns', mnemonic: 'S&P', color: 'sorting_patterns', level: ['pre_primary'] },
  'Measurement Concepts': { label: 'Measurement Concepts', mnemonic: 'MSR', color: 'measurement', level: ['pre_primary'] },
  'Number Work': { label: 'Number Work', mnemonic: 'NUM', color: 'number_work', level: ['pre_primary'] },
  'Family & Community': { label: 'Family & Community', mnemonic: 'F&C', color: 'family_community', level: ['pre_primary'] },
  'Plants & Animals': { label: 'Plants & Animals', mnemonic: 'P&A', color: 'plants_animals', level: ['pre_primary'] },
  'Weather & Safety': { label: 'Weather & Safety', mnemonic: 'W&S', color: 'weather_safety', level: ['pre_primary'] },
  'Psychomotor & Creative Activities': { label: 'Psychomotor & Creative', mnemonic: 'PSY', color: 'psychomotor', level: ['pre_primary'] },
  'Drawing & Painting': { label: 'Drawing & Painting', mnemonic: 'DRW', color: 'drawing_painting', level: ['pre_primary'] },
  'Modeling (Clay)': { label: 'Modeling (Clay)', mnemonic: 'MOD', color: 'modeling', level: ['pre_primary'] },
  'Music & Movement': { label: 'Music & Movement', mnemonic: 'M&M', color: 'music_movement', level: ['pre_primary'] },
  'Dance & Drama': { label: 'Dance & Drama', mnemonic: 'D&D', color: 'dance_drama', level: ['pre_primary'] },
  'Moral Values': { label: 'Moral Values', mnemonic: 'MRL', color: 'moral_values', level: ['pre_primary'] },
  'Character Development': { label: 'Character Development', mnemonic: 'CHR', color: 'character_dev', level: ['pre_primary'] },
  'Sensory Activities': { label: 'Sensory Activities', mnemonic: 'SEN', color: 'sensory', level: ['pre_primary'] },
  'Outdoor Activities': { label: 'Outdoor Activities', mnemonic: 'OUT', color: 'outdoor', level: ['pre_primary'] },

  // ─── LOWER PRIMARY (Grade 1-3) ────────────────────
  'English': { label: 'English', mnemonic: 'ENG', color: 'english', level: ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'senior_secondary', 'eight_four_four'] },
  'Kiswahili': { label: 'Kiswahili', mnemonic: 'KSW', color: 'kiswahili', level: ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'senior_secondary', 'eight_four_four'] },
  'Kenyan Sign Language': { label: 'Kenyan Sign Language', mnemonic: 'KSL', color: 'ksl', level: ['lower_primary', 'upper_primary', 'junior_secondary'] },
  'Indigenous Language': { label: 'Indigenous Language', mnemonic: 'IND', color: 'indigenous', level: ['lower_primary', 'upper_primary'] },
  'Mathematical Activities': { label: 'Mathematical Activities', mnemonic: 'MTA', color: 'math_activities', level: ['pre_primary', 'lower_primary'] },
  'Environmental Activities': { label: 'Environmental Activities', mnemonic: 'EVA', color: 'env_activities', level: ['pre_primary', 'lower_primary'] },
  'Hygiene and Nutrition': { label: 'Hygiene and Nutrition', mnemonic: 'HYG', color: 'hygiene', level: ['pre_primary', 'lower_primary'] },
  'Movement and Creative Activities': { label: 'Movement & Creative Activities', mnemonic: 'MCA', color: 'movement', level: ['pre_primary', 'lower_primary'] },

  // ─── UPPER PRIMARY (Grade 4-6) ────────────────────
  'Mathematics': { label: 'Mathematics', mnemonic: 'MAT', color: 'math', level: ['upper_primary', 'junior_secondary', 'senior_secondary', 'eight_four_four'] },
  'Science and Technology': { label: 'Science and Technology', mnemonic: 'S&T', color: 'sci_tech', level: ['upper_primary'] },
  'Social Studies': { label: 'Social Studies', mnemonic: 'SST', color: 'social', level: ['upper_primary', 'junior_secondary'] },
  'Creative Arts': { label: 'Creative Arts', mnemonic: 'CRA', color: 'creative_arts', level: ['upper_primary', 'junior_secondary'] },
  'Physical and Health Education': { label: 'Physical & Health Education', mnemonic: 'PHE', color: 'phe', level: ['upper_primary'] },

  // ─── RELIGIOUS EDUCATION ──────────────────────────
  'CRE': { label: 'CRE', mnemonic: 'CRE', color: 'cre', level: ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'eight_four_four'] },
  'IRE': { label: 'IRE', mnemonic: 'IRE', color: 'ire', level: ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'eight_four_four'] },
  'HRE': { label: 'HRE', mnemonic: 'HRE', color: 'hre', level: ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'eight_four_four'] },
  'Religious Studies': { label: 'Religious Studies', mnemonic: 'REL', color: 'religious', level: ['senior_secondary'] },

  // ─── JUNIOR SECONDARY (Grade 7-9 CBC) ─────────────
  'Integrated Science': { label: 'Integrated Science', mnemonic: 'ISC', color: 'science', level: ['junior_secondary'] },
  'Pre-Technical Studies': { label: 'Pre-Technical Studies', mnemonic: 'PTS', color: 'pre_tech', level: ['junior_secondary'] },
  'Life Skills Education': { label: 'Life Skills Education', mnemonic: 'LSE', color: 'life_skills', level: ['junior_secondary'] },
  'Business Studies': { label: 'Business Studies', mnemonic: 'BUS', color: 'business', level: ['junior_secondary', 'senior_secondary', 'eight_four_four'] },
  'Agriculture': { label: 'Agriculture', mnemonic: 'AGR', color: 'agriculture', level: ['junior_secondary', 'senior_secondary', 'eight_four_four'] },

  // ─── 8-4-4 SECONDARY ─────────────────────────────
  'Physics': { label: 'Physics', mnemonic: 'PHY', color: 'phy', level: ['eight_four_four', 'senior_secondary'] },
  'Chemistry': { label: 'Chemistry', mnemonic: 'CHM', color: 'chem', level: ['eight_four_four', 'senior_secondary'] },
  'Biology': { label: 'Biology', mnemonic: 'BIO', color: 'bio', level: ['eight_four_four', 'senior_secondary'] },
  'History & Government': { label: 'History & Government', mnemonic: 'HIS', color: 'hist', level: ['eight_four_four', 'senior_secondary'] },
  'Geography': { label: 'Geography', mnemonic: 'GEO', color: 'geo', level: ['eight_four_four', 'senior_secondary'] },
  'Computer Studies': { label: 'Computer Studies', mnemonic: 'CMP', color: 'computer', level: ['eight_four_four'] },
  'Home Science': { label: 'Home Science', mnemonic: 'HMS', color: 'home_science', level: ['eight_four_four'] },

  // ─── 8-4-4 Technical ─────────────────────────────
  'Wood Technology': { label: 'Wood Technology', mnemonic: 'WDT', color: 'wood_tech', level: ['eight_four_four', 'senior_secondary'] },
  'Metal Technology': { label: 'Metal Technology', mnemonic: 'MTT', color: 'metal_tech', level: ['eight_four_four'] },
  'Building Construction': { label: 'Building Construction', mnemonic: 'BLD', color: 'building', level: ['eight_four_four', 'senior_secondary'] },
  'Electrical Technology': { label: 'Electrical Technology', mnemonic: 'ELT', color: 'electrical', level: ['eight_four_four'] },
  'Power Mechanics': { label: 'Power Mechanics', mnemonic: 'PWM', color: 'power_mech', level: ['eight_four_four'] },
  'Drawing & Design': { label: 'Drawing & Design', mnemonic: 'D&D', color: 'drawing_design', level: ['eight_four_four'] },
  'Aviation Technology': { label: 'Aviation Technology', mnemonic: 'AVT', color: 'aviation', level: ['eight_four_four', 'senior_secondary'] },

  // ─── Languages ────────────────────────────────────
  'French': { label: 'French', mnemonic: 'FRE', color: 'french', level: ['eight_four_four', 'junior_secondary', 'senior_secondary'] },
  'German': { label: 'German', mnemonic: 'GER', color: 'german', level: ['eight_four_four', 'junior_secondary', 'senior_secondary'] },
  'Arabic': { label: 'Arabic', mnemonic: 'ARB', color: 'arabic', level: ['eight_four_four', 'junior_secondary', 'senior_secondary'] },
  'Mandarin': { label: 'Mandarin', mnemonic: 'MAN', color: 'mandarin', level: ['eight_four_four', 'junior_secondary'] },

  // ─── Arts ─────────────────────────────────────────
  'Music': { label: 'Music', mnemonic: 'MUS', color: 'music', level: ['eight_four_four', 'senior_secondary'] },
  'Art and Design': { label: 'Art and Design', mnemonic: 'ART', color: 'art', level: ['eight_four_four'] },

  // ─── CBC SENIOR SCHOOL (Grade 10-12) ──────────────
  'Pure Mathematics': { label: 'Pure Mathematics', mnemonic: 'PMA', color: 'pure_math', level: ['senior_secondary'] },
  'Applied Mathematics': { label: 'Applied Mathematics', mnemonic: 'AMA', color: 'applied_math', level: ['senior_secondary'] },
  'Statistics': { label: 'Statistics', mnemonic: 'STA', color: 'statistics', level: ['senior_secondary'] },
  'Environmental Science': { label: 'Environmental Science', mnemonic: 'ENV', color: 'env_science', level: ['senior_secondary'] },
  'Computer Science': { label: 'Computer Science', mnemonic: 'CSC', color: 'computer', level: ['senior_secondary'] },
  'Electrical & Electronic Technology': { label: 'Electrical & Electronic Technology', mnemonic: 'EET', color: 'electrical', level: ['senior_secondary'] },
  'Mechatronics': { label: 'Mechatronics', mnemonic: 'MCT', color: 'mechatronics', level: ['senior_secondary'] },
  'Automotive Technology': { label: 'Automotive Technology', mnemonic: 'AUT', color: 'automotive', level: ['senior_secondary'] },
  'Marine & Fisheries Technology': { label: 'Marine & Fisheries', mnemonic: 'MFT', color: 'marine', level: ['senior_secondary'] },

  'Economics': { label: 'Economics', mnemonic: 'ECO', color: 'economics', level: ['senior_secondary'] },
  'Sociology': { label: 'Sociology', mnemonic: 'SOC', color: 'sociology', level: ['senior_secondary'] },
  'Psychology': { label: 'Psychology', mnemonic: 'PSC', color: 'psychology', level: ['senior_secondary'] },
  'Citizenship': { label: 'Citizenship', mnemonic: 'CIT', color: 'citizenship', level: ['senior_secondary'] },

  'Visual Arts': { label: 'Visual Arts', mnemonic: 'VIS', color: 'visual_arts', level: ['senior_secondary'] },
  'Performing Arts': { label: 'Performing Arts', mnemonic: 'PFA', color: 'performing_arts', level: ['senior_secondary'] },
  'Theatre & Film': { label: 'Theatre & Film', mnemonic: 'T&F', color: 'theatre', level: ['senior_secondary'] },
  'Sports Science': { label: 'Sports Science', mnemonic: 'SPS', color: 'sports_science', level: ['senior_secondary'] },
  'Physical Education': { label: 'Physical Education', mnemonic: 'PE', color: 'games', level: ['senior_secondary'] },

  // ─── Cross-cutting ────────────────────────────────
  'ICT': { label: 'ICT', mnemonic: 'ICT', color: 'ict', level: ['junior_secondary', 'senior_secondary', 'eight_four_four'] },
  'Health Education': { label: 'Health Education', mnemonic: 'HLT', color: 'health', level: ['junior_secondary'] },
  'Community Service Learning': { label: 'Community Service Learning', mnemonic: 'CSL', color: 'community', level: ['senior_secondary'] },

  // ─── Breaks / Activities ──────────────────────────
  'BREAK': { label: 'BREAK', mnemonic: 'BRK', color: 'break', level: ['common'] },
  'LUNCH': { label: 'LUNCH', mnemonic: 'LCH', color: 'break', level: ['common'] },
  'Games': { label: 'Games/PE', mnemonic: 'PE', color: 'games', level: ['common'] },
};

/** Get the mnemonic for a subject name */
export function getSubjectMnemonic(subject: string): string {
  const trimmed = subject.trim();
  if (SUBJECTS[trimmed]) return SUBJECTS[trimmed].mnemonic;
  // Generate a fallback mnemonic from initials
  return trimmed.split(/[\s&]+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3) || '?';
}

export const EDUCATION_LEVELS: Record<EducationLevel, { label: string; emoji: string }> = {
  pre_primary: { label: 'Pre-Primary (PP1-PP2)', emoji: '🌱' },
  lower_primary: { label: 'Lower Primary (Gr 1-3)', emoji: '🟢' },
  upper_primary: { label: 'Upper Primary (Gr 4-6)', emoji: '🟡' },
  junior_secondary: { label: 'Junior Secondary (Gr 7-9)', emoji: '🔵' },
  senior_secondary: { label: 'Senior School (Gr 10-12)', emoji: '🔴' },
  eight_four_four: { label: '8-4-4 Secondary (F1-4)', emoji: '🏫' },
  common: { label: 'Common', emoji: '⏸️' },
};

export const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Keep DAYS as alias for backward compat
export const DAYS = DEFAULT_DAYS;

export type PeriodSlot = { time: string; label: string };

export const LEVEL_PERIODS: Record<Exclude<EducationLevel, 'common'>, PeriodSlot[]> = {
  pre_primary: [
    { time: '8:00-8:30', label: 'Arrival & Free Play' },
    { time: '8:30-9:00', label: 'Activity 1' },
    { time: '9:00-9:30', label: 'Activity 2' },
    { time: '9:30-9:50', label: 'BREAK' },
    { time: '9:50-10:20', label: 'Activity 3' },
    { time: '10:20-10:50', label: 'Activity 4' },
    { time: '10:50-11:20', label: 'Activity 5' },
    { time: '11:20-12:00', label: 'LUNCH' },
    { time: '12:00-12:30', label: 'Activity 6' },
    { time: '12:30-1:00', label: 'Outdoor Play' },
  ],
  lower_primary: [
    { time: '8:00-8:40', label: 'Lesson 1' },
    { time: '8:40-9:20', label: 'Lesson 2' },
    { time: '9:20-10:00', label: 'Lesson 3' },
    { time: '10:00-10:20', label: 'BREAK' },
    { time: '10:20-11:00', label: 'Lesson 4' },
    { time: '11:00-11:40', label: 'Lesson 5' },
    { time: '11:40-12:20', label: 'Lesson 6' },
    { time: '12:20-1:20', label: 'LUNCH' },
    { time: '1:20-2:00', label: 'Lesson 7' },
    { time: '2:00-2:40', label: 'Games' },
  ],
  upper_primary: [
    { time: '8:00-8:40', label: 'Lesson 1' },
    { time: '8:40-9:20', label: 'Lesson 2' },
    { time: '9:20-10:00', label: 'Lesson 3' },
    { time: '10:00-10:20', label: 'BREAK' },
    { time: '10:20-11:00', label: 'Lesson 4' },
    { time: '11:00-11:40', label: 'Lesson 5' },
    { time: '11:40-12:20', label: 'Lesson 6' },
    { time: '12:20-1:20', label: 'LUNCH' },
    { time: '1:20-2:00', label: 'Lesson 7' },
    { time: '2:00-2:40', label: 'Lesson 8' },
    { time: '2:40-3:20', label: 'Games' },
  ],
  junior_secondary: [
    { time: '7:30-8:10', label: 'Lesson 1' },
    { time: '8:10-8:50', label: 'Lesson 2' },
    { time: '8:50-9:30', label: 'Lesson 3' },
    { time: '9:30-9:50', label: 'BREAK' },
    { time: '9:50-10:30', label: 'Lesson 4' },
    { time: '10:30-11:10', label: 'Lesson 5' },
    { time: '11:10-11:50', label: 'Lesson 6' },
    { time: '11:50-12:30', label: 'Lesson 7' },
    { time: '12:30-1:30', label: 'LUNCH' },
    { time: '1:30-2:10', label: 'Lesson 8' },
    { time: '2:10-2:50', label: 'Lesson 9' },
    { time: '2:50-3:30', label: 'Games' },
  ],
  senior_secondary: [
    { time: '7:30-8:10', label: 'Lesson 1' },
    { time: '8:10-8:50', label: 'Lesson 2' },
    { time: '8:50-9:30', label: 'Lesson 3' },
    { time: '9:30-9:50', label: 'BREAK' },
    { time: '9:50-10:30', label: 'Lesson 4' },
    { time: '10:30-11:10', label: 'Lesson 5' },
    { time: '11:10-11:50', label: 'Lesson 6' },
    { time: '11:50-12:30', label: 'Lesson 7' },
    { time: '12:30-1:30', label: 'LUNCH' },
    { time: '1:30-2:10', label: 'Lesson 8' },
    { time: '2:10-2:50', label: 'Lesson 9' },
    { time: '2:50-3:30', label: 'Games' },
  ],
  eight_four_four: [
    { time: '7:30-8:10', label: 'Lesson 1' },
    { time: '8:10-8:50', label: 'Lesson 2' },
    { time: '8:50-9:30', label: 'Lesson 3' },
    { time: '9:30-9:50', label: 'BREAK' },
    { time: '9:50-10:30', label: 'Lesson 4' },
    { time: '10:30-11:10', label: 'Lesson 5' },
    { time: '11:10-11:50', label: 'Lesson 6' },
    { time: '11:50-12:30', label: 'Lesson 7' },
    { time: '12:30-1:30', label: 'LUNCH' },
    { time: '1:30-2:10', label: 'Lesson 8' },
    { time: '2:10-2:50', label: 'Lesson 9' },
    { time: '2:50-3:30', label: 'Games' },
  ],
};

export const DEFAULT_PERIODS = LEVEL_PERIODS.eight_four_four;

export type CellData = {
  subject: string;
  teacher: string;
};

export type TimetableGrid = CellData[][];

export interface ClassData {
  name: string;
  level: ActiveLevel;
  grid: TimetableGrid;
  days?: string[];
  periods?: PeriodSlot[];
}

export interface MasterTimetable {
  schoolName: string;
  term: string;
  year: string;
  classes: ClassData[];
}

export type DesignTheme = 'classic_kenya' | 'modern_glass' | 'vibrant_colors' | 'clean_minimal' | 'kenyan_flag' | 'midnight_black' | 'slate_pro' | 'monochrome' | 'ocean_blue' | 'forest_green';

export type ActiveLevel = Exclude<EducationLevel, 'common'>;

export function getSubjectColor(subject: string): SubjectKey {
  const trimmed = subject.trim();
  if (SUBJECTS[trimmed]) return SUBJECTS[trimmed].color;
  if (trimmed.toUpperCase() === 'BREAK') return 'break';
  if (trimmed.toUpperCase() === 'LUNCH') return 'break';
  if (trimmed.toLowerCase().includes('game') || trimmed.toLowerCase().includes('pe')) return 'games';
  return 'default';
}

export function getSubjectsByLevel(level: EducationLevel): string[] {
  return Object.entries(SUBJECTS)
    .filter(([, info]) => info.level.includes(level))
    .map(([name]) => name);
}

export function createDefaultGrid(): TimetableGrid {
  return createGridForLevel('eight_four_four');
}

export function createGridForLevel(level: Exclude<EducationLevel, 'common'>, periods?: PeriodSlot[]): TimetableGrid {
  const p = periods || LEVEL_PERIODS[level];
  const levelSubjects = getSubjectsByLevel(level).filter(
    (s) => s !== 'BREAK' && s !== 'LUNCH' && s !== 'Games' && s !== 'Physical Education'
  );
  if (levelSubjects.length === 0) return DAYS.map(() => p.map(() => ({ subject: '', teacher: '' })));

  return DAYS.map((_, dayIdx) =>
    p.map((period, pIdx) => {
      const lbl = period.label.toUpperCase();
      if (lbl === 'BREAK') return { subject: 'BREAK', teacher: '' };
      if (lbl === 'LUNCH') return { subject: 'LUNCH', teacher: '' };
      if (lbl.includes('GAME') || lbl.includes('OUTDOOR') || lbl.includes('FREE PLAY')) return { subject: period.label, teacher: '' };
      const idx = (dayIdx * p.length + pIdx) % levelSubjects.length;
      return { subject: levelSubjects[idx], teacher: '' };
    })
  );
}

export const SUBJECT_HEX_COLORS: Record<SubjectKey, string> = {
  math: '#3B6FE8', english: '#2D9B4E', kiswahili: '#E88A1A', science: '#8B45D6',
  social: '#E04365', cre: '#2D9B8A', phy: '#1A8FD6', chem: '#C9A800',
  bio: '#1F8F5E', hist: '#D66A1A', geo: '#5A9E2D', business: '#6B45C9',
  agriculture: '#4D8F1F', default: '#7A8FA6', break: '#E8B833', games: '#D64580',
  ire: '#8B6914', hre: '#6B8E23', ict: '#2196F3', french: '#1565C0',
  german: '#455A64', arabic: '#795548', mandarin: '#C62828', music: '#AB47BC',
  art: '#FF7043', home_science: '#26A69A', computer: '#42A5F5', life_skills: '#66BB6A',
  health: '#EF5350', pre_tech: '#78909C', community: '#8D6E63',
  ksl: '#7E57C2', indigenous: '#8D6E63', math_activities: '#5C6BC0',
  env_activities: '#4CAF50', hygiene: '#FF8A65', movement: '#EC407A',
  sci_tech: '#7C4DFF', creative_arts: '#FF6E40', phe: '#26C6DA',
  pure_math: '#3949AB', applied_math: '#1E88E5', statistics: '#0097A7',
  env_science: '#2E7D32', electrical: '#F57C00', mechatronics: '#546E7A',
  building: '#6D4C41', automotive: '#D84315', wood_tech: '#A1887F',
  metal_tech: '#757575', marine: '#0288D1', aviation: '#5D4037',
  economics: '#00897B', sociology: '#8E24AA', psychology: '#C0CA33',
  citizenship: '#43A047', visual_arts: '#E91E63', performing_arts: '#9C27B0',
  theatre: '#AD1457', sports_science: '#00BCD4', power_mech: '#BF360C',
  drawing_design: '#FF5722', religious: '#00695C',
  language_activities: '#7986CB', psychomotor: '#F06292', sensory: '#FFB74D',
  number_work: '#4DB6AC', outdoor: '#81C784',
  listening_speaking: '#5C6BC0', pre_reading: '#9575CD', pre_writing: '#7E57C2',
  storytelling: '#FF8A65', counting: '#4DD0E1', shapes: '#AED581',
  sorting_patterns: '#FFD54F', measurement: '#4FC3F7',
  family_community: '#A1887F', plants_animals: '#66BB6A', weather_safety: '#42A5F5',
  drawing_painting: '#EF5350', modeling: '#FFAB91', music_movement: '#CE93D8',
  dance_drama: '#F48FB1', moral_values: '#80CBC4', character_dev: '#B39DDB',
};

export const DESIGN_THEMES: Record<DesignTheme, {
  name: string;
  headerBg: string;
  headerText: string;
  dayBg: string;
  borderStyle: string;
  fontStyle: string;
  accent: string;
  pattern: string;
  palette: string[]; // hex colors for row/column painting
}> = {
  classic_kenya: {
    name: 'Classic Kenya',
    headerBg: 'bg-primary',
    headerText: 'text-primary-foreground',
    dayBg: 'bg-secondary',
    borderStyle: 'border-2 border-border',
    fontStyle: 'font-display',
    accent: 'shadow-lg',
    pattern: '',
    palette: ['#2D9B4E', '#E88A1A', '#3B6FE8', '#E04365', '#8B45D6', '#1A8FD6', '#C9A800', '#D66A1A', '#FFFFFF', '#F5F5F5'],
  },
  modern_glass: {
    name: 'Modern Glass',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    headerText: 'text-white',
    dayBg: 'bg-gradient-to-r from-slate-100 to-slate-200',
    borderStyle: 'border border-white/20',
    fontStyle: 'font-body',
    accent: 'shadow-2xl backdrop-blur-sm',
    pattern: 'bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.05),transparent)]',
    palette: ['#3B82F6', '#6366F1', '#8B5CF6', '#2563EB', '#1D4ED8', '#4F46E5', '#E0E7FF', '#EEF2FF', '#FFFFFF', '#F1F5F9'],
  },
  vibrant_colors: {
    name: 'Vibrant Colors',
    headerBg: 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500',
    headerText: 'text-white',
    dayBg: 'bg-gradient-to-r from-amber-50 to-orange-50',
    borderStyle: 'border-2 border-orange-200',
    fontStyle: 'font-display',
    accent: 'shadow-xl shadow-orange-200/50',
    pattern: 'bg-[linear-gradient(135deg,rgba(255,165,0,0.03)_25%,transparent_25%,transparent_50%,rgba(255,165,0,0.03)_50%,rgba(255,165,0,0.03)_75%,transparent_75%)] bg-[length:20px_20px]',
    palette: ['#F97316', '#EF4444', '#EC4899', '#F59E0B', '#FB923C', '#E11D48', '#FFF7ED', '#FEF2F2', '#FFFFFF', '#FFFBEB'],
  },
  clean_minimal: {
    name: 'Clean Minimal',
    headerBg: 'bg-foreground',
    headerText: 'text-background',
    dayBg: 'bg-muted',
    borderStyle: 'border border-border/50',
    fontStyle: 'font-body',
    accent: 'shadow-sm',
    pattern: '',
    palette: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#FFFFFF', '#111827', '#1F2937'],
  },
  kenyan_flag: {
    name: 'Kenyan Flag',
    headerBg: 'bg-gradient-to-r from-black via-red-700 to-green-700',
    headerText: 'text-white',
    dayBg: 'bg-gradient-to-r from-red-50 to-green-50',
    borderStyle: 'border-2 border-green-800/30',
    fontStyle: 'font-display',
    accent: 'shadow-xl ring-2 ring-red-700/20',
    pattern: 'bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,128,0,0.02)_3px,rgba(0,128,0,0.02)_6px)]',
    palette: ['#000000', '#B91C1C', '#15803D', '#FFFFFF', '#DC2626', '#166534', '#FEF2F2', '#F0FDF4', '#991B1B', '#14532D'],
  },
  midnight_black: {
    name: 'Midnight Black',
    headerBg: 'bg-gradient-to-r from-gray-900 via-black to-gray-900',
    headerText: 'text-white',
    dayBg: 'bg-gray-900',
    borderStyle: 'border border-gray-700',
    fontStyle: 'font-body',
    accent: 'shadow-2xl shadow-black/40',
    pattern: '',
    palette: ['#000000', '#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#FFFFFF', '#F9FAFB'],
  },
  slate_pro: {
    name: 'Slate Pro',
    headerBg: 'bg-gradient-to-r from-slate-700 to-slate-800',
    headerText: 'text-white',
    dayBg: 'bg-slate-100',
    borderStyle: 'border border-slate-300',
    fontStyle: 'font-body',
    accent: 'shadow-lg shadow-slate-300/50',
    pattern: '',
    palette: ['#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9', '#F8FAFC', '#FFFFFF', '#1E293B'],
  },
  monochrome: {
    name: 'Monochrome',
    headerBg: 'bg-black',
    headerText: 'text-white',
    dayBg: 'bg-white',
    borderStyle: 'border-2 border-black',
    fontStyle: 'font-display',
    accent: '',
    pattern: '',
    palette: ['#000000', '#262626', '#404040', '#737373', '#A3A3A3', '#D4D4D4', '#E5E5E5', '#F5F5F5', '#FAFAFA', '#FFFFFF'],
  },
  ocean_blue: {
    name: 'Ocean Blue',
    headerBg: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800',
    headerText: 'text-white',
    dayBg: 'bg-gradient-to-r from-cyan-50 to-blue-50',
    borderStyle: 'border border-cyan-300',
    fontStyle: 'font-display',
    accent: 'shadow-xl shadow-blue-200/40',
    pattern: '',
    palette: ['#0891B2', '#2563EB', '#1E40AF', '#06B6D4', '#0EA5E9', '#38BDF8', '#CFFAFE', '#DBEAFE', '#FFFFFF', '#ECFEFF'],
  },
  forest_green: {
    name: 'Forest Green',
    headerBg: 'bg-gradient-to-r from-emerald-800 via-green-700 to-teal-700',
    headerText: 'text-white',
    dayBg: 'bg-gradient-to-r from-emerald-50 to-green-50',
    borderStyle: 'border border-emerald-300',
    fontStyle: 'font-display',
    accent: 'shadow-xl shadow-emerald-200/40',
    pattern: '',
    palette: ['#065F46', '#15803D', '#0F766E', '#10B981', '#34D399', '#6EE7B7', '#D1FAE5', '#ECFDF5', '#FFFFFF', '#F0FDFA'],
  },
};

export function parseTimetableJSON(json: string): { grid: TimetableGrid; subjects?: string[]; master?: MasterTimetable } | null {
  try {
    const parsed = JSON.parse(json);
    
    // Support Master Timetable format
    if (parsed.classes && Array.isArray(parsed.classes)) {
      const master = parsed as MasterTimetable;
      // If we have classes, use the first one as the default grid for the creator
      if (master.classes.length > 0) {
        return { 
          grid: master.classes[0].grid, 
          subjects: parsed.subjects,
          master: master 
        };
      }
    }

    if (parsed.grid && Array.isArray(parsed.grid)) {
      const grid = parsed.grid as TimetableGrid;
      if (grid.length >= 1 && grid.every(row => Array.isArray(row))) {
        return { grid, subjects: parsed.subjects };
      }
    }
    if (parsed.subjects && Array.isArray(parsed.subjects)) {
      return { grid: createDefaultGrid(), subjects: parsed.subjects };
    }
    return null;
  } catch {
    return null;
  }
}

export function aggregateTeacherTimetable(master: MasterTimetable, teacherName: string): { grid: TimetableGrid; teacher: string } {
  // Use the periods and days from the first class as a template
  const templateClass = master.classes[0];
  const days = templateClass.days || DEFAULT_DAYS;
  const periods = templateClass.periods || LEVEL_PERIODS[templateClass.level];
  
  const teacherGrid: TimetableGrid = days.map(() => 
    periods.map(() => ({ subject: '', teacher: '' }))
  );

  master.classes.forEach((cls) => {
    cls.grid.forEach((row, dayIdx) => {
      row.forEach((cell, periodIdx) => {
        if (cell.teacher.trim().toLowerCase() === teacherName.trim().toLowerCase()) {
          // Found an assignment!
          if (teacherGrid[dayIdx] && teacherGrid[dayIdx][periodIdx]) {
            teacherGrid[dayIdx][periodIdx] = {
              subject: cell.subject,
              teacher: cls.name
            };
          }
        }
      });
    });
  });

  return { grid: teacherGrid, teacher: teacherName };
}
