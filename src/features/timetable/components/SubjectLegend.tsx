import { useState } from 'react';
import { SUBJECTS, EDUCATION_LEVELS, EducationLevel } from '../lib/timetableData';
import { colorClassMap } from '../lib/subjectColors';

const LEVEL_KEYS: EducationLevel[] = ['pre_primary', 'lower_primary', 'upper_primary', 'junior_secondary', 'senior_secondary', 'eight_four_four'];

export default function SubjectLegend() {
  const [activeLevel, setActiveLevel] = useState<EducationLevel | 'all'>('all');

  const filtered = Object.entries(SUBJECTS)
    .filter(([name, info]) => {
      if (name === 'BREAK' || name === 'LUNCH') return false;
      if (activeLevel === 'all') return true;
      return info.level.includes(activeLevel);
    });

  return (
    <div className="mt-2">
      {/* Level tabs */}
      <div className="flex flex-wrap gap-1 justify-center mb-1.5">
        <button
          onClick={() => setActiveLevel('all')}
          className={`text-[8px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
            activeLevel === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Subjects
        </button>
        {LEVEL_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveLevel(key)}
            className={`text-[8px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
              activeLevel === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {EDUCATION_LEVELS[key].emoji} {EDUCATION_LEVELS[key].label}
          </button>
        ))}
      </div>

      {/* Subject chips */}
      <div className="flex flex-wrap gap-1 justify-center">
        {filtered.map(([name, { color }]) => (
          <div key={name} className="flex items-center gap-0.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${colorClassMap[color] || 'bg-subject-default'}`} />
            <span className="text-[8px] text-muted-foreground font-medium">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
