import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parsePdf } from '@/app/lib/pdf-parser';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const isAllowed =
    allowedTypes.includes(file.type) ||
    file.name.endsWith('.pdf') ||
    file.name.endsWith('.docx');

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Only PDF and DOCX files are allowed' },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Reuse the existing pdf-parser wrapper to avoid the debug-mode ENOENT bug
      const data = await parsePdf(buffer);
      text = data.text;
    } else {
      // DOCX
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: 'No text could be extracted from the file' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: trimmed });
  } catch (error) {
    console.error('Text extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}
