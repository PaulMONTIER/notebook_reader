'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Check if content has LaTeX that might cause issues
function hasProblematicLatex(content: string): boolean {
  // Check for common problematic patterns
  const problematicPatterns = [
    /\\begin\{align\*?\}[^]*?\\end\{align\*?\}/,
    /\\begin\{gather\*?\}[^]*?\\end\{gather\*?\}/,
    /\\begin\{eqnarray\*?\}[^]*?\\end\{eqnarray\*?\}/,
    /&=.*\\\\/,  // alignment characters in equations
    /\\\$[^$]+\$/,  // escaped dollar signs
  ];
  
  return problematicPatterns.some(pattern => pattern.test(content));
}

// Preprocess LaTeX content to fix common issues
function preprocessLatex(content: string): string {
  let processed = content;
  
  // Fix align environment with alignment characters (&)
  // Convert & to proper alignment
  processed = processed.replace(
    /\$\$\\begin\{(align\*?)\}([\s\S]*?)\\end\{\1\}\$\$/g,
    (match, env, inner) => {
      return `$$\\begin{aligned}${inner}\\end{aligned}$$`;
    }
  );
  
  // Fix single $ align environments
  processed = processed.replace(
    /\$\\begin\{(align\*?)\}([\s\S]*?)\\end\{\1\}\$/g,
    (match, env, inner) => {
      return `$$\\begin{aligned}${inner}\\end{aligned}$$`;
    }
  );
  
  // Fix gather environment
  processed = processed.replace(
    /\$\$\\begin\{(gather\*?)\}([\s\S]*?)\\end\{\1\}\$\$/g,
    (match, env, inner) => {
      return `$$\\begin{gathered}${inner}\\end{gathered}$$`;
    }
  );
  
  // Fix matrix environments without proper display mode
  processed = processed.replace(
    /\$\\begin\{(pmatrix|bmatrix|vmatrix|Vmatrix|cases)\}([\s\S]*?)\\end\{\1\}\$/g,
    (match, env, inner) => {
      return `$$\\begin{${env}}${inner}\\end{${env}}$$`;
    }
  );
  
  // Fix double backslashes in equations (line breaks)
  // KaTeX sometimes has issues with \\ at the end of lines
  processed = processed.replace(/\\\\\s*\n/g, '\\\\\n');
  
  // Fix \left and \right that might be unbalanced
  // This is a common issue in copied LaTeX
  
  return processed;
}

// Custom component to render math with error handling
function MathBlock({ math, display }: { math: string; display: boolean }) {
  // For now, let KaTeX handle it but wrap in error boundary
  return display ? (
    <div className="my-4 overflow-x-auto">
      <span dangerouslySetInnerHTML={{ 
        __html: `<span class="katex-display">${math}</span>` 
      }} />
    </div>
  ) : (
    <span dangerouslySetInnerHTML={{ 
      __html: `<span class="katex">${math}</span>` 
    }} />
  );
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const processedContent = useMemo(() => preprocessLatex(content), [content]);
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          [rehypeKatex, { 
            strict: false,
            trust: true,
            displayMode: false,
            throwOnError: false,
            output: 'html',
            errorColor: '#cc0000',
            macros: {
              "\\R": "\\mathbb{R}",
              "\\N": "\\mathbb{N}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
            }
          }], 
          rehypeRaw
        ]}
        components={{
          // Tables - improved styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border">
              <table className="w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-border last:border-r-0 px-4 py-2.5 text-left font-semibold text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-r border-border last:border-r-0 px-4 py-2 text-sm">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors even:bg-muted/10">{children}</tr>
          ),
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-border first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-2 first:mt-0">
              {children}
            </h4>
          ),
          
          // Paragraphs - preserve spacing
          p: ({ children }) => (
            <p className="my-2 leading-7 [&:first-child]:mt-0 [&:last-child]:mb-0">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 my-2 space-y-0.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 my-2 space-y-0.5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          
          // Code blocks - don't render as syntax highlighter, let markdown handle
          pre: ({ children, ...props }) => (
            <pre 
              className="bg-muted rounded-lg p-4 overflow-x-auto my-4 font-mono text-sm leading-relaxed"
              {...props}
            >
              {children}
            </pre>
          ),
          
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            
            if (isInline) {
              return (
                <code 
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-4 bg-muted/30 italic">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          
          // Images
          img: ({ src, alt }) => (
            <figure className="my-4">
              <img 
                src={src} 
                alt={alt} 
                className="rounded-lg max-w-full h-auto mx-auto"
              />
              {alt && (
                <figcaption className="text-center text-sm text-muted-foreground mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-t border-border" />
          ),
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          // Line break - preserve
          br: () => <br />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
