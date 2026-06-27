import { DesignTheme, DESIGN_THEMES } from '../lib/timetableData';

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
  theme = 'classic_kenya',
}: SchoolHeaderProps) {
  const t = DESIGN_THEMES[theme];

  return (
    <div className={`${t.headerBg} rounded-t-xl px-4 py-4 sm:px-6 sm:py-5`}>
      <div className="flex flex-col items-center gap-4">
        <input
          value={schoolName}
          onChange={(e) => onSchoolNameChange(e.target.value)}
          className="bg-transparent text-white text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-center border-b-2 border-white/30 focus:border-white outline-none pb-2 w-full max-w-6xl placeholder:text-white/50 leading-tight"
          placeholder="Enter School Name"
        />
        <div className="grid w-full max-w-6xl grid-cols-1 gap-3 sm:[grid-template-columns:minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          {[
            { label: 'Class', value: className, onChange: onClassNameChange, placeholder: 'e.g. Form 2A' },
            { label: 'Term', value: term, onChange: onTermChange, placeholder: 'Term 1' },
            { label: 'Year', value: year, onChange: onYearChange, placeholder: '2026' },
          ].map(({ label, value, onChange, placeholder }) => (
            <label key={label} className="flex flex-col items-center gap-2 min-w-0">
              <span className="text-white text-sm sm:text-base font-bold tracking-[0.18em] uppercase drop-shadow-sm">{label}</span>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full min-w-0 rounded-xl border-2 border-white/50 bg-white/25 px-5 py-4 text-center text-lg sm:text-xl md:text-2xl font-extrabold text-white outline-none transition-all placeholder:text-white/60 focus:border-white focus:bg-white/35 leading-tight"
                placeholder={placeholder}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
