import { DesignTheme, DESIGN_THEMES } from "@/lib/timetableData";

interface SchoolHeaderProps {
  schoolName: string;
  className: string;
  term: string;
  year: string;
  onSchoolNameChange: (value: string) => void;
  onClassNameChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onYearChange: (value: string) => void;
  theme?: DesignTheme;
}

export default function SchoolHeader({
  schoolName,
  className,
  term,
  year,
  onSchoolNameChange,
  onClassNameChange,
  onTermChange,
  onYearChange,
  theme = "classic",
}: SchoolHeaderProps) {
  const currentTheme = DESIGN_THEMES[theme];

  return (
    <div className={`${currentTheme.headerBg} rounded-t-xl px-4 py-4 sm:px-6 sm:py-5`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <input
          value={schoolName}
          onChange={(event) => onSchoolNameChange(event.target.value)}
          className="bg-transparent text-white text-lg sm:text-2xl md:text-3xl font-display font-extrabold text-center border-b-2 border-white/30 focus:border-white outline-none pb-2 w-full max-w-5xl placeholder:text-white/50 leading-tight"
          placeholder="Enter School Name"
        />

        <div className="grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Class", value: className, onChange: onClassNameChange, placeholder: "e.g. Grade 8" },
            { label: "Term", value: term, onChange: onTermChange, placeholder: "Term 1" },
            { label: "Year", value: year, onChange: onYearChange, placeholder: "2026" },
          ].map((item) => (
            <label key={item.label} className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="text-white text-xs sm:text-sm font-bold tracking-[0.18em] uppercase drop-shadow-sm">
                {item.label}
              </span>
              <input
                value={item.value}
                onChange={(event) => item.onChange(event.target.value)}
                className="w-full min-w-0 rounded-xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center text-sm sm:text-base font-bold text-white outline-none transition-all placeholder:text-white/60 focus:border-white focus:bg-white/30 leading-tight"
                placeholder={item.placeholder}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
