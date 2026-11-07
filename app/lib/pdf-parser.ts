// app/lib/pdf-parser.ts
// Uses pdf2json v3 for PDF text extraction — a pure Node.js parser with no
// web-worker requirements, no native module dependencies, and no token-length
// limits. This replaces the old pdf-parse wrapper (bundled pdfjs v1.10.100)
// and the pdfjs-dist v5 approach (which requires a worker in serverless envs).

import PDFParser from 'pdf2json';

/**
 * Parse a PDF buffer and extract its text content.
 * @param buffer The PDF file as a Buffer
 * @returns Promise resolving to { text: string, numpages: number }
 */
export async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  return new Promise((resolve, reject) => {
    // needRawText=true enables getRawTextContent() for clean plain-text output
    const pdfParser = new PDFParser(null, true);

    pdfParser.on('pdfParser_dataError', ({ parserError }) => {
      reject(parserError);
    });

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      const numpages = pdfData.Pages?.length ?? 0;

      // getRawTextContent() returns the full text with form-feed page separators
      let text = pdfParser.getRawTextContent();

      // Normalise form-feed characters used as page separators to double newlines
      text = text.replace(/\f/g, '\n\n').trim();

      resolve({ text, numpages });
    });

    pdfParser.parseBuffer(buffer);
  });
}
