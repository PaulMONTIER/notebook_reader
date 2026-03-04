import { create } from 'zustand';
import type { Notebook, Highlight, Annotation, Quiz, ViewMode, HighlightColor } from '@/types';

interface NotebookState {
  // Data
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  highlights: Highlight[];
  annotations: Annotation[];
  quizzes: Quiz[];
  currentQuiz: Quiz | null;

  // UI State
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  highlightColor: HighlightColor;
  showHighlightToolbar: boolean;

  // Actions
  setNotebooks: (notebooks: Notebook[]) => void;
  setCurrentNotebook: (notebook: Notebook | null) => void;
  setHighlights: (highlights: Highlight[]) => void;
  addHighlight: (highlight: Highlight) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;
  deleteHighlight: (id: string) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setQuizzes: (quizzes: Quiz[]) => void;
  setCurrentQuiz: (quiz: Quiz | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  setHighlightColor: (color: HighlightColor) => void;
  setShowHighlightToolbar: (show: boolean) => void;

  // Cell editing actions
  updateCellSource: (cellIndex: number, newSource: string) => void;
  moveCellUp: (cellIndex: number) => void;
  moveCellDown: (cellIndex: number) => void;
  saveNotebook: () => Promise<void>;
}

// Helper: update fileContent JSON by modifying the cells array
function updateFileContent(notebook: Notebook, updater: (cells: any[]) => any[]): string {
  const parsed = JSON.parse(notebook.fileContent);
  parsed.cells = updater(parsed.cells);
  return JSON.stringify(parsed);
}

// Helper: swap highlights/annotations cellIndex when cells are swapped
function swapCellIndexes<T extends { cellIndex: number }>(items: T[], a: number, b: number): T[] {
  return items.map(item => {
    if (item.cellIndex === a) return { ...item, cellIndex: b };
    if (item.cellIndex === b) return { ...item, cellIndex: a };
    return item;
  });
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  // Initial data
  notebooks: [],
  currentNotebook: null,
  highlights: [],
  annotations: [],
  quizzes: [],
  currentQuiz: null,

  // Initial UI state
  viewMode: 'library',
  isLoading: false,
  error: null,
  sidebarOpen: true,
  highlightColor: 'yellow',
  showHighlightToolbar: false,

  // Actions
  setNotebooks: (notebooks) => set({ notebooks }),
  setCurrentNotebook: (notebook) => set({ currentNotebook: notebook }),
  setHighlights: (highlights) => set({ highlights }),
  addHighlight: (highlight) => set((state) => ({
    highlights: [...state.highlights, highlight]
  })),
  updateHighlight: (id, updates) => set((state) => ({
    highlights: state.highlights.map((h) =>
      h.id === id ? { ...h, ...updates } : h
    )
  })),
  deleteHighlight: (id) => set((state) => ({
    highlights: state.highlights.filter((h) => h.id !== id)
  })),
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, annotation]
  })),
  updateAnnotation: (id, updates) => set((state) => ({
    annotations: state.annotations.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    )
  })),
  deleteAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter((a) => a.id !== id)
  })),
  setQuizzes: (quizzes) => set({ quizzes }),
  setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setShowHighlightToolbar: (show) => set({ showHighlightToolbar: show }),

  // Cell editing actions
  updateCellSource: (cellIndex, newSource) => set((state) => {
    if (!state.currentNotebook) return {};
    const newFileContent = updateFileContent(state.currentNotebook, (cells) => {
      const updated = [...cells];
      updated[cellIndex] = { ...updated[cellIndex], source: newSource.split('\n').map((line, i, arr) => i < arr.length - 1 ? line + '\n' : line) };
      return updated;
    });
    return {
      currentNotebook: { ...state.currentNotebook, fileContent: newFileContent },
    };
  }),

  moveCellUp: (cellIndex) => set((state) => {
    if (!state.currentNotebook || cellIndex <= 0) return {};
    const newFileContent = updateFileContent(state.currentNotebook, (cells) => {
      const updated = [...cells];
      [updated[cellIndex - 1], updated[cellIndex]] = [updated[cellIndex], updated[cellIndex - 1]];
      return updated;
    });
    return {
      currentNotebook: { ...state.currentNotebook, fileContent: newFileContent },
      highlights: swapCellIndexes(state.highlights, cellIndex, cellIndex - 1),
      annotations: swapCellIndexes(state.annotations, cellIndex, cellIndex - 1),
    };
  }),

  moveCellDown: (cellIndex) => set((state) => {
    if (!state.currentNotebook) return {};
    const parsed = JSON.parse(state.currentNotebook.fileContent);
    if (cellIndex >= parsed.cells.length - 1) return {};
    const newFileContent = updateFileContent(state.currentNotebook, (cells) => {
      const updated = [...cells];
      [updated[cellIndex], updated[cellIndex + 1]] = [updated[cellIndex + 1], updated[cellIndex]];
      return updated;
    });
    return {
      currentNotebook: { ...state.currentNotebook, fileContent: newFileContent },
      highlights: swapCellIndexes(state.highlights, cellIndex, cellIndex + 1),
      annotations: swapCellIndexes(state.annotations, cellIndex, cellIndex + 1),
    };
  }),

  saveNotebook: async () => {
    const { currentNotebook } = get();
    if (!currentNotebook) return;
    try {
      await fetch(`/api/notebooks/${currentNotebook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: currentNotebook.fileContent }),
      });
    } catch (error) {
      console.error('Failed to save notebook:', error);
    }
  },
}));
