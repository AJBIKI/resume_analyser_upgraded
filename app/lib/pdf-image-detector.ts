// app/lib/pdf-image-detector.ts
// Detects embedded images in PDF files using pdfjs-dist (Node.js legacy build).
// Used to warn users about photos/images that ATS systems cannot parse.

/**
 * Count the number of embedded images in a PDF buffer.
 * Temporarily suppresses pdfjs-dist font noise from console output.
 * @param buffer The PDF file as a Buffer
 * @returns The number of images found
 */
export async function countImagesInPDF(buffer: Buffer): Promise<number> {
  // Mock DOM classes for Vercel Serverless environment BEFORE importing pdfjs-dist
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.DOMMatrix) {
      (globalThis as any).DOMMatrix = class DOMMatrix {};
    }
    if (!globalThis.ImageData) {
      (globalThis as any).ImageData = class ImageData {};
    }
    if (!globalThis.Path2D) {
      (globalThis as any).Path2D = class Path2D {};
    }
  }

  // Use dynamic import so polyfills are applied first
  const { getDocument, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');

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
