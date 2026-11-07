// app/lib/pdf-image-detector.ts
// Detects embedded images in PDF files using pdfjs-dist v5 (Node.js legacy build).
// Used to warn users about photos/images that ATS systems cannot parse.

import path from 'path';

/**
 * Count the number of embedded images in a PDF buffer.
 * @param buffer The PDF file as a Buffer
 * @returns The number of images found
 */
export async function countImagesInPDF(buffer: Buffer): Promise<number> {
  // Mock minimal DOM globals that pdfjs-dist requires in a Node.js environment
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as unknown as Record<string, unknown>).DOMMatrix) {
      (globalThis as unknown as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
    }
    if (!(globalThis as unknown as Record<string, unknown>).ImageData) {
      (globalThis as unknown as Record<string, unknown>).ImageData = class ImageData {};
    }
    if (!(globalThis as unknown as Record<string, unknown>).Path2D) {
      (globalThis as unknown as Record<string, unknown>).Path2D = class Path2D {};
    }
  }

  // Dynamic import so polyfills are applied before pdfjs initialises.
  const { getDocument, GlobalWorkerOptions, OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // pdfjs-dist v5 requires a non-empty workerSrc (empty string is treated as
  // "not set" and throws). Point it at the worker file on disk so Node.js can
  // spin it up via worker_threads. process.cwd() is the project root both
  // locally and on Vercel (/var/task).
  const workerAbsPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs'
  );
  // Always use forward slashes and the file:// scheme so pdfjs can load it
  GlobalWorkerOptions.workerSrc = `file://${workerAbsPath.replace(/\\/g, '/')}`;

  const data = new Uint8Array(buffer);

  // pdfjs-dist's internal warn() uses console.log("Warning: ...") not console.warn.
  // Suppress "fontRes not available" and "TT:" noise during processing.
  const originalLog = console.log;
  const originalWarn = console.warn;

  const shouldFilter = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    return msg.includes('fontRes') || msg.includes('TT:') || msg.includes('@napi-rs');
  };

  console.log = (...args: unknown[]) => {
    if (!shouldFilter(...args)) originalLog.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    if (!shouldFilter(...args)) originalWarn.apply(console, args);
  };

  try {
    const loadingTask = getDocument({ data, disableFontFace: true });
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
