import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/quizzes - Get quizzes for a notebook
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
    
    const quizzes = await db.quiz.findMany({
      where: { notebookId },
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Failed to fetch quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}

// POST /api/quizzes - Create a new quiz
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const quiz = await db.quiz.create({
      data: {
        notebookId: body.notebookId,
        title: body.title,
        description: body.description || null,
        questions: {
          create: body.questions.map((q: { question: string; questionType: string; options: string[] | null; correctAnswer: string; explanation: string | null }, index: number) => ({
            question: q.question,
            questionType: q.questionType,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            order: index,
          }))
        }
      },
      include: {
        questions: true
      }
    });
    
    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Failed to create quiz:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}
