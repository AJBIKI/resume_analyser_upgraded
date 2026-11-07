// app/lib/pdf-parser.ts
// Uses pdfjs-dist v5 (Node.js legacy build) directly for robust PDF text extraction.
// Replaces the old pdf-parse wrapper which used a bundled pdfjs v1.10.100 that
// throws "Command token too long: 128" on many valid PDFs.

/**
 * Parse a PDF buffer and extract its text content.
 * @param buffer The PDF file as a Buffer
 * @returns Promise resolving to { text: string, numpages: number }
 */
export async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
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

  // Dynamic import so the polyfills above are applied before pdfjs initialises.
  // Using the legacy build for maximum Node.js compatibility.
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable the web worker — Next.js serverless functions have no worker-thread
  // support, so we run everything inline in the main thread.
  GlobalWorkerOptions.workerSrc = '';

  const data = new Uint8Array(buffer);

  const loadingTask = getDocument({ data, disableFontFace: true });
  const pdf = await loadingTask.promise;

  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let lastY: number | undefined;
    for (const item of content.items) {
      // TextItem has a 'str' property; TextMarkedContent does not — skip those.
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5];
      if (lastY !== undefined && y !== lastY) {
        text += '\n';
      }
      text += textItem.str;
      lastY = y;
    }
    text += '\n\n';
  }

  return { text, numpages: pdf.numPages };
}
