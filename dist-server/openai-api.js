"use strict";
// app/lib/openai-api.ts
// Utility function to call Open AI’s API for resume analysis tasks (NLP, grammar, etc.).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenAIApi = callOpenAIApi;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function callOpenAIApi(prompt, options = {}) {
    var _a, _b;
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: options.systemPrompt || "You are an expert resume analyzer." },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0, // Default to 0 for consistency
            max_tokens: (_b = options.max_tokens) !== null && _b !== void 0 ? _b : 2500, // Increased default to 2500 for larger outputs
        });
        const response = completion.choices[0].message.content;
        if (!response) {
            throw new Error("No response from Open AI API");
        }
        return { response };
    }
    catch (error) {
        console.error("Open AI API error details:", error);
        return {
            response: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
