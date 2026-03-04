import type { NotebookContent, NotebookCell, NotebookOutput } from '@/types';

/**
 * Parse a Jupyter notebook file content (.ipynb)
 */
export function parseNotebook(fileContent: string): NotebookContent | null {
  try {
    const content = JSON.parse(fileContent);
    
    // Validate basic structure
    if (!content.cells || !Array.isArray(content.cells)) {
      throw new Error('Invalid notebook format: missing cells array');
    }
    
    // Normalize cells
    const cells: NotebookCell[] = content.cells.map((cell: Record<string, unknown>) => ({
      cell_type: cell.cell_type as 'markdown' | 'code' | 'raw',
      source: normalizeSource(cell.source),
      metadata: cell.metadata as Record<string, unknown> | undefined,
      execution_count: cell.execution_count as number | null | undefined,
      outputs: normalizeOutputs(cell.outputs as Record<string, unknown>[] | undefined),
    }));
    
    return {
      nbformat: content.nbformat || 4,
      nbformat_minor: content.nbformat_minor || 0,
      cells,
      metadata: content.metadata as NotebookContent['metadata'],
    };
  } catch (error) {
    console.error('Failed to parse notebook:', error);
    return null;
  }
}

/**
 * Normalize source content (can be string or array)
 */
function normalizeSource(source: unknown): string[] {
  if (typeof source === 'string') {
    return source.split('\n').map((line, i, arr) => 
      i < arr.length - 1 ? line + '\n' : line
    );
  }
  if (Array.isArray(source)) {
    return source.map(line => String(line));
  }
  return [];
}

/**
 * Normalize outputs for code cells
 */
function normalizeOutputs(outputs: Record<string, unknown>[] | undefined): NotebookOutput[] {
  if (!outputs || !Array.isArray(outputs)) {
    return [];
  }
  
  return outputs.map((output) => ({
    output_type: String(output.output_type || ''),
    data: output.data as Record<string, string[]> | undefined,
    text: Array.isArray(output.text) 
      ? output.text.map(String) 
      : typeof output.text === 'string' 
        ? [output.text] 
        : undefined,
    execution_count: output.execution_count as number | undefined,
  }));
}

/**
 * Get the text content from a cell's source
 */
export function getCellSourceText(cell: NotebookCell): string {
  return cell.source.join('');
}

/**
 * Detect the programming language from notebook metadata
 */
export function detectLanguage(notebook: NotebookContent): string {
  return notebook.metadata?.language_info?.name || 
         notebook.metadata?.kernelspec?.language || 
         'python';
}

/**
 * Get cell display number (for code cells)
 */
export function getCellNumber(cell: NotebookCell, cells: NotebookCell[]): number {
  if (cell.cell_type !== 'code') return -1;
  
  let count = 0;
  for (const c of cells) {
    if (c === cell) return count;
    if (c.cell_type === 'code') count++;
  }
  return count;
}

/**
 * Extract text from outputs
 */
export function getOutputText(output: NotebookOutput): string {
  if (output.data?.['text/plain']) {
    return output.data['text/plain'].join('');
  }
  if (output.text) {
    return output.text.join('');
  }
  return '';
}

/**
 * Check if output is an image
 */
export function isImageOutput(output: NotebookOutput): boolean {
  return !!(output.data?.['image/png'] || output.data?.['image/jpeg'] || output.data?.['image/svg+xml']);
}

/**
 * Get image data from output
 */
export function getImageData(output: NotebookOutput): { data: string; type: string } | null {
  if (output.data?.['image/png']) {
    return { data: output.data['image/png'].join(''), type: 'png' };
  }
  if (output.data?.['image/jpeg']) {
    return { data: output.data['image/jpeg'].join(''), type: 'jpeg' };
  }
  if (output.data?.['image/svg+xml']) {
    return { data: output.data['image/svg+xml'].join(''), type: 'svg+xml' };
  }
  return null;
}
