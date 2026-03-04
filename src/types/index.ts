// Notebook types
export interface NotebookCell {
  cell_type: 'markdown' | 'code' | 'raw';
  source: string[];
  metadata?: Record<string, unknown>;
  execution_count?: number | null;
  outputs?: NotebookOutput[];
}

export interface NotebookOutput {
  output_type: string;
  data?: Record<string, string[]>;
  text?: string[];
  execution_count?: number;
}

export interface NotebookContent {
  nbformat: number;
  nbformat_minor: number;
  cells: NotebookCell[];
  metadata?: {
    kernelspec?: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info?: {
      name: string;
      version?: string;
    };
  };
}

export interface Notebook {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileContent: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

// Highlight types
export interface Highlight {
  id: string;
  notebookId: string;
  cellIndex: number;
  startOffset: number;
  endOffset: number;
  color: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue' | 'orange';

// Annotation types
export interface Annotation {
  id: string;
  notebookId: string;
  cellIndex: number;
  content: string;
  position: string | null;
  createdAt: string;
  updatedAt: string;
}

// Quiz types
export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  order: number;
}

export interface Quiz {
  id: string;
  notebookId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  answers: string[];
  completedAt: string;
}

// UI State types
export type ViewMode = 'library' | 'reader' | 'quiz';

export interface ReaderState {
  activeCellIndex: number | null;
  showHighlights: boolean;
  showAnnotations: boolean;
  highlightColor: HighlightColor;
}
