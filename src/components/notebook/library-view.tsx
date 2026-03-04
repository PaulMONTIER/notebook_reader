'use client';

import { useState, useEffect } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileCode, 
  Plus, 
  BookOpen,
  HighlighterIcon,
  MessageSquare,
  HelpCircle,
  Clock
} from 'lucide-react';
import type { Notebook } from '@/types';

interface NotebookWithCount extends Notebook {
  _count?: {
    highlights: number;
    annotations: number;
    quizzes: number;
  };
}

export function LibraryView({ onUploadClick }: { onUploadClick: () => void }) {
  const { notebooks, setNotebooks, setCurrentNotebook, setHighlights, setAnnotations, setQuizzes, setViewMode } = useNotebookStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchNotebooks() {
      try {
        const response = await fetch('/api/notebooks');
        if (response.ok) {
          const data = await response.json();
          setNotebooks(data);
        }
      } catch (error) {
        console.error('Failed to fetch notebooks:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotebooks();
  }, [setNotebooks]);
  
  const handleOpenNotebook = async (notebookId: string) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentNotebook(data);
        setHighlights(data.highlights || []);
        setAnnotations(data.annotations || []);
        setQuizzes(data.quizzes || []);
        setViewMode('reader');
      }
    } catch (error) {
      console.error('Failed to fetch notebook:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero section */}
      <div className="bg-gradient-to-b from-accent/50 to-background py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Jupyter Notebook Reader
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Importez vos notebooks Jupyter, surlignez les passages importants, 
            prenez des notes et testez vos connaissances avec des quiz générés automatiquement.
          </p>
          <Button size="lg" onClick={onUploadClick}>
            <Plus className="h-5 w-5 mr-2" />
            Importer un Notebook
          </Button>
        </div>
      </div>
      
      {/* Notebooks grid */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Vos Notebooks
            {notebooks.length > 0 && (
              <Badge variant="secondary">{notebooks.length}</Badge>
            )}
          </h2>
          
          {notebooks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Aucun notebook</h3>
                <p className="text-muted-foreground mb-4">
                  Importez votre premier notebook Jupyter pour commencer.
                </p>
                <Button onClick={onUploadClick}>
                  <Plus className="h-4 w-4 mr-2" />
                  Importer un Notebook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notebooks.map((notebook: NotebookWithCount) => (
                <Card 
                  key={notebook.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => handleOpenNotebook(notebook.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <FileCode className="h-8 w-8 text-primary shrink-0" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                    <CardTitle className="line-clamp-1 mt-2">{notebook.title}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {notebook.fileName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {notebook.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {notebook.description}
                      </p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <HighlighterIcon className="h-4 w-4" />
                        {notebook._count?.highlights || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {notebook._count?.annotations || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        {notebook._count?.quizzes || 0}
                      </span>
                    </div>
                    
                    {/* Date */}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      Modifié {formatDate(notebook.updatedAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
