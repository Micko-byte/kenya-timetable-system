import { useState, useRef, useEffect } from 'react';
import { TimetableGrid as GridType, CellData, DesignTheme, DESIGN_THEMES, PeriodSlot } from '@/lib/timetableData';
import TimetableCell from './TimetableCell';

interface TimetableGridProps {
  grid: GridType;
  days: string[];
  periods: PeriodSlot[];
  onCellChange: (dayIdx: number, periodIdx: number, data: CellData) => void;
  onPeriodChange?: (periodIdx: number, slot: PeriodSlot) => void;
  theme?: DesignTheme;
  customSubjects?: string[];
  colorless?: boolean;
  rowColors?: Record<number, string>;
  colColors?: Record<number, string>;
  onRowColorChange?: (idx: number, color: string) => void;
  onColColorChange?: (idx: number, color: string) => void;
}

export default function TimetableGridComponent({
  grid, days, periods, onCellChange, onPeriodChange, theme = 'classic', customSubjects = [],
  colorless = false, rowColors = {}, colColors = {}, onRowColorChange, onColColorChange,
}: TimetableGridProps) {
  const t = DESIGN_THEMES[theme];
  const palette = t.palette;
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [paintTarget, setPaintTarget] = useState<{ type: 'row' | 'col'; idx: number } | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paintTarget) return;
    const handler = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaintTarget(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [paintTarget]);

  const getCellColor = (dayIdx: number, periodIdx: number): string | undefined => {
    return rowColors[dayIdx] || colColors[periodIdx] || undefined;
  };

  return (
    <div className="overflow-x-auto relative">
      <table className={`w-full border-collapse ${t.borderStyle}`}>
        <thead>
          <tr>
            <th className={`${t.headerBg} ${t.headerText} px-2 py-1 text-[8px] ${t.fontStyle} font-bold border border-border/30 sticky left-0 z-10 min-w-[60px]`}>
              DAY / TIME
            </th>
            {periods.map((period, i) => {
              const isBreak = period.label.toUpperCase() === 'BREAK' || period.label.toUpperCase() === 'LUNCH';
              return (
                <th
                  key={i}
                  className={`${t.headerBg} ${t.headerText} px-0.5 py-1 text-[7px] ${t.fontStyle} font-bold border border-border/30 ${isBreak ? 'min-w-[44px] max-w-[50px]' : 'min-w-[68px]'} ${onPeriodChange ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  {editingPeriod === i && onPeriodChange ? (
                    <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={period.time}
                        onChange={(e) => onPeriodChange(i, { ...period, time: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingPeriod(null)}
                        className="w-full bg-white/20 text-center text-[7px] rounded px-0.5 py-0.5 outline-none border border-white/30 text-inherit"
                        autoFocus
                      />
                      <input
                        value={period.label}
                        onChange={(e) => onPeriodChange(i, { ...period, label: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingPeriod(null)}
                        onBlur={() => setEditingPeriod(null)}
                        className="w-full bg-white/20 text-center text-[6px] rounded px-0.5 py-0.5 outline-none border border-white/30 text-inherit"
                      />
                    </div>
                  ) : (
                    <div onClick={() => onPeriodChange && setEditingPeriod(editingPeriod === i ? null : i)}>
                      <div className="leading-tight">{period.time}</div>
                      <div className="font-normal opacity-70 text-[6px] leading-tight">{period.label}</div>
                    </div>
                  )}
                  {/* Column paint button */}
                  {colorless && onColColorChange && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPaintTarget(paintTarget?.type === 'col' && paintTarget.idx === i ? null : { type: 'col', idx: i }); }}
                      className="mt-0.5 mx-auto block"
                      title="Paint this column"
                    >
                      <span
                        className="inline-block w-3 h-2 rounded-sm border border-white/40"
                        style={{ backgroundColor: colColors[i] || 'transparent' }}
                      />
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dayIdx) => (
            <tr key={day}>
              <td className={`${t.dayBg} text-foreground px-1.5 py-1 text-[8px] ${t.fontStyle} font-extrabold border border-border/30 sticky left-0 z-10`}>
                <div className="flex items-center gap-1">
                  <span>{day.toUpperCase()}</span>
                  {/* Row paint button */}
                  {colorless && onRowColorChange && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPaintTarget(paintTarget?.type === 'row' && paintTarget.idx === dayIdx ? null : { type: 'row', idx: dayIdx }); }}
                      title="Paint this row"
                    >
                      <span
                        className="inline-block w-3 h-2 rounded-sm border border-border"
                        style={{ backgroundColor: rowColors[dayIdx] || 'transparent' }}
                      />
                    </button>
                  )}
                </div>
              </td>
              {grid[dayIdx]?.map((cell, periodIdx) => {
                const isBreak =
                  cell.subject.toUpperCase() === 'BREAK' ||
                  cell.subject.toUpperCase() === 'LUNCH';
                const periodIsBreak =
                  periods[periodIdx]?.label.toUpperCase() === 'BREAK' ||
                  periods[periodIdx]?.label.toUpperCase() === 'LUNCH';
                return (
                  <TimetableCell
                    key={periodIdx}
                    cell={cell}
                    isBreak={isBreak}
                    compact={periodIsBreak}
                    colorless={colorless}
                    customColor={getCellColor(dayIdx, periodIdx)}
                    onChange={(data) => onCellChange(dayIdx, periodIdx, data)}
                    customSubjects={customSubjects}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Floating palette for row/column painting */}
      {paintTarget && (
        <div
          ref={paletteRef}
          className="absolute z-50 bg-card border border-border rounded-lg shadow-xl p-2.5 w-[200px]"
          style={{ top: paintTarget.type === 'row' ? `${60 + paintTarget.idx * 36}px` : '8px', left: paintTarget.type === 'col' ? `${80 + paintTarget.idx * 72}px` : '70px' }}
        >
          <div className="text-[9px] font-bold text-foreground mb-1.5">
            Paint {paintTarget.type === 'row' ? `row: ${days[paintTarget.idx]}` : `column: ${periods[paintTarget.idx]?.label}`}
          </div>
          <div className="text-[8px] text-muted-foreground mb-2">Theme: {t.name}</div>
          <div className="grid grid-cols-5 gap-1.5">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => {
                  if (paintTarget.type === 'row' && onRowColorChange) onRowColorChange(paintTarget.idx, c);
                  if (paintTarget.type === 'col' && onColColorChange) onColColorChange(paintTarget.idx, c);
                  setPaintTarget(null);
                }}
                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                  (paintTarget.type === 'row' ? rowColors[paintTarget.idx] : colColors[paintTarget.idx]) === c
                    ? 'border-foreground ring-2 ring-primary/40 scale-110'
                    : 'border-border/50'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (paintTarget.type === 'row' && onRowColorChange) onRowColorChange(paintTarget.idx, '');
              if (paintTarget.type === 'col' && onColColorChange) onColColorChange(paintTarget.idx, '');
              setPaintTarget(null);
            }}
            className="mt-2 text-[8px] text-muted-foreground hover:text-foreground w-full text-center border-t border-border pt-1.5"
          >
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}
