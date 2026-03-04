import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseNotebook, detectLanguage } from '@/lib/notebook-parser';

// GET /api/notebooks - List all notebooks
export async function GET() {
  try {
    const notebooks = await db.notebook.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            highlights: true,
            annotations: true,
            quizzes: true,
          }
        }
      }
    });
    
    return NextResponse.json(notebooks);
  } catch (error) {
    console.error('Failed to fetch notebooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notebooks' },
      { status: 500 }
    );
  }
}

// POST /api/notebooks - Create a new notebook
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file extension
    if (!file.name.endsWith('.ipynb')) {
      return NextResponse.json(
        { error: 'Only .ipynb files are supported' },
        { status: 400 }
      );
    }
    
    // Read file content
    const fileContent = await file.text();
    
    // Parse notebook to validate
    const parsed = parseNotebook(fileContent);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid Jupyter notebook format' },
        { status: 400 }
      );
    }
    
    // Extract metadata
    const language = detectLanguage(parsed);
    const metadata = JSON.stringify({
      nbformat: parsed.nbformat,
      nbformat_minor: parsed.nbformat_minor,
      language,
      kernelspec: parsed.metadata?.kernelspec,
      cellCount: parsed.cells.length,
    });
    
    // Create notebook in database
    const notebook = await db.notebook.create({
      data: {
        title: title || file.name.replace('.ipynb', ''),
        description: description || `${parsed.cells.length} cells • ${language}`,
        fileName: file.name,
        fileContent,
        metadata,
      }
    });
    
    return NextResponse.json(notebook);
  } catch (error) {
    console.error('Failed to create notebook:', error);
    return NextResponse.json(
      { error: 'Failed to create notebook' },
      { status: 500 }
    );
  }
}
