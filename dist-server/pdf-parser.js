"use strict";
// app/lib/pdf-parser.ts
// Custom wrapper for pdf-parse that bypasses the problematic index.js file
// which tries to access test files in debug mode
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdf = parsePdf;
// Import the PDF function directly from the pdf-parse.js file
// Import directly from pdf-parse.js to avoid debug mode ENOENT error
// @ts-expect-error - No type definitions available for pdf-parse module
const pdf_parse_js_1 = __importDefault(require("pdf-parse/lib/pdf-parse.js"));
/**
 * Parse a PDF buffer and extract its text content
 * @param buffer The PDF file as a Buffer
 * @returns Promise with the parsed PDF data including text content
 */
async function parsePdf(buffer) {
    try {
        const result = await (0, pdf_parse_js_1.default)(buffer);
        return result;
    }
    catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }
}
