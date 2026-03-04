import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseNotebook, getCellSourceText } from '@/lib/notebook-parser';

// POST /api/quizzes/generate - Generate a quiz using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notebookId, questionCount = 5, difficulty = 'medium' } = body;
    
    // Get the notebook
    const notebook = await db.notebook.findUnique({
      where: { id: notebookId }
    });
    
    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }
    
    // Parse the notebook content
    const parsed = parseNotebook(notebook.fileContent);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Failed to parse notebook' },
        { status: 500 }
      );
    }
    
    // Extract text content from cells
    const cellTexts = parsed.cells
      .map((cell, index) => {
        const text = getCellSourceText(cell);
        return `Cell ${index + 1} (${cell.cell_type}):\n${text}`;
      })
      .join('\n\n---\n\n');
    
    // Generate quiz using LLM
    const prompt = `You are an educational quiz generator. Based on the following Jupyter notebook content, create a quiz with ${questionCount} multiple choice questions of ${difficulty} difficulty.

The notebook content:
${cellTexts.substring(0, 8000)} // Limit content length

Instructions:
1. Create ${questionCount} multiple choice questions based on the key concepts in the notebook.
2. Each question should have 4 options.
3. Mark the correct answer.
4. Provide a brief explanation for the correct answer.

Respond ONLY with a valid JSON array in this exact format (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "questionType": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Explanation for why Option A is correct."
  }
]`;

    // Call the LLM API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZHIPU_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      // Fallback: Create sample questions if AI fails
      const sampleQuestions = generateSampleQuestions(parsed, questionCount);
      return NextResponse.json({ questions: sampleQuestions });
    }

    const aiResponse = await response.json();
    let questionsText = aiResponse.choices?.[0]?.message?.content || '[]';
    
    // Clean up the response - remove markdown code blocks if present
    questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let questions;
    try {
      questions = JSON.parse(questionsText);
    } catch {
      // If parsing fails, generate sample questions
      questions = generateSampleQuestions(parsed, questionCount);
    }
    
    // Validate and format questions
    const formattedQuestions = questions.slice(0, questionCount).map((q: { question?: string; questionType?: string; options?: string[]; correctAnswer?: string; explanation?: string }) => ({
      question: q.question || 'Sample question',
      questionType: 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: q.correctAnswer || 'Option A',
      explanation: q.explanation || '',
    }));
    
    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}

// Generate sample questions as fallback
function generateSampleQuestions(parsed: ReturnType<typeof parseNotebook>, count: number) {
  if (!parsed) return [];
  
  const questions = [];
  const codeCells = parsed.cells.filter(c => c.cell_type === 'code');
  const markdownCells = parsed.cells.filter(c => c.cell_type === 'markdown');
  
  // Generate questions based on content
  for (let i = 0; i < Math.min(count, parsed.cells.length); i++) {
    const cell = parsed.cells[i];
    const content = getCellSourceText(cell).substring(0, 100);
    
    questions.push({
      question: `What type of cell is shown in cell ${i + 1}?`,
      questionType: 'multiple_choice',
      options: ['Markdown cell', 'Code cell', 'Raw cell', 'Output cell'],
      correctAnswer: cell.cell_type === 'code' ? 'Code cell' : cell.cell_type === 'markdown' ? 'Markdown cell' : 'Raw cell',
      explanation: `Cell ${i + 1} is a ${cell.cell_type} cell based on its content type.`
    });
  }
  
  return questions;
}
