import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/quizzes/[id] - Get a specific quiz with questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Parse options for each question
    const questionsWithParsedOptions = quiz.questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    }));
    
    return NextResponse.json({
      ...quiz,
      questions: questionsWithParsedOptions
    });
  } catch (error) {
    console.error('Failed to fetch quiz:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

// DELETE /api/quizzes/[id] - Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await db.quiz.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quiz:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}
