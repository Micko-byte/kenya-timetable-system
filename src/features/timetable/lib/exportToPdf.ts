import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportTimetableToPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Timetable element not found');

  // Force the element to render at a fixed A4-landscape pixel width for consistency
  const originalWidth = element.style.width;
  element.style.width = '1400px';

  const canvas = await html2canvas(element, {
    scale: 3, // Higher resolution for crisp text & colors
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1440,
  });

  // Restore original width
  element.style.width = originalWidth;

  // A4 landscape dimensions in mm
  const a4Width = 297;
  const a4Height = 210;
  const pdf = new jsPDF('landscape', 'mm', 'a4');

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = a4Width - 10; // 5mm margin each side
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const yOffset = imgHeight > (a4Height - 10) ? 5 : (a4Height - imgHeight) / 2;

  pdf.addImage(imgData, 'PNG', 5, yOffset, imgWidth, Math.min(imgHeight, a4Height - 10));
  pdf.save(fileName);
}
