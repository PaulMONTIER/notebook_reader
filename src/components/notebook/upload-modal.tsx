'use client';

import { useState, useRef } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileCode, X } from 'lucide-react';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const { setNotebooks, notebooks } = useNotebookStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.name.endsWith('.ipynb')) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.ipynb', ''));
      }
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name.replace('.ipynb', ''));
      formData.append('description', description);
      
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const newNotebook = await response.json();
        setNotebooks([newNotebook, ...notebooks]);
        handleClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };
  
  const handleClose = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un Notebook</DialogTitle>
          <DialogDescription>
            Importez un fichier Jupyter Notebook (.ipynb) pour le lire et l'annoter.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File drop zone */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6
              transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
              ${file ? 'border-green-500 bg-green-500/5' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ipynb"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            
            <div className="flex flex-col items-center justify-center text-center">
              {file ? (
                <>
                  <FileCode className="h-12 w-12 text-green-500 mb-2" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} Ko
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="font-medium">Glissez-déposez votre fichier ici</p>
                  <p className="text-sm text-muted-foreground">
                    ou cliquez pour sélectionner
                  </p>
                </>
              )}
            </div>
            
            {file && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Title input */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du notebook"
            />
          </div>
          
          {/* Description input */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description ou notes..."
              rows={3}
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importation...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
