import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notebooks/[id] - Get a specific notebook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const notebook = await db.notebook.findUnique({
      where: { id },
      include: {
        highlights: {
          orderBy: { createdAt: 'desc' }
        },
        annotations: {
          orderBy: { createdAt: 'desc' }
        },
        quizzes: {
          include: {
            _count: {
              select: { questions: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Failed to fetch notebook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notebook' },
      { status: 500 }
    );
  }
}

// DELETE /api/notebooks/[id] - Delete a notebook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.notebook.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete notebook:', error);
    return NextResponse.json(
      { error: 'Failed to delete notebook' },
      { status: 500 }
    );
  }
}

// PUT /api/notebooks/[id] - Update a notebook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.fileContent !== undefined) {
      // Validate JSON
      try { JSON.parse(body.fileContent); } catch {
        return NextResponse.json({ error: 'Invalid fileContent JSON' }, { status: 400 });
      }
      data.fileContent = body.fileContent;
    }

    const notebook = await db.notebook.update({
      where: { id },
      data,
    });
    
    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Failed to update notebook:', error);
    return NextResponse.json(
      { error: 'Failed to update notebook' },
      { status: 500 }
    );
  }
}
