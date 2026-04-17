import { SubjectKey } from './timetableData';

/** Maps SubjectKey to Tailwind bg class */
export const colorClassMap: Record<string, string> = {
  math: 'bg-subject-math', english: 'bg-subject-english', kiswahili: 'bg-subject-kiswahili',
  science: 'bg-subject-science', social: 'bg-subject-social', cre: 'bg-subject-cre',
  phy: 'bg-subject-phy', chem: 'bg-subject-chem', bio: 'bg-subject-bio',
  hist: 'bg-subject-hist', geo: 'bg-subject-geo', business: 'bg-subject-business',
  agriculture: 'bg-subject-agriculture', default: 'bg-subject-default', break: 'bg-subject-break',
  games: 'bg-subject-games', ire: 'bg-subject-ire', hre: 'bg-subject-hre',
  ict: 'bg-subject-ict', french: 'bg-subject-french', german: 'bg-subject-german',
  arabic: 'bg-subject-arabic', mandarin: 'bg-subject-mandarin', music: 'bg-subject-music',
  art: 'bg-subject-art', home_science: 'bg-subject-home-science', computer: 'bg-subject-computer',
  life_skills: 'bg-subject-life-skills', health: 'bg-subject-health', pre_tech: 'bg-subject-pre-tech',
  community: 'bg-subject-community',
  // New subjects
  ksl: 'bg-subject-ksl', indigenous: 'bg-subject-indigenous',
  math_activities: 'bg-subject-math-activities', env_activities: 'bg-subject-env-activities',
  hygiene: 'bg-subject-hygiene', movement: 'bg-subject-movement',
  sci_tech: 'bg-subject-sci-tech', creative_arts: 'bg-subject-creative-arts',
  phe: 'bg-subject-phe',
  pure_math: 'bg-subject-pure-math', applied_math: 'bg-subject-applied-math',
  statistics: 'bg-subject-statistics', env_science: 'bg-subject-env-science',
  electrical: 'bg-subject-electrical', mechatronics: 'bg-subject-mechatronics',
  building: 'bg-subject-building', automotive: 'bg-subject-automotive',
  wood_tech: 'bg-subject-wood-tech', metal_tech: 'bg-subject-metal-tech',
  marine: 'bg-subject-marine', aviation: 'bg-subject-aviation',
  economics: 'bg-subject-economics', sociology: 'bg-subject-sociology',
  psychology: 'bg-subject-psychology', citizenship: 'bg-subject-citizenship',
  visual_arts: 'bg-subject-visual-arts', performing_arts: 'bg-subject-performing-arts',
  theatre: 'bg-subject-theatre', sports_science: 'bg-subject-sports-science',
  power_mech: 'bg-subject-power-mech', drawing_design: 'bg-subject-drawing-design',
  religious: 'bg-subject-religious',
  language_activities: 'bg-subject-language-activities', psychomotor: 'bg-subject-psychomotor',
  sensory: 'bg-subject-sensory', number_work: 'bg-subject-number-work',
  outdoor: 'bg-subject-outdoor',
  listening_speaking: 'bg-subject-listening-speaking', pre_reading: 'bg-subject-pre-reading',
  pre_writing: 'bg-subject-pre-writing', storytelling: 'bg-subject-storytelling',
  counting: 'bg-subject-counting', shapes: 'bg-subject-shapes',
  sorting_patterns: 'bg-subject-sorting-patterns', measurement: 'bg-subject-measurement',
  family_community: 'bg-subject-family-community', plants_animals: 'bg-subject-plants-animals',
  weather_safety: 'bg-subject-weather-safety',
  drawing_painting: 'bg-subject-drawing-painting', modeling: 'bg-subject-modeling',
  music_movement: 'bg-subject-music-movement', dance_drama: 'bg-subject-dance-drama',
  moral_values: 'bg-subject-moral-values', character_dev: 'bg-subject-character-dev',
};

export function getBgClass(colorKey: SubjectKey | string): string {
  return colorClassMap[colorKey] || 'bg-subject-default';
}
