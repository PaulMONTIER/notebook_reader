'use client';

import { useState, useEffect } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileCode, 
  Trash2, 
  HighlighterIcon,
  MessageSquare,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import type { Notebook } from '@/types';

interface SidebarProps {
  onUploadClick: () => void;
}

export function Sidebar({ onUploadClick }: SidebarProps) {
  const { 
    notebooks, 
    setNotebooks, 
    currentNotebook, 
    setCurrentNotebook,
    setHighlights,
    setAnnotations,
    setQuizzes,
    setViewMode,
    sidebarOpen,
    toggleSidebar
  } = useNotebookStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Fetch notebooks on mount
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
  
  // Filter notebooks by search query
  const filteredNotebooks = notebooks.filter((nb: Notebook & { _count?: { highlights: number; annotations: number; quizzes: number } }) => 
    nb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nb.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle notebook selection
  const handleSelectNotebook = async (notebookId: string) => {
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
  
  // Handle notebook deletion
  const handleDeleteNotebook = async (e: React.MouseEvent, notebookId: string) => {
    e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce notebook ?')) return;
    
    try {
      const response = await fetch(`/api/notebooks/${notebookId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotebooks(notebooks.filter((nb: Notebook) => nb.id !== notebookId));
        if (currentNotebook?.id === notebookId) {
          setCurrentNotebook(null);
          setViewMode('library');
        }
      }
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };
  
  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      
      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-72 bg-card border-r border-border
        flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Notebook Reader</h1>
          </div>
          
          {/* Upload button */}
          <Button 
            onClick={onUploadClick}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un Notebook
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Notebook list */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredNotebooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun notebook trouvé</p>
                <p className="text-sm mt-1">Importez un fichier .ipynb pour commencer</p>
              </div>
            ) : (
              filteredNotebooks.map((notebook: Notebook & { _count?: { highlights: number; annotations: number; quizzes: number } }) => (
                <div
                  key={notebook.id}
                  onClick={() => handleSelectNotebook(notebook.id)}
                  className={`
                    group p-3 rounded-lg cursor-pointer mb-1
                    hover:bg-accent transition-colors
                    ${currentNotebook?.id === notebook.id ? 'bg-accent' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{notebook.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{notebook.fileName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => handleDeleteNotebook(e, notebook.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  
                  {/* Stats */}
                  {notebook._count && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HighlighterIcon className="h-3 w-3" />
                        {notebook._count.highlights || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {notebook._count.annotations || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {notebook._count.quizzes || 0}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
