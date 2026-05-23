import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/app/lib/mongodb';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Fetch all analyses for this user, newest first
    const analyses = await db
      .collection('analyses')
      .find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        resumeFilename: 1,
        matchScore: 1, // Legacy
        atsIssues: 1, // Legacy
        matchingKeywords: 1, // Legacy
        missingKeywords: 1, // Legacy
        overallScore: 1, // New
        keywordAnalysis: 1, // New
        atsAnalysis: 1, // New
        createdAt: 1,
      })
      .toArray();

    const formatted = analyses.map((a) => {
      // Handle Score (Legacy vs New)
      const score = a.overallScore ?? a.matchScore ?? 0;

      // Handle ATS Issues Count
      let atsCount = 0;
      if (a.atsAnalysis?.sectionFlags) {
        atsCount = a.atsAnalysis.sectionFlags.filter((f: any) => f.status === 'missing').length;
      } else if (a.atsIssues) {
        atsCount = a.atsIssues.length;
      }

      // Handle Keywords
      let matchedCount = 0;
      let missingCount = 0;
      if (a.keywordAnalysis) {
        matchedCount = (a.keywordAnalysis.matchedMustHave?.length || 0) + (a.keywordAnalysis.matchedNiceToHave?.length || 0);
        missingCount = (a.keywordAnalysis.missingMustHave?.length || 0) + (a.keywordAnalysis.missingNiceToHave?.length || 0);
      } else {
        matchedCount = a.matchingKeywords?.length || 0;
        missingCount = a.missingKeywords?.length || 0;
      }

      return {
        id: a._id.toString(),
        resumeFilename: a.resumeFilename,
        matchScore: score,
        atsIssueCount: atsCount,
        matchingKeywordCount: matchedCount,
        missingKeywordCount: missingCount,
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({ analyses: formatted });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
