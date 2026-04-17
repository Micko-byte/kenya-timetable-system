import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ExportFormat, Timetable } from "@/pages/timetable";

export interface ExportOptions {
  format: ExportFormat;
  includeHeader?: boolean;
  includeLogo?: boolean;
  schoolName?: string;
  logoUrl?: string;
  customization?: {
    colors?: {
      primary?: string;
      secondary?: string;
      text?: string;
    };
    font?: {
      family?: string;
      size?: number;
    };
  };
}

/**
 * Generate HTML for the timetable
 */
const generateTimetableHTML = (
  timetable: Timetable,
  options: ExportOptions
): string => {
  const primaryColor = options.customization?.colors?.primary || "#FACC15";
  const textColor = options.customization?.colors?.text || "#1F2937";
  const fontFamily = options.customization?.font?.family || "Arial, sans-serif";

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Group entries by day and period
  const groupedEntries = timetable.timetable_data.reduce((acc: any, entry: any) => {
    const dayIndex =
      typeof entry.day_of_week === "number"
        ? entry.day_of_week - 1
        : DAYS.indexOf(entry.day);
    const dayName = DAYS[dayIndex] || entry.day || "Monday";
    const periodNumber = entry.period_number || entry.period || 1;
    const key = `${dayName}-${periodNumber}`;
    acc[key] = {
      ...entry,
      isBreak: entry.subject_name === "Break" || entry.subject_id === "break",
      breakType: entry.subject_name,
      subject: entry.subject_name || entry.subject,
      teacher: entry.teacher_name || entry.teacher,
      room: entry.room || entry.room_id,
    };
    return acc;
  }, {});

  let html = `
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: ${fontFamily};
            padding: 40px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 20px;
          }
          .logo {
            max-width: 80px;
            margin-bottom: 10px;
          }
          .school-name {
            font-size: 28px;
            font-weight: bold;
            color: ${textColor};
            margin-bottom: 5px;
          }
          .timetable-title {
            font-size: 20px;
            color: #6B7280;
            margin-bottom: 5px;
          }
          .timetable-date {
            font-size: 14px;
            color: #9CA3AF;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: ${primaryColor};
            color: ${textColor};
            padding: 12px 8px;
            text-align: center;
            font-weight: 600;
            border: 2px solid #E5E7EB;
          }
          td {
            padding: 10px 8px;
            border: 2px solid #E5E7EB;
            vertical-align: top;
          }
          .period-cell {
            background-color: #F3F4F6;
            font-weight: 600;
            text-align: center;
          }
          .entry {
            min-height: 60px;
          }
          .entry-subject {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .entry-teacher {
            font-size: 12px;
            color: #6B7280;
            margin-bottom: 4px;
          }
          .entry-room {
            font-size: 11px;
            color: #9CA3AF;
            background: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
          }
          .break-cell {
            background-color: #FEF3C7;
            text-align: center;
            font-weight: 600;
            color: #92400E;
          }
          .empty-cell {
            text-align: center;
            color: #D1D5DB;
            font-size: 12px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
  `;

  // Add header
  if (options.includeHeader) {
    html += `<div class="header">`;
    if (options.includeLogo && options.logoUrl) {
      html += `<img src="${options.logoUrl}" class="logo" alt="School Logo" />`;
    }
    if (options.schoolName) {
      html += `<div class="school-name">${options.schoolName}</div>`;
    }
    html += `
      <div class="timetable-title">${timetable.name}</div>
      <div class="timetable-date">Generated on ${new Date().toLocaleDateString()}</div>
    </div>`;
  }

  // Add timetable
  html += `
    <table>
      <thead>
        <tr>
          <th>Period / Day</th>
          ${DAYS.map((day) => `<th>${day}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  PERIODS.forEach((period) => {
    html += `<tr><td class="period-cell">Period ${period}</td>`;
    DAYS.forEach((day) => {
      const key = `${day}-${period}`;
      const entry = groupedEntries[key];

      if (entry) {
        if (entry.isBreak) {
          html += `<td class="break-cell">${entry.breakType || "Break"}</td>`;
        } else {
          html += `
            <td>
              <div class="entry">
                <div class="entry-subject">${entry.subject}</div>
                <div class="entry-teacher">${entry.teacher}</div>
                ${entry.room ? `<span class="entry-room">${entry.room}</span>` : ""}
              </div>
            </td>
          `;
        }
      } else {
        html += `<td class="empty-cell">-</td>`;
      }
    });
    html += `</tr>`;
  });

  html += `
      </tbody>
    </table>
    <div class="footer">
      This timetable is subject to change. For updates, contact the school administration.
    </div>
  </body>
</html>
  `;

  return html;
};

/**
 * Export timetable as PDF
 */
export const exportAsPDF = async (
  timetable: Timetable,
  options: ExportOptions
): Promise<void> => {
  try {
    // Create temporary container
    const container = document.createElement("div");
    container.innerHTML = generateTimetableHTML(timetable, options);
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

    // Save PDF
    const filename = `${timetable.name.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.pdf`.replace(/[^a-z0-9_.-]+/gi, "_");
    pdf.save(filename);

    // Cleanup
    document.body.removeChild(container);
  } catch (error) {
    console.error("PDF export failed:", error);
    throw new Error("Failed to export as PDF");
  }
};

/**
 * Export timetable as PNG/JPEG
 */
export const exportAsImage = async (
  timetable: Timetable,
  options: ExportOptions
): Promise<void> => {
  try {
    // Create temporary container
    const container = document.createElement("div");
    container.innerHTML = generateTimetableHTML(timetable, options);
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#FFFFFF",
    });

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error("Failed to create image blob");
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const ext = options.format === "png" ? "png" : "jpg";
        link.download = `${timetable.name.replace(/\s+/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.${ext}`.replace(/[^a-z0-9_.-]+/gi, "_");
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);
        document.body.removeChild(container);
      },
      options.format === "png" ? "image/png" : "image/jpeg",
      0.95
    );
  } catch (error) {
    console.error("Image export failed:", error);
    throw new Error(`Failed to export as ${options.format.toUpperCase()}`);
  }
};

/**
 * Main export function
 */
export const exportTimetable = async (
  timetable: Timetable,
  options: ExportOptions
): Promise<void> => {
  if (options.format === "pdf") {
    await exportAsPDF(timetable, options);
  } else {
    await exportAsImage(timetable, options);
  }
};

export const exportTimetableFile = async (
  timetable: Timetable,
  format: ExportFormat
): Promise<void> => {
  await exportTimetable(timetable, {
    format,
    includeHeader: true,
    schoolName: "Kenya School Timetable Creator",
    customization: {
      colors: {
        primary: "#FACC15",
        text: "#0D3C44",
      },
      font: {
        family: "Recoleta, serif",
      },
    },
  });
};

/**
 * Email timetable to teachers
 */
export const emailTimetablesToTeachers = async (
  timetables: Timetable[],
  schoolId: string
): Promise<void> => {
  try {
    // This would typically call your backend API to send emails
    // For now, this is a placeholder
    console.log("Sending timetables to teachers:", timetables);
    
    // Example API call:
    // await fetch('/api/timetables/email', {
    //   method: 'POST',
    //   body: JSON.stringify({ timetables, schoolId }),
    // });
    
    return Promise.resolve();
  } catch (error) {
    console.error("Failed to email timetables:", error);
    throw new Error("Failed to send timetables via email");
  }
};
