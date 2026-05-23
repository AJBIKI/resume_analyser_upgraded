import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/app/lib/mongodb';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const analysis = await db.collection('analyses').findOne({
      _id: new ObjectId(id),
      clerkUserId: userId,
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Remove internal MongoDB _id and Clerk user ID before sending to client
    const { _id, clerkUserId, ...safeAnalysis } = analysis;

    return NextResponse.json(safeAnalysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
