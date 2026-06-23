// html2canvas + jspdf are heavy (~600 kB). They're dynamically imported inside
// exportTimetableToPdf so they only load when the user actually exports a PDF.
const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const PAGE_MARGIN_MM = 8;
const PRINTABLE_WIDTH_PX = 1046;

async function waitForFontsAndImages(container: HTMLElement) {
  if ("fonts" in document) {
    try {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      // ignore font loading failures
    }
  }

  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

// Render the timetable off-screen at a fixed print width and its NATURAL height
// (no fixed height, no overflow:hidden) so nothing gets cut off in the export.
function preparePrintClone(element: HTMLElement) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${PRINTABLE_WIDTH_PX}px`;
  wrapper.style.background = "#ffffff";
  wrapper.style.pointerEvents = "none";

  const inner = document.createElement("div");
  inner.style.width = `${PRINTABLE_WIDTH_PX}px`;
  inner.style.background = "#ffffff";
  inner.style.transformOrigin = "top left";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  clone.style.width = `${PRINTABLE_WIDTH_PX}px`;
  clone.style.maxWidth = `${PRINTABLE_WIDTH_PX}px`;
  clone.style.minWidth = "0";
  clone.style.height = "auto";
  clone.style.boxSizing = "border-box";

  inner.appendChild(clone);
  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);

  return { wrapper, inner };
}

export async function exportTimetableToPdf(elementId: string, fileName: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const element = document.getElementById(elementId);
  if (!element) throw new Error("Timetable element not found");

  const { wrapper, inner } = preparePrintClone(element);

  try {
    await waitForFontsAndImages(wrapper);

    const renderHeight = Math.max(inner.scrollHeight, inner.offsetHeight, 1);

    const canvas = await html2canvas(inner, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      width: PRINTABLE_WIDTH_PX,
      height: renderHeight,
      windowWidth: PRINTABLE_WIDTH_PX,
      windowHeight: renderHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    });

    const pdf = new jsPDF("landscape", "mm", "a4");
    const pageWidth = A4_LANDSCAPE_WIDTH_MM - PAGE_MARGIN_MM * 2;
    const pageHeight = A4_LANDSCAPE_HEIGHT_MM - PAGE_MARGIN_MM * 2;

    // Scale the full capture to fit within the page in BOTH dimensions so the
    // entire timetable is visible on one A4 landscape page (shrinks if tall,
    // never clips). Aspect ratio is preserved and the image is centered.
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const xOffset = PAGE_MARGIN_MM + Math.max(0, (pageWidth - imgWidth) / 2);
    const yOffset = PAGE_MARGIN_MM + Math.max(0, (pageHeight - imgHeight) / 2);

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", xOffset, yOffset, imgWidth, imgHeight);
    pdf.save(fileName);
  } finally {
    wrapper.remove();
  }
}
