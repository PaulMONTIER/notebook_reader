import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/highlights - Get highlights for a notebook
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    
    if (!notebookId) {
      return NextResponse.json(
        { error: 'notebookId is required' },
        { status: 400 }
      );
    }
    
    const highlights = await db.highlight.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(highlights);
  } catch (error) {
    console.error('Failed to fetch highlights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

// POST /api/highlights - Create a new highlight
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const highlight = await db.highlight.create({
      data: {
        notebookId: body.notebookId,
        cellIndex: body.cellIndex,
        startOffset: body.startOffset,
        endOffset: body.endOffset,
        color: body.color || 'yellow',
        note: body.note || null,
      }
    });
    
    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Failed to create highlight:', error);
    return NextResponse.json(
      { error: 'Failed to create highlight' },
      { status: 500 }
    );
  }
}
