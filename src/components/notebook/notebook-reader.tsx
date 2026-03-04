'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import { parseNotebook, getCellSourceText, detectLanguage, getOutputText } from '@/lib/notebook-parser';
import { MarkdownRenderer } from './markdown-renderer';
import { OutputRenderer } from './output-renderer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Code,
  FileText,
  HighlighterIcon,
  MessageSquarePlus,
  HelpCircle,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Play,
  Pencil,
  MoveUp,
  MoveDown
} from 'lucide-react';
import type { NotebookCell, Highlight as HighlightType, HighlightColor } from '@/types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; border: string; label: string }> = {
  yellow: { bg: 'bg-yellow-200 dark:bg-yellow-500/30', border: 'border-yellow-400', label: 'Jaune' },
  green: { bg: 'bg-green-200 dark:bg-green-500/30', border: 'border-green-400', label: 'Vert' },
  pink: { bg: 'bg-pink-200 dark:bg-pink-500/30', border: 'border-pink-400', label: 'Rose' },
  blue: { bg: 'bg-blue-200 dark:bg-blue-500/30', border: 'border-blue-400', label: 'Bleu' },
  orange: { bg: 'bg-orange-200 dark:bg-orange-500/30', border: 'border-orange-400', label: 'Orange' },
};

export function NotebookReader() {
  const {
    currentNotebook,
    setCurrentNotebook,
    highlights,
    addHighlight,
    deleteHighlight,
    annotations,
    addAnnotation,
    deleteAnnotation,
    quizzes,
    setViewMode,
    setCurrentQuiz,
    highlightColor,
    setHighlightColor,
    updateCellSource,
    moveCellUp,
    moveCellDown,
    saveNotebook
  } = useNotebookStore();

  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [language, setLanguage] = useState('python');
  const [selectedText, setSelectedText] = useState<{ text: string; cellIndex: number; start: number; end: number } | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPos, setHighlightMenuPos] = useState({ x: 0, y: 0 });
  const [activeAnnotationCell, setActiveAnnotationCell] = useState<number | null>(null);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());
  const [copiedCell, setCopiedCell] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  
  // Detect dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  // Parse notebook content
  useEffect(() => {
    if (currentNotebook) {
      const parsed = parseNotebook(currentNotebook.fileContent);
      if (parsed) {
        setCells(parsed.cells);
        setLanguage(detectLanguage(parsed));
      }
    }
  }, [currentNotebook]);
  
  // Handle text selection for highlighting
  const handleMouseUp = useCallback((e: React.MouseEvent, cellIndex: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowHighlightMenu(false);
      setSelectedText(null);
      return;
    }
    
    const text = selection.toString().trim();
    if (!text) {
      setShowHighlightMenu(false);
      setSelectedText(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get the cell content element
    const cellElement = (e.target as HTMLElement).closest('[data-cell-content]');
    if (cellElement) {
      const cellText = cellElement.textContent || '';
      const start = cellText.indexOf(text);
      const end = start + text.length;
      
      if (start >= 0) {
        setSelectedText({ text, cellIndex, start, end });
        setHighlightMenuPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
        setShowHighlightMenu(true);
      }
    }
  }, []);
  
  // Create highlight
  const handleCreateHighlight = async () => {
    if (!selectedText || !currentNotebook) return;
    
    try {
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId: currentNotebook.id,
          cellIndex: selectedText.cellIndex,
          startOffset: selectedText.start,
          endOffset: selectedText.end,
          color: highlightColor,
        }),
      });
      
      if (response.ok) {
        const highlight = await response.json();
        addHighlight(highlight);
      }
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
    
    setShowHighlightMenu(false);
    setSelectedText(null);
    window.getSelection()?.removeAllRanges();
  };
  
  // Create annotation
  const handleCreateAnnotation = async (cellIndex: number) => {
    if (!newAnnotation.trim() || !currentNotebook) return;
    
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId: currentNotebook.id,
          cellIndex,
          content: newAnnotation,
        }),
      });
      
      if (response.ok) {
        const annotation = await response.json();
        addAnnotation(annotation);
        setNewAnnotation('');
        setActiveAnnotationCell(null);
      }
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };
  
  // Generate quiz with AI
  const handleGenerateQuiz = async () => {
    if (!currentNotebook || generatingQuiz) return;
    
    setGeneratingQuiz(true);
    
    try {
      const response = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId: currentNotebook.id,
          questionCount: 5,
          difficulty: 'medium',
        }),
      });
      
      if (response.ok) {
        const { questions } = await response.json();
        
        const quizResponse = await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notebookId: currentNotebook.id,
            title: `Quiz: ${currentNotebook.title}`,
            questions,
          }),
        });
        
        if (quizResponse.ok) {
          const quiz = await quizResponse.json();
          setCurrentQuiz(quiz);
          setViewMode('quiz');
        }
      }
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    } finally {
      setGeneratingQuiz(false);
    }
  };
  
  // Get highlights for a cell
  const getCellHighlights = (cellIndex: number): HighlightType[] => {
    return highlights.filter(h => h.cellIndex === cellIndex);
  };
  
  // Get annotations for a cell
  const getCellAnnotations = (cellIndex: number) => {
    return annotations.filter(a => a.cellIndex === cellIndex);
  };
  
  // Apply highlights to text
  const applyHighlights = (text: string, cellIndex: number): React.ReactNode => {
    const cellHighlights = getCellHighlights(cellIndex);
    if (cellHighlights.length === 0) return text;
    
    const sorted = [...cellHighlights].sort((a, b) => a.startOffset - b.startOffset);
    
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    
    sorted.forEach((highlight) => {
      if (highlight.startOffset > lastEnd) {
        parts.push(text.slice(lastEnd, highlight.startOffset));
      }
      
      const colorStyle = HIGHLIGHT_COLORS[highlight.color as HighlightColor] || HIGHLIGHT_COLORS.yellow;
      parts.push(
        <mark
          key={highlight.id}
          className={`${colorStyle.bg} ${colorStyle.border} border-l-2 px-0.5 relative group cursor-pointer rounded-sm`}
          title={highlight.note || 'Surlignage'}
        >
          {text.slice(highlight.startOffset, highlight.endOffset)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteHighlight(highlight.id);
            }}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </mark>
      );
      
      lastEnd = highlight.endOffset;
    });
    
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }
    
    return parts;
  };
  
  // Delete highlight
  const handleDeleteHighlight = async (id: string) => {
    try {
      await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
      deleteHighlight(id);
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };
  
  // Delete annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
      deleteAnnotation(id);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };
  
  // Toggle cell collapse
  const toggleCellCollapse = (index: number) => {
    setCollapsedCells(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  
  // Copy cell code
  const copyCellCode = async (index: number, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCell(index);
    setTimeout(() => setCopiedCell(null), 2000);
  };
  
  if (!currentNotebook) return null;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              setCurrentNotebook(null);
              setViewMode('library');
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-[300px] md:max-w-lg">
                {currentNotebook.title}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">{currentNotebook.fileName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{cells.length} cellules</Badge>
            <Badge variant="outline">{language}</Badge>
            <Button 
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz}
              className="hidden sm:flex"
            >
              {generatingQuiz ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <HelpCircle className="h-4 w-4 mr-2" />
              )}
              Quiz IA
            </Button>
          </div>
        </div>
      </header>
      
      {/* Highlight color selector (floating) */}
      {showHighlightMenu && selectedText && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-2 flex items-center gap-2"
          style={{ 
            left: highlightMenuPos.x,
            top: highlightMenuPos.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {Object.entries(HIGHLIGHT_COLORS).map(([color, style]) => (
            <button
              key={color}
              onClick={() => {
                setHighlightColor(color as HighlightColor);
                handleCreateHighlight();
              }}
              className={`w-6 h-6 rounded-full ${style.bg} border-2 ${
                highlightColor === color ? style.border : 'border-transparent'
              } hover:scale-110 transition-transform`}
              title={style.label}
            />
          ))}
          <Button size="sm" onClick={handleCreateHighlight} className="ml-2">
            Surligner
          </Button>
        </div>
      )}
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
          {cells.map((cell, index) => {
            const isCollapsed = collapsedCells.has(index);
            const cellHighlights = getCellHighlights(index);
            const cellAnnotations = getCellAnnotations(index);
            
            return (
              <div key={index} className="relative group">
                {/* Cell header */}
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium
                    ${cell.cell_type === 'code' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}
                  `}>
                    {cell.cell_type === 'code' ? (
                      <Code className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      [{index + 1}]
                    </span>
                    {cell.cell_type === 'code' && cell.execution_count !== null && (
                      <Badge variant="outline" className="text-xs font-mono">
                        In [{cell.execution_count}]
                      </Badge>
                    )}
                    {cellHighlights.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <HighlighterIcon className="h-3 w-3 mr-1" />
                        {cellHighlights.length}
                      </Badge>
                    )}
                    {cellAnnotations.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <MessageSquarePlus className="h-3 w-3 mr-1" />
                        {cellAnnotations.length}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Cell actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { moveCellUp(index); saveNotebook(); }}
                      className="h-7"
                      disabled={index === 0}
                      title="Monter"
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { moveCellDown(index); saveNotebook(); }}
                      className="h-7"
                      disabled={index === cells.length - 1}
                      title="Descendre"
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCell(index);
                        setEditingContent(getCellSourceText(cell));
                      }}
                      className="h-7"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {cell.cell_type === 'code' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCellCode(index, getCellSourceText(cell))}
                        className="h-7"
                      >
                        {copiedCell === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCellCollapse(index)}
                      className="h-7"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveAnnotationCell(index)}
                      className="h-7"
                      title="Ajouter une note"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Cell content */}
                {!isCollapsed && (
                  <>
                    {editingCell === index ? (
                      <div className="rounded-xl overflow-hidden border border-primary/50 bg-card">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="font-mono text-sm min-h-[120px] border-0 rounded-none focus-visible:ring-0 resize-y bg-background"
                          rows={Math.max(5, editingContent.split('\n').length + 2)}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 p-2 border-t border-border bg-muted/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCell(null)}
                          >
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              updateCellSource(index, editingContent);
                              saveNotebook();
                              setEditingCell(null);
                            }}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Sauvegarder
                          </Button>
                        </div>
                      </div>
                    ) : (
                    <div
                      data-cell-content
                      className={`
                        rounded-xl overflow-hidden
                        ${cell.cell_type === 'code'
                          ? ''
                          : 'bg-card border border-border'}
                      `}
                      onMouseUp={(e) => handleMouseUp(e, index)}
                    >
                      {cell.cell_type === 'code' ? (
                        <div className="relative">
                          <SyntaxHighlighter
                            language={language === 'python' ? 'python' : language}
                            style={oneDark}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              borderRadius: '0.75rem',
                              fontSize: '0.875rem',
                              lineHeight: '1.6',
                            }}
                            showLineNumbers
                            lineNumberStyle={{
                              minWidth: '2.5em',
                              paddingRight: '1em',
                              color: '#6e7681',
                            }}
                          >
                            {getCellSourceText(cell)}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <div className="p-6">
                          <MarkdownRenderer content={getCellSourceText(cell)} />
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Code outputs */}
                    {cell.cell_type === 'code' && cell.outputs && cell.outputs.length > 0 && (
                      <div className="mt-3 border border-border rounded-xl overflow-hidden bg-muted/30">
                        <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                          <Play className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Sortie</span>
                        </div>
                        <div className="p-4">
                          {cell.outputs.map((output, outputIndex) => (
                            <OutputRenderer key={outputIndex} output={output} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Annotations */}
                {cellAnnotations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cellAnnotations.map(annotation => (
                      <div
                        key={annotation.id}
                        className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm"
                      >
                        <MessageSquarePlus className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="leading-relaxed">{annotation.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(annotation.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-6 w-6 hover:bg-amber-200 dark:hover:bg-amber-800"
                          onClick={() => handleDeleteAnnotation(annotation.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add annotation form */}
                {activeAnnotationCell === index && (
                  <div className="mt-3 p-4 bg-accent/50 rounded-xl border border-border">
                    <Textarea
                      value={newAnnotation}
                      onChange={(e) => setNewAnnotation(e.target.value)}
                      placeholder="Écrivez votre note..."
                      rows={3}
                      className="mb-3 bg-background"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveAnnotationCell(null);
                          setNewAnnotation('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button size="sm" onClick={() => handleCreateAnnotation(index)}>
                        <Save className="h-4 w-4 mr-1" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Stats bar */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HighlighterIcon className="h-4 w-4" />
              {highlights.length} surlignages
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4" />
              {annotations.length} notes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {quizzes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (quizzes.length > 0) {
                    setCurrentQuiz(quizzes[0]);
                    setViewMode('quiz');
                  }
                }}
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Quiz ({quizzes.length})
              </Button>
            )}
            <Button
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz}
              size="sm"
              className="sm:hidden"
            >
              {generatingQuiz ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HelpCircle className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
