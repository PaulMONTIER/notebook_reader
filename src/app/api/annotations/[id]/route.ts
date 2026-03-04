import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/annotations/[id] - Update an annotation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const annotation = await db.annotation.update({
      where: { id },
      data: {
        content: body.content,
      }
    });
    
    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Failed to update annotation:', error);
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

// DELETE /api/annotations/[id] - Delete an annotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.annotation.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}
