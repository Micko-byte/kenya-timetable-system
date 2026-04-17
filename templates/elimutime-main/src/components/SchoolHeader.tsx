import { DesignTheme, DESIGN_THEMES } from '@/lib/timetableData';

interface SchoolHeaderProps {
  schoolName: string;
  className: string;
  term: string;
  year: string;
  onSchoolNameChange: (v: string) => void;
  onClassNameChange: (v: string) => void;
  onTermChange: (v: string) => void;
  onYearChange: (v: string) => void;
  theme?: DesignTheme;
}

export default function SchoolHeader({
  schoolName, className, term, year,
  onSchoolNameChange, onClassNameChange, onTermChange, onYearChange,
  theme = 'classic',
}: SchoolHeaderProps) {
  const t = DESIGN_THEMES[theme];

  return (
    <div className={`${t.headerBg} rounded-t-xl px-4 py-3`}>
      <div className="flex flex-col items-center gap-2">
        <input
          value={schoolName}
          onChange={(e) => onSchoolNameChange(e.target.value)}
          className="bg-transparent text-white text-xl font-display font-extrabold text-center border-b-2 border-white/30 focus:border-white outline-none pb-1 w-full max-w-lg placeholder:text-white/50"
          placeholder="Enter School Name"
        />
        <div className="flex flex-wrap items-center gap-4 justify-center">
          {[
            { label: 'Class', value: className, onChange: onClassNameChange, placeholder: 'e.g. Form 2A', w: 'w-32' },
            { label: 'Term', value: term, onChange: onTermChange, placeholder: 'Term 1', w: 'w-28' },
            { label: 'Year', value: year, onChange: onYearChange, placeholder: '2026', w: 'w-24' },
          ].map(({ label, value, onChange, placeholder, w }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">{label}:</span>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`bg-white/20 text-white text-sm font-bold rounded-md px-2.5 py-2 ${w} text-center outline-none border-2 border-white/40 focus:border-white focus:bg-white/30 placeholder:text-white/50 transition-all`}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
