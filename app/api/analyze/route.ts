import { NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { parsePdf } from "@/app/lib/pdf-parser";
import { countImagesInPDF } from "@/app/lib/pdf-image-detector";
import { analyzeQueue } from "@/app/lib/redis";

// Export AnalysisResult interface for use in other files
export interface AnalysisResult {
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  atsIssues: string[];
  actionVerbFeedback: Array<{ bullet: string; feedback: string }>;
  readabilityScore: number;
  grammarIssues: string[];
}

// Simple readability calculator (fallback)
function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const avgWordsPerSentence = words.length / sentences.length;
  
  // Simple approximation: higher words per sentence = higher grade level
  return Math.min(Math.max(avgWordsPerSentence * 0.5, 1), 12);
}

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string;

    if (!resumeFile || !jobDescription) {
      return NextResponse.json(
        { error: "Resume file and job description are required" },
        { status: 400 }
      );
    }

    // Verify file type
    if (resumeFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a PDF file" },
        { status: 400 }
      );
    }

    // ✅ Read file buffer once
    const buffer = Buffer.from(await resumeFile.arrayBuffer());

    // ✅ Detect embedded images in the PDF
    let imageCount = 0;
    try {
      imageCount = await countImagesInPDF(buffer);
    } catch (e) {
      console.warn("Image detection failed, continuing without:", e);
    }

    // ✅ Extract text from PDF using our custom pdf-parser
    let resumeText: string;
    try {
      const parsed = await parsePdf(buffer);
      resumeText = parsed.text;

      if (!resumeText.trim()) {
        return NextResponse.json(
          {
            error:
              "No text could be extracted from the PDF. Please upload a text-based PDF (not scanned or image-based).",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("PDF parsing error:", error);
      return NextResponse.json(
        {
          error:
            "Failed to parse PDF file. Ensure it's a valid, text-based PDF.",
        },
        { status: 500 }
      );
    }

    // ✅ Basic ATS checks
    const atsIssues: string[] = [];
    if (!resumeText.match(/(Work Experience|Experience)/i)) {
      atsIssues.push("Missing 'Work Experience' section.");
    }
    if (!resumeText.match(/Education/i)) {
      atsIssues.push("Missing 'Education' section.");
    }
    if (!resumeText.includes("@")) {
      atsIssues.push("Missing email in 'Contact Info' section.");
    }

    // ✅ Image detection warning
    if (imageCount > 0) {
      atsIssues.push(
        `Resume contains ${imageCount} embedded image(s), possibly a photo. Many ATS systems cannot parse images and may misread the section. Consider removing the photo for better compatibility.`
      );
    }

    // ✅ Readability score using simple calculation
    let readabilityScore = 0;
    try {
      readabilityScore = calculateReadabilityScore(resumeText);
    } catch (error) {
      atsIssues.push("Unable to calculate readability score due to text issues.");
    }

    // 🔥 Push to BullMQ instead of processing here
    const job = await analyzeQueue.add('analyze', {
      resumeText,
      jobDescription,
      clerkUserId,
      resumeFilename: resumeFile.name,
      atsIssues,
      readabilityScore,
    });

    console.log(`[API] Added job to queue: ${job.id}`);

    // Return the jobId immediately so the client can listen to websockets
    return NextResponse.json({
      jobId: job.id,
      message: 'Analysis job queued successfully',
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}