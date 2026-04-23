import { useState, useRef, useEffect } from 'react';
import { CellData, getSubjectColor, getSubjectMnemonic, SUBJECTS } from '../lib/timetableData';
import { colorClassMap } from '../lib/subjectColors';

interface TimetableCellProps {
  cell: CellData;
  isBreak: boolean;
  compact?: boolean;
  colorless?: boolean;
  customColor?: string;
  onChange: (data: CellData) => void;
  customSubjects?: string[];
  viewMode?: 'stream' | 'teacher';
}

export default function TimetableCell({
  cell, isBreak, compact, colorless, customColor, onChange, customSubjects = [], viewMode = 'stream',
}: TimetableCellProps) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(cell.subject);
  const [teacher, setTeacher] = useState(cell.teacher);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSubject(cell.subject);
    setTeacher(cell.teacher);
  }, [cell]);

  const colorKey = getSubjectColor(subject);
  const mnemonic = getSubjectMnemonic(subject);

  // Determine background
  let bgStyle: React.CSSProperties = {};
  let bgClass = '';
  if (colorless && customColor) {
    bgStyle = { backgroundColor: customColor };
  } else if (colorless) {
    bgClass = 'bg-card';
  } else {
    bgClass = colorClassMap[colorKey] || 'bg-subject-default';
  }

  const isDark = customColor ? isColorDark(customColor) : !colorless;
  const textColor = isDark ? 'text-white' : 'text-foreground';

  const handleBlur = () => {
    setEditing(false);
    onChange({ subject, teacher });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const allSubjectNames = [...Object.keys(SUBJECTS), ...customSubjects];

  if (editing) {
    return (
      <td className={`${bgClass} p-1 border border-border/50 ${compact ? 'min-w-[76px] max-w-[90px]' : 'min-w-[118px]'} h-[64px]`} style={bgStyle}>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-[11px] font-semibold rounded bg-card/90 text-card-foreground outline-none border border-border"
            placeholder="Subject"
            list="subject-list"
          />
          {!isBreak && (
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-[10px] rounded bg-card/90 text-card-foreground outline-none border border-border"
              placeholder="Teacher"
            />
          )}
          {isBreak && <div onBlur={handleBlur} />}
        </div>
        <datalist id="subject-list">
          {allSubjectNames.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </td>
    );
  }

  const mainLabel = viewMode === 'teacher' && teacher ? teacher : (mnemonic || '—');
  const subLabel = viewMode === 'teacher' ? (mnemonic || subject) : (subject && mnemonic !== subject ? subject : '');
  const footerLabel = viewMode === 'teacher' ? (mnemonic || subject ? `(${mnemonic || subject})` : '') : (teacher ? `(${teacher})` : '');

  return (
    <td
      onClick={() => setEditing(true)}
      className={`${bgClass} ${textColor} px-1 py-1.5 border ${colorless ? 'border-border' : 'border-background/30'} ${compact ? 'min-w-[76px] max-w-[90px]' : 'min-w-[118px]'} min-h-[64px] cursor-pointer hover:opacity-80 transition-opacity text-center select-none`}
      style={bgStyle}
    >
      <div className={`font-black ${compact ? 'text-[9px]' : 'text-[11px]'} leading-tight tracking-wide uppercase`}>
        {mainLabel}
      </div>
      {!compact && subLabel && (
        <div className="text-[9px] opacity-90 leading-snug mt-0.5 break-words max-w-[92px] mx-auto font-bold">
          {viewMode === 'teacher' ? subLabel : subLabel}
        </div>
      )}
      {!compact && footerLabel && (
        <div className="text-[9px] opacity-80 mt-0.5 italic font-medium">
          {footerLabel}
        </div>
      )}
      {compact && teacher && viewMode === 'stream' && (
        <div className="text-[8px] opacity-70 mt-0.5 font-bold">({teacher})</div>
      )}
    </td>
  );
}

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
}
