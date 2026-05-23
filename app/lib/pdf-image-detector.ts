// app/lib/pdf-image-detector.ts
// Detects embedded images in PDF files using pdfjs-dist (Node.js legacy build).
// Used to warn users about photos/images that ATS systems cannot parse.

// Use the legacy build for Node.js compatibility (no canvas/worker required)
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Count the number of embedded images in a PDF buffer.
 * Temporarily suppresses pdfjs-dist font noise from console output.
 * @param buffer The PDF file as a Buffer
 * @returns The number of images found
 */
export async function countImagesInPDF(buffer: Buffer): Promise<number> {
  const data = new Uint8Array(buffer);

  // pdfjs-dist's internal warn() uses console.log("Warning: ...") not console.warn
  // Suppress "fontRes not available" and "TT:" noise during processing
  const originalLog = console.log;
  const originalWarn = console.warn;

  const filter = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('fontRes') || msg.includes('TT:')) return;
    return true; // signal: not filtered
  };

  console.log = (...args: unknown[]) => {
    if (filter(...args)) originalLog.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    if (filter(...args)) originalWarn.apply(console, args);
  };

  try {
    const loadingTask = getDocument({
      data,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    let imageCount = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const operatorList = await page.getOperatorList();
      for (let j = 0; j < operatorList.fnArray.length; j++) {
        const op = operatorList.fnArray[j];
        if (
          op === OPS.paintImageXObject ||
          op === OPS.paintInlineImageXObject
        ) {
          imageCount++;
        }
      }
    }
    return imageCount;
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}
