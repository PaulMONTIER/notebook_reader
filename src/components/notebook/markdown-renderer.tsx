'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Matches lines that are structurally part of a box-drawing table:
// must START with a table-structural character (corners, junctions, pipes)
const BOX_TABLE_LINE_RE = /^\s*[┌┐└┘├┤│╔╗╚╝╠╣║]/;

type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'box-table'; header: string[]; rows: string[][] };

// Try to extract a box-drawing data table from lines.
// Returns the table segment if successful, null otherwise.
function tryExtractTable(boxLines: string[]): { header: string[]; rows: string[][] } | null {
  const dataRows = boxLines
    .filter(line => /^\s*[│║]/.test(line))
    .map(line => line.split(/[│║]/).slice(1, -1).map(cell => cell.trim()))
    .filter(cells => cells.length > 0);

  if (dataRows.length >= 2 && dataRows[0].length >= 2) {
    return { header: dataRows[0], rows: dataRows.slice(1) };
  }
  return null;
}

// Split content into markdown segments and box-drawing table segments
function splitContent(content: string): Segment[] {
  const lines = content.split('\n');
  const segments: Segment[] = [];
  let mdLines: string[] = [];
  let i = 0;

  function flushMd() {
    if (mdLines.length > 0) {
      segments.push({ type: 'markdown', content: mdLines.join('\n') });
      mdLines = [];
    }
  }

  while (i < lines.length) {
    // Detect code fence opening (``` or ~~~, optionally with language)
    if (/^\s*(`{3,}|~{3,})/.test(lines[i])) {
      const fenceOpen = lines[i];
      i++;

      // Collect everything until the closing fence
      const codeBlockLines: string[] = [];
      while (i < lines.length && !/^\s*(`{3,}|~{3,})\s*$/.test(lines[i])) {
        codeBlockLines.push(lines[i]);
        i++;
      }
      const fenceClose = i < lines.length ? lines[i] : '```';
      if (i < lines.length) i++;

      // Check if the code block contains ONLY a box-drawing table (no mixed content)
      const nonEmptyLines = codeBlockLines.filter(l => l.trim() !== '');
      const allBox = nonEmptyLines.length >= 3 && nonEmptyLines.every(l => BOX_TABLE_LINE_RE.test(l));

      if (allBox) {
        const table = tryExtractTable(nonEmptyLines);
        if (table) {
          // Pure data table inside code fence → convert to HTML table
          flushMd();
          segments.push({ type: 'box-table', ...table });
          continue;
        }
      }

      // Mixed content or not a data table → keep as code block
      mdLines.push(fenceOpen);
      for (const line of codeBlockLines) {
        mdLines.push(line);
      }
      mdLines.push(fenceClose);
      continue;
    }

    // Outside code fence: detect bare box-drawing tables
    if (BOX_TABLE_LINE_RE.test(lines[i])) {
      const tableLines: string[] = [];
      while (i < lines.length && BOX_TABLE_LINE_RE.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }

      const table = tryExtractTable(tableLines);
      if (table) {
        flushMd();
        segments.push({ type: 'box-table', ...table });
      } else {
        // Not a data table → wrap in code fence for monospace
        mdLines.push('```');
        for (const line of tableLines) {
          mdLines.push(line);
        }
        mdLines.push('```');
      }
    } else {
      mdLines.push(lines[i]);
      i++;
    }
  }

  flushMd();
  return segments;
}

// Preprocess LaTeX content to fix common issues
function preprocessLatex(content: string): string {
  let processed = content;

  processed = processed.replace(/\$\$\s*\\begin\{(align\*?|gather\*?|equation\*?|eqnarray\*?|multline\*?|array\*?|pmatrix|bmatrix|vmatrix|Vmatrix|cases|split|aligned|gathered)\}([\s\S]*?)\\end\{\1\}\s*\$\$/g,
    (match, env, inner) => {
      return `$$\\begin{${env}}${inner}\\end{${env}}$$`;
    }
  );

  processed = processed.replace(/\$\s*\\begin\{(pmatrix|bmatrix|vmatrix|Vmatrix|cases)\}([\s\S]*?)\\end\{\1\}\s*\$/g,
    (match, env, inner) => {
      return `$$\\begin{${env}}${inner}\\end{${env}}$$`;
    }
  );

  processed = processed.replace(/\$\$([^$]+)\$\$/g, (match, inner) => {
    return `$$${inner}$$`;
  });

  processed = processed.replace(/\\begin\{(align\*?|gather\*?|equation\*?)\}([\s\S]*?)\\end\{\1\}/g,
    (match, env, inner) => {
      return match;
    }
  );

  return processed;
}

// Render a single box-drawing table as a React element
function BoxTable({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="min-w-full border-collapse">
        <thead className="bg-muted/70">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border-b border-r border-border last:border-r-0 px-4 py-2.5 text-left font-semibold text-sm whitespace-nowrap"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30 transition-colors even:bg-muted/10">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-r border-border last:border-r-0 px-4 py-2 text-sm whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Markdown rendering component (used for markdown segments)
function MarkdownSegment({ content }: { content: string }) {
  const processedContent = useMemo(() => preprocessLatex(content), [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[
        [rehypeKatex, {
          strict: false,
          trust: true,
          displayMode: false,
          throwOnError: false,
          output: 'html'
        }],
        rehypeRaw
      ]}
      components={{
        // Tables - improved styling
        table: ({ children }) => (
          <div className="overflow-x-auto my-4 rounded-lg border border-border">
            <table className="min-w-full border-collapse">
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
          <th className="border-b border-r border-border last:border-r-0 px-4 py-2.5 text-left font-semibold text-sm whitespace-nowrap">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-r border-border last:border-r-0 px-4 py-2 text-sm whitespace-nowrap">
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

        // Code blocks - with syntax highlighting
        pre: ({ children, className, ...props }) => {
          const childElement = children as React.ReactElement;
          if (childElement?.type === 'code') {
            return <>{children}</>;
          }

          return (
            <pre
              className="bg-muted rounded-lg p-4 overflow-x-auto my-4 font-mono text-sm leading-relaxed"
              {...props}
            >
              {children}
            </pre>
          );
        },

        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeString = String(children).replace(/\n$/, '');
          // Block code has a language OR contains newlines; everything else is inline
          const isInline = !className && !codeString.includes('\n');

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
            <div className="rounded-xl overflow-hidden my-4">
              <SyntaxHighlighter
                language={language || 'text'}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  borderRadius: '0.75rem',
                }}
                showLineNumbers={codeString.split('\n').length > 3}
                lineNumberStyle={{
                  minWidth: '2.5em',
                  paddingRight: '1em',
                  color: '#6e7681',
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
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
  );
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const segments = useMemo(() => splitContent(content), [content]);

  return (
    <div className={`markdown-content ${className}`}>
      {segments.map((seg, i) =>
        seg.type === 'box-table' ? (
          <BoxTable key={i} header={seg.header} rows={seg.rows} />
        ) : (
          <MarkdownSegment key={i} content={seg.content} />
        )
      )}
    </div>
  );
}
