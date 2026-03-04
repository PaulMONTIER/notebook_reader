import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/annotations - Get annotations for a notebook
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
    
    const annotations = await db.annotation.findMany({
      where: { notebookId },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Failed to fetch annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
}

// POST /api/annotations - Create a new annotation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const annotation = await db.annotation.create({
      data: {
        notebookId: body.notebookId,
        cellIndex: body.cellIndex,
        content: body.content,
        position: body.position || null,
      }
    });
    
    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    );
  }
}
