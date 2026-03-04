'use client';

import { useState } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import { Sidebar } from '@/components/notebook/sidebar';
import { UploadModal } from '@/components/notebook/upload-modal';
import { NotebookReader } from '@/components/notebook/notebook-reader';
import { QuizView } from '@/components/notebook/quiz-view';
import { LibraryView } from '@/components/notebook/library-view';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const { viewMode, sidebarOpen } = useNotebookStore();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <Sidebar onUploadClick={() => setUploadModalOpen(true)} />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Theme toggle */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        
        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'library' && (
            <LibraryView onUploadClick={() => setUploadModalOpen(true)} />
          )}
          {viewMode === 'reader' && <NotebookReader />}
          {viewMode === 'quiz' && <QuizView />}
        </div>
        
        {/* Footer */}
        <footer className="bg-card border-t border-border py-4 px-6 text-center text-sm text-muted-foreground">
          <p>
            📓 Jupyter Notebook Reader - Surlignez, annotez et testez vos connaissances
          </p>
        </footer>
      </main>
      
      {/* Upload modal */}
      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
    </div>
  );
}
