import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/highlights/[id] - Update a highlight
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const highlight = await db.highlight.update({
      where: { id },
      data: {
        color: body.color,
        note: body.note,
      }
    });
    
    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Failed to update highlight:', error);
    return NextResponse.json(
      { error: 'Failed to update highlight' },
      { status: 500 }
    );
  }
}

// DELETE /api/highlights/[id] - Delete a highlight
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.highlight.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete highlight:', error);
    return NextResponse.json(
      { error: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
}
