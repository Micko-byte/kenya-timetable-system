const PRINT_STYLE = `
  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
  }

  .print-shell {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .print-page {
    width: 100%;
    height: 100%;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-page .timetable-print-root {
    transform-origin: top left;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-page table {
    width: 100%;
    table-layout: fixed;
  }

  .print-page input,
  .print-page button {
    border: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  .print-page [data-no-print] {
    display: none !important;
  }
`;

function cloneDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
}

function buildPrintableDocument(html: string, scale: number, headStyles: string): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Timetable PDF</title>
        ${headStyles}
        <style>${PRINT_STYLE}</style>
      </head>
      <body>
        <div class="print-shell">
          <div class="print-page">
            <div class="timetable-print-root" style="transform: scale(${scale}); width: ${100 / scale}%; max-width: ${100 / scale}%; overflow: hidden;">
              ${html}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function exportTimetableToPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Timetable element not found");

  const printWidth = 1046;
  const printHeight = 718;
  const scale = Math.min(
    1,
    printWidth / Math.max(element.scrollWidth, 1),
    printHeight / Math.max(element.scrollHeight, 1),
  );

  const printableHtml = buildPrintableDocument(element.outerHTML, scale, cloneDocumentStyles());
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) {
    throw new Error("Popup blocked. Allow popups to export PDF.");
  }

  win.document.open();
  win.document.write(printableHtml);
  win.document.close();

  await new Promise<void>((resolve) => {
    const timer = window.setInterval(() => {
      if (win.document.readyState === "complete") {
        window.clearInterval(timer);
        resolve();
      }
    }, 50);
  });

  win.focus();
  win.print();

  const cleanup = () => {
    try {
      win.close();
    } catch {
      // ignore
    }
  };

  window.setTimeout(cleanup, 1000);
}
