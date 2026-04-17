import { useEffect, useRef, useState } from "react";
import type { CellData, DesignTheme, PeriodSlot, TimetableGrid as GridType } from "@/lib/timetableData";
import { DESIGN_THEMES } from "@/lib/timetableData";
import TimetableCell from "./TimetableCell";

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

export default function TimetableGrid({
  grid,
  days,
  periods,
  onCellChange,
  onPeriodChange,
  theme = "classic",
  customSubjects = [],
  colorless = false,
  rowColors = {},
  colColors = {},
  onRowColorChange,
  onColColorChange,
}: TimetableGridProps) {
  const currentTheme = DESIGN_THEMES[theme];
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);
  const [paintTarget, setPaintTarget] = useState<{ type: "row" | "col"; idx: number } | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paintTarget) return;
    const handler = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setPaintTarget(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [paintTarget]);

  const getCellColor = (dayIdx: number, periodIdx: number) => {
    return rowColors[dayIdx] || colColors[periodIdx] || undefined;
  };

  return (
    <div className="overflow-x-auto relative">
      <table className={`w-full border-collapse ${currentTheme.borderStyle}`}>
        <thead>
          <tr>
            <th className={`${currentTheme.headerBg} ${currentTheme.headerText} px-2 py-1 text-[8px] ${currentTheme.fontStyle} font-bold border border-border/30 sticky left-0 z-10 min-w-[60px]`}>
              DAY / TIME
            </th>
            {periods.map((period, index) => {
              const isBreak = period.label.toUpperCase() === "BREAK" || period.label.toUpperCase() === "LUNCH";
              return (
                <th
                  key={index}
                  className={`${currentTheme.headerBg} ${currentTheme.headerText} px-0.5 py-1 text-[7px] ${currentTheme.fontStyle} font-bold border border-border/30 ${isBreak ? "min-w-[44px] max-w-[50px]" : "min-w-[68px]"} ${onPeriodChange ? "cursor-pointer hover:opacity-80" : ""}`}
                >
                  {editingPeriod === index && onPeriodChange ? (
                    <div className="flex flex-col gap-0.5" onClick={(event) => event.stopPropagation()}>
                      <input
                        value={period.time}
                        onChange={(event) => onPeriodChange(index, { ...period, time: event.target.value })}
                        onKeyDown={(event) => event.key === "Enter" && setEditingPeriod(null)}
                        className="w-full bg-white/20 text-center text-[7px] rounded px-0.5 py-0.5 outline-none border border-white/30 text-inherit"
                        autoFocus
                      />
                      <input
                        value={period.label}
                        onChange={(event) => onPeriodChange(index, { ...period, label: event.target.value })}
                        onKeyDown={(event) => event.key === "Enter" && setEditingPeriod(null)}
                        onBlur={() => setEditingPeriod(null)}
                        className="w-full bg-white/20 text-center text-[6px] rounded px-0.5 py-0.5 outline-none border border-white/30 text-inherit"
                      />
                    </div>
                  ) : (
                    <div onClick={() => onPeriodChange && setEditingPeriod(editingPeriod === index ? null : index)}>
                      <div className="leading-tight">{period.time}</div>
                      <div className="font-normal opacity-70 text-[6px] leading-tight">{period.label}</div>
                    </div>
                  )}
                  {colorless && onColColorChange && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setPaintTarget(
                          paintTarget?.type === "col" && paintTarget.idx === index ? null : { type: "col", idx: index }
                        );
                      }}
                      className="mt-0.5 mx-auto block"
                      title="Paint this column"
                    >
                      <span
                        className="inline-block w-3 h-2 rounded-sm border border-white/40"
                        style={{ backgroundColor: colColors[index] || "transparent" }}
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
              <td className={`${currentTheme.dayBg} text-foreground px-1.5 py-1 text-[8px] ${currentTheme.fontStyle} font-extrabold border border-border/30 sticky left-0 z-10`}>
                <div className="flex items-center gap-1">
                  <span>{day.toUpperCase()}</span>
                  {colorless && onRowColorChange && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setPaintTarget(
                          paintTarget?.type === "row" && paintTarget.idx === dayIdx ? null : { type: "row", idx: dayIdx }
                        );
                      }}
                      title="Paint this row"
                    >
                      <span
                        className="inline-block w-3 h-2 rounded-sm border border-border"
                        style={{ backgroundColor: rowColors[dayIdx] || "transparent" }}
                      />
                    </button>
                  )}
                </div>
              </td>
              {grid[dayIdx]?.map((cell, periodIdx) => {
                const isBreak = cell.subject.toUpperCase() === "BREAK" || cell.subject.toUpperCase() === "LUNCH";
                const periodIsBreak =
                  periods[periodIdx]?.label.toUpperCase() === "BREAK" ||
                  periods[periodIdx]?.label.toUpperCase() === "LUNCH";

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

      {paintTarget && (
        <div
          ref={paletteRef}
          className="absolute z-50 bg-card border border-border rounded-lg shadow-xl p-2.5 w-[200px]"
          style={{
            top: paintTarget.type === "row" ? `${60 + paintTarget.idx * 36}px` : "8px",
            left: paintTarget.type === "col" ? `${80 + paintTarget.idx * 72}px` : "70px",
          }}
        >
          <div className="text-[9px] font-bold text-foreground mb-1.5">
            Paint {paintTarget.type === "row" ? `row: ${days[paintTarget.idx]}` : `column: ${periods[paintTarget.idx]?.label}`}
          </div>
          <div className="text-[8px] text-muted-foreground mb-2">Theme: {currentTheme.name}</div>
          <div className="grid grid-cols-5 gap-1.5">
            {currentTheme.palette.map((color) => (
              <button
                key={color}
                onClick={() => {
                  if (paintTarget.type === "row" && onRowColorChange) onRowColorChange(paintTarget.idx, color);
                  if (paintTarget.type === "col" && onColColorChange) onColColorChange(paintTarget.idx, color);
                  setPaintTarget(null);
                }}
                className="w-6 h-6 rounded border-2 transition-all hover:scale-110 border-border/50"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={() => {
              if (paintTarget.type === "row" && onRowColorChange) onRowColorChange(paintTarget.idx, "");
              if (paintTarget.type === "col" && onColColorChange) onColColorChange(paintTarget.idx, "");
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
