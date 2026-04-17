import * as XLSX from "xlsx";
import {
  TimetableGrid,
  DAYS,
  PeriodSlot,
  getSubjectColor,
  SUBJECT_HEX_COLORS,
  SubjectKey,
} from "./timetableData";

function hexToArgb(hex: string): string {
  return `FF${hex.replace("#", "")}`;
}

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "000000" : "FFFFFF";
}

export function exportTimetableToXls(
  grid: TimetableGrid,
  schoolName: string,
  className: string,
  term: string,
  year: string,
  periods?: PeriodSlot[]
) {
  const activePeriods =
    periods ??
    grid[0]?.map((_, index) => ({
      time: `Period ${index + 1}`,
      label: `P${index + 1}`,
    })) ??
    [];

  const wb = XLSX.utils.book_new();
  const data: string[][] = [];

  data.push([schoolName.toUpperCase()]);
  data.push([`CLASS TIMETABLE - ${className} | ${term} | ${year}`]);
  data.push([]);
  data.push(["DAY / TIME", ...activePeriods.map((period) => period.time)]);

  DAYS.forEach((day, dayIdx) => {
    const row = [day.toUpperCase()];
    grid[dayIdx]?.forEach((cell) => {
      row.push(cell.teacher ? `${cell.subject}\n(${cell.teacher})` : cell.subject);
    });
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 14 }, ...activePeriods.map(() => ({ wch: 16 }))];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: activePeriods.length } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: activePeriods.length } },
  ];

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const headerRow = 3;
  const firstDataRow = 4;

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const baseStyle: any = {
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        font: { bold: r <= headerRow, sz: r < 2 ? 14 : 11, name: "Calibri" },
        border: {
          top: { style: "thin", color: { rgb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { rgb: "FFD0D0D0" } },
          left: { style: "thin", color: { rgb: "FFD0D0D0" } },
          right: { style: "thin", color: { rgb: "FFD0D0D0" } },
        },
      };

      if (r < 2) {
        baseStyle.font = { bold: true, sz: r === 0 ? 16 : 12, name: "Calibri", color: { rgb: "FFFFFFFF" } };
        baseStyle.fill = { fgColor: { rgb: "FF1A1A2E" } };
      }

      if (r === headerRow) {
        baseStyle.fill = { fgColor: { rgb: "FF2D3748" } };
        baseStyle.font = { bold: true, sz: 10, name: "Calibri", color: { rgb: "FFFFFFFF" } };
      }

      if (r >= firstDataRow && c === 0) {
        baseStyle.fill = { fgColor: { rgb: "FFF1F5F9" } };
        baseStyle.font = { bold: true, sz: 11, name: "Calibri" };
      }

      if (r >= firstDataRow && c > 0) {
        const dayIdx = r - firstDataRow;
        const periodIdx = c - 1;
        const cell = grid[dayIdx]?.[periodIdx];
        if (cell) {
          const colorKey: SubjectKey = getSubjectColor(cell.subject);
          const hex = SUBJECT_HEX_COLORS[colorKey] || SUBJECT_HEX_COLORS.default;
          baseStyle.fill = { fgColor: { rgb: hexToArgb(hex) } };
          baseStyle.font = {
            bold: true,
            sz: 10,
            name: "Calibri",
            color: { rgb: `FF${contrastText(hex)}` },
          };
        }
      }

      ws[addr].s = baseStyle;
    }
  }

  ws["!rows"] = data.map((_, index) => ({
    hpt: index < 2 ? 28 : index === 2 ? 8 : index === headerRow ? 28 : 44,
  }));

  XLSX.utils.book_append_sheet(wb, ws, "Timetable");
  const safeSchoolName = schoolName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const safeClassName = className.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  XLSX.writeFile(wb, `${safeSchoolName}_Timetable_${safeClassName}.xlsx`);
}
