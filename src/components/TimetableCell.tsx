import { useEffect, useRef, useState } from "react";
import { CellData, SUBJECTS, getSubjectColor, getSubjectMnemonic } from "@/lib/timetableData";
import { colorClassMap } from "@/lib/subjectColors";

interface TimetableCellProps {
  cell: CellData;
  isBreak: boolean;
  compact?: boolean;
  colorless?: boolean;
  customColor?: string;
  onChange: (data: CellData) => void;
  customSubjects?: string[];
}

export default function TimetableCell({
  cell,
  isBreak,
  compact,
  colorless,
  customColor,
  onChange,
  customSubjects = [],
}: TimetableCellProps) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(cell.subject);
  const [teacher, setTeacher] = useState(cell.teacher);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSubject(cell.subject);
    setTeacher(cell.teacher);
  }, [cell]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const colorKey = getSubjectColor(subject);
  const mnemonic = getSubjectMnemonic(subject);
  const allSubjectNames = [...Object.keys(SUBJECTS), ...customSubjects];

  let bgStyle: React.CSSProperties = {};
  let bgClass = "";

  if (colorless && customColor) {
    bgStyle = { backgroundColor: customColor };
  } else if (colorless) {
    bgClass = "bg-card";
  } else {
    bgClass = colorClassMap[colorKey] || "bg-slate-500";
  }

  const handleBlur = () => {
    setEditing(false);
    onChange({ subject, teacher });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") handleBlur();
  };

  if (editing) {
    return (
      <td
        className={`${bgClass} p-0.5 border border-border/70 ${compact ? "min-w-[44px] max-w-[50px]" : "min-w-[68px]"} h-[48px]`}
        style={bgStyle}
      >
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0.5 text-[10px] font-semibold rounded bg-card/90 text-card-foreground outline-none border border-border"
            placeholder="Subject"
            list="subject-list"
          />
          {!isBreak && (
            <input
              value={teacher}
              onChange={(event) => setTeacher(event.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-1 py-0.5 text-[9px] rounded bg-card/90 text-card-foreground outline-none border border-border"
              placeholder="Teacher"
            />
          )}
          <datalist id="subject-list">
            {allSubjectNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </td>
    );
  }

  const textColor = colorless && customColor ? (isColorDark(customColor) ? "text-white" : "text-foreground") : "text-white";
  const isEmptyCell = !subject.trim() && !teacher.trim();

  if (isEmptyCell) {
    return (
      <td
        onClick={() => setEditing(true)}
        className={`${bgClass} ${textColor} px-0.5 py-1 border ${colorless ? "border-border" : "border-border/80"} ${compact ? "min-w-[44px] max-w-[50px]" : "min-w-[74px]"} min-h-[52px] cursor-pointer hover:opacity-80 transition-opacity text-center select-none`}
        style={bgStyle}
      />
    );
  }

  return (
    <td
      onClick={() => setEditing(true)}
      className={`${bgClass} ${textColor} px-0.5 py-1 border ${colorless ? "border-border" : "border-border/80"} ${compact ? "min-w-[44px] max-w-[50px]" : "min-w-[74px]"} min-h-[52px] cursor-pointer hover:opacity-80 transition-opacity text-center select-none`}
      style={bgStyle}
    >
      <div className={`font-black ${compact ? "text-[8px]" : "text-[10px]"} leading-tight tracking-wide`}>{mnemonic || "-"}</div>
      {!compact && subject && mnemonic !== subject && (
        <div className="text-[8px] opacity-80 leading-snug mt-0.5 break-words max-w-[70px] mx-auto">{subject}</div>
      )}
      {teacher && !compact && <div className="text-[8px] opacity-70 mt-0.5">({teacher})</div>}
    </td>
  );
}

function isColorDark(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length < 6) return false;
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 150;
}
