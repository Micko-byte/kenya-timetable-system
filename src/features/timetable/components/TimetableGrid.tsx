import { useState, useRef, useEffect } from 'react';
import { TimetableGrid as GridType, CellData, DesignTheme, DESIGN_THEMES, PeriodSlot } from '../lib/timetableData';
import TimetableCell from './TimetableCell';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';

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
  onDayDelete?: (dayIdx: number) => void;
  onPeriodDelete?: (periodIdx: number) => void;
  viewMode?: 'stream' | 'teacher';
  isGenerating?: boolean;
}

export default function TimetableGridComponent({
  grid, days, periods, onCellChange, onPeriodChange, theme = 'classic_kenya', customSubjects = [],
  colorless = false, rowColors = {}, colColors = {}, onRowColorChange, onColColorChange, viewMode = 'stream',
  isGenerating = false,
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
    <div className="overflow-x-auto relative min-h-[400px]">
      {isGenerating && (
        <div className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl animate-in fade-in duration-500">
          <div className="bg-card/90 border border-border p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-500 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI is Generating...</h3>
            <p className="text-sm text-muted-foreground">
              Wait a moment while our AI engine optimizes your school timetable for conflict-free scheduling.
            </p>
          </div>
        </div>
      )}
      <table className={`min-w-[1180px] w-full border-collapse ${t.borderStyle}`}>
        <thead>
          <tr>
            <th className={`${t.headerBg} ${t.headerText} px-2 py-1.5 text-[10px] ${t.fontStyle} font-bold border border-border/30 sticky left-0 z-10 min-w-[84px]`}>
              DAY / TIME
            </th>
            {periods.map((period, i) => {
              const isBreak = period.label.toUpperCase() === 'BREAK' || period.label.toUpperCase() === 'LUNCH';
              return (
                <th
                  key={i}
                  className={`${t.headerBg} ${t.headerText} px-1 py-1.5 text-[9px] ${t.fontStyle} font-bold border border-border/30 ${isBreak ? 'min-w-[76px] max-w-[90px]' : 'min-w-[118px]'} ${onPeriodChange ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  {editingPeriod === i && onPeriodChange ? (
                    <div className="flex flex-col gap-1 p-2 bg-background/95 rounded-md shadow-sm border border-primary/20" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] uppercase font-bold text-muted-foreground text-left px-0.5">Time</label>
                        <input
                          value={period.time}
                          onChange={(e) => onPeriodChange(i, { ...period, time: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPeriod(null)}
                          className="w-full bg-muted text-center text-[10px] font-bold rounded px-2 py-1 outline-none border border-border focus:border-primary text-foreground"
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] uppercase font-bold text-muted-foreground text-left px-0.5">Label</label>
                        <input
                          value={period.label}
                          onChange={(e) => onPeriodChange(i, { ...period, label: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPeriod(null)}
                          onBlur={() => setEditingPeriod(null)}
                          className="w-full bg-muted text-center text-[10px] rounded px-2 py-1 outline-none border border-border focus:border-primary text-foreground"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => onPeriodChange && setEditingPeriod(editingPeriod === i ? null : i)}
                      className="group flex flex-col items-center justify-center min-h-[30px]"
                    >
                      <div className="leading-tight flex items-center gap-0.5">
                        {period.time}
                      </div>
                      <div className="font-normal opacity-70 text-[8px] leading-tight uppercase tracking-wider">{period.label}</div>
                      <div className="h-0 group-hover:h-2 opacity-0 group-hover:opacity-100 transition-all text-[8px] text-primary/60 font-bold">CLICK TO EDIT</div>
                    </div>
                  )}
                  {onPeriodDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPeriodDelete(i);
                      }}
                      className="mt-1 inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/5 px-2 py-1 text-[9px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      title="Delete this column"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </button>
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
              <td className={`${t.dayBg} text-foreground px-2 py-1.5 text-[10px] ${t.fontStyle} font-extrabold border border-border/30 sticky left-0 z-10`}>
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
                  {onDayDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDayDelete(dayIdx);
                      }}
                      className="ml-1 inline-flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/5 px-2 py-1 text-[9px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      title="Delete this row"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
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
                    viewMode={viewMode}
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
