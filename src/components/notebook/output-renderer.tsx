'use client';

import type { NotebookOutput } from '@/types';
import { MarkdownRenderer } from './markdown-renderer';

interface OutputRendererProps {
  output: NotebookOutput;
}

// ANSI color code to CSS class mapping
const ANSI_COLORS: Record<string, string> = {
  '30': 'text-gray-800',
  '31': 'text-red-500',
  '32': 'text-green-500',
  '33': 'text-yellow-600',
  '34': 'text-blue-500',
  '35': 'text-purple-500',
  '36': 'text-cyan-500',
  '37': 'text-gray-100',
  '90': 'text-gray-500',
  '91': 'text-red-400',
  '92': 'text-green-400',
  '93': 'text-yellow-500',
  '94': 'text-blue-400',
  '95': 'text-purple-400',
  '96': 'text-cyan-400',
  '97': 'text-white',
  '1': 'font-bold',
  '4': 'underline',
  '0': '', // reset
};

// Convert ANSI escape codes to HTML spans with classes
function ansiToHtml(text: string): string {
  // Remove ANSI escape sequences and replace with HTML
  const ansiRegex = /\x1b\[([0-9;]+)m/g;
  
  let result = '';
  let lastIndex = 0;
  let currentClasses: string[] = [];
  
  let match;
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textPart = text.slice(lastIndex, match.index);
      if (textPart) {
        if (currentClasses.length > 0) {
          result += `<span class="${currentClasses.join(' ')}">${escapeHtml(textPart)}</span>`;
        } else {
          result += escapeHtml(textPart);
        }
      }
    }
    
    // Process the ANSI codes
    const codes = match[1].split(';');
    for (const code of codes) {
      if (code === '0') {
        currentClasses = [];
      } else if (ANSI_COLORS[code]) {
        if (!currentClasses.includes(ANSI_COLORS[code])) {
          currentClasses.push(ANSI_COLORS[code]);
        }
      }
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const textPart = text.slice(lastIndex);
    if (currentClasses.length > 0) {
      result += `<span class="${currentClasses.join(' ')}">${escapeHtml(textPart)}</span>`;
    } else {
      result += escapeHtml(textPart);
    }
  }
  
  return result || escapeHtml(text);
}

// Escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip ANSI codes completely (for plain text display)
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export function OutputRenderer({ output }: OutputRendererProps) {
  // Handle stream outputs (stdout, stderr)
  if (output.output_type === 'stream' && output.text) {
    const text = output.text.join('');
    if (!text.trim()) return null;
    
    // Check if there are ANSI codes
    const hasAnsi = text.includes('\x1b[');
    
    if (hasAnsi) {
      // Convert ANSI to HTML with colors
      const htmlContent = ansiToHtml(text);
      return (
        <div className="py-1">
          <pre 
            className="font-mono text-sm whitespace-pre-wrap break-words bg-transparent"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      );
    }
    
    return (
      <div className="py-1">
        <pre className="font-mono text-sm whitespace-pre-wrap break-words bg-transparent">
          {text}
        </pre>
      </div>
    );
  }
  
  // Handle error outputs
  if (output.output_type === 'error') {
    const errorName = (output as unknown as Record<string, unknown>).ename as string || 'Error';
    const errorValue = (output as unknown as Record<string, unknown>).evalue as string || '';
    const traceback = (output as unknown as Record<string, unknown>).traceback as string[] || [];
    
    // Process traceback to convert ANSI codes
    const processedTraceback = traceback.map(line => ansiToHtml(line)).join('\n');
    
    return (
      <div className="py-1">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="font-semibold text-red-500">{errorName}: {errorValue}</p>
          {traceback.length > 0 && (
            <pre 
              className="mt-2 text-xs font-mono text-red-400/80 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: processedTraceback }}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Handle execute_result and display_data
  
  // Image outputs (matplotlib, plotly static, etc.)
  if (output.data?.['image/png']) {
    const imageData = Array.isArray(output.data['image/png']) 
      ? output.data['image/png'].join('') 
      : output.data['image/png'];
    return (
      <div className="py-2 flex justify-center">
        <img
          src={`data:image/png;base64,${imageData}`}
          alt="Output"
          className="max-w-full h-auto rounded shadow-md"
          style={{ maxHeight: '500px' }}
        />
      </div>
    );
  }
  
  if (output.data?.['image/jpeg']) {
    const imageData = Array.isArray(output.data['image/jpeg']) 
      ? output.data['image/jpeg'].join('') 
      : output.data['image/jpeg'];
    return (
      <div className="py-2 flex justify-center">
        <img
          src={`data:image/jpeg;base64,${imageData}`}
          alt="Output"
          className="max-w-full h-auto rounded shadow-md"
          style={{ maxHeight: '500px' }}
        />
      </div>
    );
  }
  
  if (output.data?.['image/svg+xml']) {
    const svgContent = Array.isArray(output.data['image/svg+xml']) 
      ? output.data['image/svg+xml'].join('') 
      : output.data['image/svg+xml'];
    return (
      <div 
        className="py-2 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }
  
  // HTML output (pandas dataframes, etc.)
  if (output.data?.['text/html']) {
    const htmlContent = Array.isArray(output.data['text/html']) 
      ? output.data['text/html'].join('') 
      : output.data['text/html'];
    
    return (
      <div 
        className="py-1 output-html [&_.dataframe]:w-full [&_.dataframe]:border-collapse [&_.dataframe]:text-sm [&_table]:w-full [&_table]:border-collapse [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-border"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
      />
    );
  }
  
  // LaTeX output
  if (output.data?.['text/latex']) {
    const latexContent = Array.isArray(output.data['text/latex']) 
      ? output.data['text/latex'].join('') 
      : output.data['text/latex'];
    
    const processedLatex = preprocessLatexOutput(latexContent);
    
    return (
      <div className="py-2 overflow-x-auto">
        <MarkdownRenderer content={processedLatex} />
      </div>
    );
  }
  
  // Markdown output
  if (output.data?.['text/markdown']) {
    const markdownContent = Array.isArray(output.data['text/markdown']) 
      ? output.data['text/markdown'].join('') 
      : output.data['text/markdown'];
    return (
      <div className="py-1">
        <MarkdownRenderer content={markdownContent} />
      </div>
    );
  }
  
  // JSON output
  if (output.data?.['application/json']) {
    return (
      <div className="py-1">
        <pre className="font-mono text-sm bg-muted/30 rounded p-3 overflow-x-auto">
          {JSON.stringify(output.data['application/json'], null, 2)}
        </pre>
      </div>
    );
  }
  
  // JavaScript output (plotly, etc.)
  if (output.data?.['application/javascript']) {
    return (
      <div className="py-1 text-muted-foreground text-sm italic">
        [JavaScript output - non exécutable en mode lecture]
      </div>
    );
  }
  
  // Plain text output (fallback)
  const textData = output.data?.['text/plain'];
  const textContent = textData 
    ? (Array.isArray(textData) ? textData.join('') : textData)
    : (output.text ? output.text.join('') : '');
  
  if (!textContent) return null;
  
  // Check if there are ANSI codes
  const hasAnsi = textContent.includes('\x1b[');
  
  if (hasAnsi) {
    const htmlContent = ansiToHtml(textContent);
    return (
      <div className="py-1">
        <pre 
          className="font-mono text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    );
  }
  
  // Check if it looks like LaTeX
  if (textContent.includes('\\begin{') || textContent.includes('\\frac') || textContent.includes('\\nabla')) {
    const processedLatex = preprocessLatexOutput(textContent);
    return (
      <div className="py-1 overflow-x-auto">
        <MarkdownRenderer content={processedLatex} />
      </div>
    );
  }
  
  // Check if it looks like a table (simple heuristic for pandas text output)
  const lines = textContent.split('\n').filter(l => l.trim());
  const isTableLike = lines.length > 2 && 
    lines.some(line => line.includes('│') || line.includes('┼') || line.includes('---'));
  
  if (isTableLike) {
    return (
      <div className="py-1 overflow-x-auto">
        <pre className="font-mono text-sm whitespace-pre">
          {textContent}
        </pre>
      </div>
    );
  }
  
  // Default: plain text
  return (
    <div className="py-1">
      <pre className="font-mono text-sm whitespace-pre-wrap break-words">
        {textContent}
      </pre>
    </div>
  );
}

// Preprocess LaTeX from outputs
function preprocessLatexOutput(latex: string): string {
  let processed = latex;
  
  // Remove outer \[ \] display math delimiters
  processed = processed.replace(/^\\\[\s*/, '');
  processed = processed.replace(/\\\]$/, '');
  
  // Remove outer $$ delimiters if present
  processed = processed.replace(/^\$\$\s*/, '');
  processed = processed.replace(/\$\$$/, '');
  
  // Remove outer $ delimiters if present (for inline that should be display)
  if (processed.startsWith('$') && processed.endsWith('$') && !processed.startsWith('$$')) {
    processed = processed.slice(1, -1);
  }
  
  // If contains environment like align, equation, etc., wrap in $$
  const hasDisplayEnv = /\\begin\{(align\*?|equation\*?|gather\*?|eqnarray\*?|multline\*?|array\*?|pmatrix|bmatrix|vmatrix|Vmatrix|cases|split|aligned|gathered)\}/.test(processed);
  
  if (hasDisplayEnv) {
    // Already has environment, just wrap in $$
    return `$$${processed}$$`;
  }
  
  // Default: wrap in display math
  return `$$${processed}$$`;
}

// Simple HTML sanitizer to prevent XSS
function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/\s*on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/\s*on\w+=\S+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (except for images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, 'blocked:');
  
  return sanitized;
}
