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
    <div className={`${currentTheme.headerBg} rounded-t-xl px-4 py-3`}>
      <div className="flex flex-col items-center gap-2">
        <input
          value={schoolName}
          onChange={(event) => onSchoolNameChange(event.target.value)}
          className="bg-transparent text-white text-xl font-display font-extrabold text-center border-b-2 border-white/30 focus:border-white outline-none pb-1 w-full max-w-lg placeholder:text-white/50"
          placeholder="Enter School Name"
        />
        <div className="flex flex-wrap items-center gap-4 justify-center">
          {[
            { label: "Class", value: className, onChange: onClassNameChange, placeholder: "e.g. Grade 8", width: "w-32" },
            { label: "Term", value: term, onChange: onTermChange, placeholder: "Term 1", width: "w-28" },
            { label: "Year", value: year, onChange: onYearChange, placeholder: "2026", width: "w-24" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">{item.label}:</span>
              <input
                value={item.value}
                onChange={(event) => item.onChange(event.target.value)}
                className={`bg-white/20 text-white text-sm font-bold rounded-md px-2.5 py-2 ${item.width} text-center outline-none border-2 border-white/40 focus:border-white focus:bg-white/30 placeholder:text-white/50 transition-all`}
                placeholder={item.placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
