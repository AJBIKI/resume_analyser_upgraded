"use strict";
// app/lib/pdf-image-detector.ts
// Detects embedded images in PDF files using pdfjs-dist (Node.js legacy build).
// Used to warn users about photos/images that ATS systems cannot parse.
Object.defineProperty(exports, "__esModule", { value: true });
exports.countImagesInPDF = countImagesInPDF;
// Use the legacy build for Node.js compatibility (no canvas/worker required)
const pdf_mjs_1 = require("pdfjs-dist/legacy/build/pdf.mjs");
/**
 * Count the number of embedded images in a PDF buffer.
 * Temporarily suppresses pdfjs-dist font noise from console output.
 * @param buffer The PDF file as a Buffer
 * @returns The number of images found
 */
async function countImagesInPDF(buffer) {
    const data = new Uint8Array(buffer);
    // pdfjs-dist's internal warn() uses console.log("Warning: ...") not console.warn
    // Suppress "fontRes not available" and "TT:" noise during processing
    const originalLog = console.log;
    const originalWarn = console.warn;
    const filter = (...args) => {
        var _a;
        const msg = String((_a = args[0]) !== null && _a !== void 0 ? _a : '');
        if (msg.includes('fontRes') || msg.includes('TT:'))
            return;
        return true; // signal: not filtered
    };
    console.log = (...args) => {
        if (filter(...args))
            originalLog.apply(console, args);
    };
    console.warn = (...args) => {
        if (filter(...args))
            originalWarn.apply(console, args);
    };
    try {
        const loadingTask = (0, pdf_mjs_1.getDocument)({
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
                if (op === pdf_mjs_1.OPS.paintImageXObject ||
                    op === pdf_mjs_1.OPS.paintInlineImageXObject) {
                    imageCount++;
                }
            }
        }
        return imageCount;
    }
    finally {
        console.log = originalLog;
        console.warn = originalWarn;
    }
}
