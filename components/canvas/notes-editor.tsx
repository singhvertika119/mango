"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  FileCode,
  Quote,
  Copy,
  Check,
  RotateCcw,
  Type,
  RemoveFormatting
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotesEditorProps {
  content: string;
  onChange: (newContent: string) => void;
}

// Helper to convert plain text or legacy markdown into clean HTML
function formatInitialHtml(text: string): string {
  if (!text) return "<p><br></p>";
  if (text.includes("<p>") || text.includes("<h1>") || text.includes("<div>") || text.includes("<h2>")) {
    return text;
  }

  const lines = text.split("\n");
  let html = "";
  let inCode = false;
  let codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre class="code-block"><code>${codeLines.join("\n")}</code></pre><p><br></p>`;
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      html += `<h1>${line.slice(2)}</h1>`;
    } else if (line.startsWith("## ")) {
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith("### ")) {
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith("> ")) {
      html += `<blockquote>${line.slice(2)}</blockquote>`;
    } else if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
      const checked = line.startsWith("- [x] ");
      html += `<div class="task-row"><input type="checkbox" ${checked ? "checked" : ""} /><span>${line.slice(6)}</span></div>`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      html += `<ul><li>${line.slice(2)}</li></ul>`;
    } else if (!line.trim()) {
      html += `<p><br></p>`;
    } else {
      html += `<p>${line}</p>`;
    }
  }

  return html || "<p><br></p>";
}

export function NotesEditor({ content, onChange }: NotesEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const isInternalChange = React.useRef(false);

  // Sync external content into editor innerHTML when content prop changes
  React.useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const targetHtml = formatInitialHtml(content);
    if (editorRef.current.innerHTML !== targetHtml) {
      editorRef.current.innerHTML = targetHtml;
    }
  }, [content]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const applyFormatBlock = (tag: string) => {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, `<${tag}>`);
    handleInput();
  };

  const insertCodeBlock = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "// Code snippet here";
    const codeHtml = `<pre class="code-block"><code>${selectedText}</code></pre><p><br></p>`;
    document.execCommand("insertHTML", false, codeHtml);
    handleInput();
  };

  const insertChecklist = () => {
    editorRef.current?.focus();
    const taskHtml = `<div class="task-row"><input type="checkbox" /><span>New task item</span></div><p><br></p>`;
    document.execCommand("insertHTML", false, taskHtml);
    handleInput();
  };

  const handleCopy = () => {
    if (!editorRef.current) return;
    const plainText = editorRef.current.innerText || "";
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!editorRef.current?.innerText.trim()) return;
    if (window.confirm("Are you sure you want to clear all notes?")) {
      if (editorRef.current) {
        editorRef.current.innerHTML = "<p><br></p>";
      }
      onChange("<p><br></p>");
    }
  };

  const stats = React.useMemo(() => {
    if (!content) return { words: 0, chars: 0 };
    // Strip HTML tags for accurate stats
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return {
      words: text ? text.split(" ").length : 0,
      chars: text.length
    };
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-card/40 overflow-hidden border-r border-border">
      {/* 1. TOP FORMATTING TOOLBAR */}
      <div className="border-b border-border bg-card/75 backdrop-blur-md px-3 py-1.5 flex items-center justify-between gap-1 flex-wrap shrink-0 select-none">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Headings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 px-2 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              <Type className="w-3.5 h-3.5" />
              <span>Style</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 text-xs">
              <DropdownMenuItem onClick={() => applyFormatBlock("h1")} className="cursor-pointer font-bold text-sm">
                <Heading1 className="w-4 h-4 mr-2" />
                <span>Heading 1</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFormatBlock("h2")} className="cursor-pointer font-semibold text-xs">
                <Heading2 className="w-3.5 h-3.5 mr-2" />
                <span>Heading 2</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFormatBlock("h3")} className="cursor-pointer font-medium text-xs">
                <Heading3 className="w-3.5 h-3.5 mr-2" />
                <span>Heading 3</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFormatBlock("p")} className="cursor-pointer text-xs">
                <span>Paragraph</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Inline Heading Shortcuts */}
          <div className="flex items-center bg-accent/40 rounded-md p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => applyFormatBlock("h1")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatBlock("h2")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatBlock("h3")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Inline Styles: Bold, Italic, Underline, Strike */}
          <div className="flex items-center bg-accent/40 rounded-md p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => executeCommand("bold")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer italic"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer underline"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("strikeThrough")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Lists & Task Formatting */}
          <div className="flex items-center bg-accent/40 rounded-md p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => executeCommand("insertUnorderedList")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Bulleted List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("insertOrderedList")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={insertChecklist}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Task Checklist"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Code & Quote Snippets */}
          <div className="flex items-center bg-accent/40 rounded-md p-0.5 border border-border/60">
            <button
              type="button"
              onClick={insertCodeBlock}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Insert Code Snippet Block"
            >
              <FileCode className="w-3.5 h-3.5 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatBlock("blockquote")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Quote / Callout Box"
            >
              <Quote className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("removeFormat")}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <span>{stats.words}w</span>
            <span>•</span>
            <span>{stats.chars}c</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Copy all notes"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="text-[11px] font-medium hidden md:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
            title="Clear notes"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 2. RICH WYSIWYG WRITING CANVAS */}
      <div className="flex-1 overflow-y-auto p-6 bg-card/10">
        <div
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onInput={handleInput}
          data-placeholder="Start typing your notes, format headings, add code snippets, bold text, or task lists..."
          className="rich-notes-editor min-h-[500px] outline-none text-foreground font-sans text-sm leading-relaxed max-w-3xl selection:bg-primary/20"
        />
      </div>

      {/* Scoped CSS for Rich Content Styling */}
      <style jsx global>{`
        .rich-notes-editor:empty:before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.5;
          pointer-events: none;
        }
        .rich-notes-editor h1 {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: var(--foreground);
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.35rem;
        }
        .rich-notes-editor h2 {
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: -0.015em;
          margin-top: 1rem;
          margin-bottom: 0.35rem;
          color: var(--foreground);
        }
        .rich-notes-editor h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
          color: var(--foreground);
        }
        .rich-notes-editor p {
          margin-top: 0.35rem;
          margin-bottom: 0.35rem;
          line-height: 1.65;
          color: var(--foreground);
        }
        .rich-notes-editor blockquote {
          border-left: 3px solid var(--primary);
          padding: 0.5rem 0.75rem;
          margin: 0.75rem 0;
          background: rgba(var(--primary-rgb, 99, 102, 241), 0.08);
          border-radius: 0 0.5rem 0.5rem 0;
          font-style: italic;
          color: var(--foreground);
          font-size: 0.875rem;
        }
        .rich-notes-editor pre.code-block {
          background: #0f172a;
          color: #e2e8f0;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          line-height: 1.6;
          margin: 0.75rem 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow-x: auto;
        }
        .rich-notes-editor code {
          font-family: ui-monospace, monospace;
          background: var(--accent);
          padding: 0.15rem 0.35rem;
          border-radius: 0.3rem;
          font-size: 0.85em;
        }
        .rich-notes-editor pre.code-block code {
          background: transparent;
          padding: 0;
          border-radius: 0;
        }
        .rich-notes-editor ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .rich-notes-editor ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        .rich-notes-editor li {
          margin: 0.2rem 0;
        }
        .rich-notes-editor .task-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.3rem 0;
        }
        .rich-notes-editor .task-row input[type="checkbox"] {
          accent-color: var(--primary);
          cursor: pointer;
          width: 14px;
          height: 14px;
        }
      `}</style>
    </div>
  );
}
