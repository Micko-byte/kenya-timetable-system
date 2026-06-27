import {
  TimetableGrid, DAYS, PeriodSlot, getSubjectColor,
  SUBJECT_HEX_COLORS, SubjectKey,
} from './timetableData';
// xlsx (~430 kB) is dynamically imported inside the export fn so it only loads
// when the user actually exports to Excel.

function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '');
}

/**
 * Contrast helper – returns black or white depending on bg luminance.
 */
function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '000000' : 'FFFFFF';
}

export async function exportTimetableToXls(
  grid: TimetableGrid,
  schoolName: string,
  className: string,
  term: string,
  year: string,
  periods?: PeriodSlot[],
): Promise<void> {
  const XLSX = await import('xlsx');

  const activePeriods = periods ?? grid[0]?.map((_, i) => ({
    time: `Period ${i + 1}`,
    label: `P${i + 1}`,
  })) ?? [];

  const wb = XLSX.utils.book_new();
  const data: string[][] = [];

  // Title rows
  data.push([schoolName.toUpperCase()]);
  data.push([`CLASS TIMETABLE — ${className} | ${term} | ${year}`]);
  data.push([]);

  // Header row – use actual period times
  const header = ['DAY / TIME', ...activePeriods.map((p) => p.time)];
  data.push(header);

  // Data rows
  DAYS.forEach((day, dayIdx) => {
    const row = [day.toUpperCase()];
    grid[dayIdx]?.forEach((cell) => {
      const text = cell.teacher ? `${cell.subject}\n(${cell.teacher})` : cell.subject;
      row.push(text);
    });
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths – match template proportions
  ws['!cols'] = [
    { wch: 14 },
    ...activePeriods.map(() => ({ wch: 16 })),
  ];

  // Merge title cells
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: activePeriods.length } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: activePeriods.length } },
  ];

  // Apply styles – colors matching the on-screen template
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const headerRow = 3; // 0-indexed row of "DAY / TIME" header
  const firstDataRow = 4;

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;

      const baseStyle: any = {
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        font: { bold: r <= headerRow, sz: r < 2 ? 14 : r === 2 ? 11 : 11, name: 'Calibri' },
        border: {
          top: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { rgb: 'FFD0D0D0' } },
        },
      };

      // Title rows
      if (r < 2) {
        baseStyle.font = { bold: true, sz: r === 0 ? 16 : 12, name: 'Calibri', color: { rgb: 'FFFFFFFF' } };
        baseStyle.fill = { fgColor: { rgb: 'FF1A1A2E' } };
      }

      // Header row (DAY/TIME + period times)
      if (r === headerRow) {
        baseStyle.fill = { fgColor: { rgb: 'FF2D3748' } };
        baseStyle.font = { bold: true, sz: 10, name: 'Calibri', color: { rgb: 'FFFFFFFF' } };
      }

      // Day column (first column in data rows)
      if (r >= firstDataRow && c === 0) {
        baseStyle.fill = { fgColor: { rgb: 'FFF1F5F9' } };
        baseStyle.font = { bold: true, sz: 11, name: 'Calibri' };
      }

      // Subject cells – apply matching hex colors from the template
      if (r >= firstDataRow && c > 0) {
        const dayIdx = r - firstDataRow;
        const periodIdx = c - 1;
        if (grid[dayIdx] && grid[dayIdx][periodIdx]) {
          const cell = grid[dayIdx][periodIdx];
          const colorKey: SubjectKey = getSubjectColor(cell.subject);
          const hex = SUBJECT_HEX_COLORS[colorKey] || SUBJECT_HEX_COLORS.default;
          baseStyle.fill = { fgColor: { rgb: hexToArgb(hex) } };
          baseStyle.font = {
            bold: true, sz: 10, name: 'Calibri',
            color: { rgb: 'FF' + contrastText(hex) },
          };
        }
      }

      ws[addr].s = baseStyle;
    }
  }

  // Row heights matching template
  ws['!rows'] = data.map((_, i) => ({
    hpt: i < 2 ? 28 : i === 2 ? 8 : i === headerRow ? 28 : 44,
  }));

  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, `${schoolName.replace(/\s+/g, '_')}_Timetable_${className}.xlsx`);
}
