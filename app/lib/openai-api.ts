// app/lib/openai-api.ts
// Utility function to call Open AI’s API for resume analysis tasks (NLP, grammar, etc.).

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OpenAIResponse {
  response: string;
  error?: string;
}

export async function callOpenAIApi(
  prompt: string,
  options: { temperature?: number; max_tokens?: number; systemPrompt?: string } = {}
): Promise<OpenAIResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: options.systemPrompt || "You are an expert resume analyzer." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: options.temperature ?? 0, // Default to 0 for consistency
      max_tokens: options.max_tokens ?? 2500, // Increased default to 2500 for larger outputs
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from Open AI API");
    }

    return { response };
  } catch (error) {
    console.error("Open AI API error details:", error);
    return {
      response: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}