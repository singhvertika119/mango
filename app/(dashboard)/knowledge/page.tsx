"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  BookOpen,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Code,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { getProjectsAction } from "@/app/actions/project";
import {
  getNotesAction, createNoteAction, deleteNoteAction,
  getLinksAction, createLinkAction, deleteLinkAction,
  getCodeSnippetsAction, createCodeSnippetAction, deleteCodeSnippetAction
} from "@/app/actions/knowledge";

interface Project {
  id: string;
  name: string;
}

interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
}

interface LinkItem {
  id: string;
  project_id: string;
  title: string;
  url: string;
  description: string | null;
}

interface CodeSnippet {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  code: string;
  language: string;
}

export default function KnowledgePage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [notes, setNotes] = React.useState<Note[]>([]);
  const [links, setLinks] = React.useState<LinkItem[]>([]);
  const [snippets, setSnippets] = React.useState<CodeSnippet[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog & Form State
  const [activeTab, setActiveTab] = React.useState("notes");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  
  // Note Form
  const [noteTitle, setNoteTitle] = React.useState("");
  const [noteContent, setNoteContent] = React.useState("");

  // Link Form
  const [linkTitle, setLinkTitle] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkDesc, setLinkDesc] = React.useState("");

  // Snippet Form
  const [snipTitle, setSnipTitle] = React.useState("");
  const [snipCode, setSnipCode] = React.useState("");
  const [snipLanguage, setSnipLanguage] = React.useState("typescript");
  const [snipDesc, setSnipDesc] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    // Fetch projects
    const projectsRes = await getProjectsAction(workspaceId);
    if (projectsRes.success && projectsRes.projects) {
      setProjects(projectsRes.projects);
      if (projectsRes.projects.length > 0) {
        setSelectedProjectId(projectsRes.projects[0].id);
      }
    }

    // Fetch Notes
    const notesRes = await getNotesAction(workspaceId);
    if (notesRes.success && notesRes.notes) {
      setNotes(notesRes.notes as Note[]);
    }

    // Fetch Links
    const linksRes = await getLinksAction(workspaceId);
    if (linksRes.success && linksRes.links) {
      setLinks(linksRes.links as LinkItem[]);
    }

    // Fetch Snippets
    const snipsRes = await getCodeSnippetsAction(workspaceId);
    if (snipsRes.success && snipsRes.snippets) {
      setSnippets(snipsRes.snippets as CodeSnippet[]);
    }

    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedProjectId) return;

    setSubmitting(true);
    let success = false;

    if (activeTab === "notes" && noteTitle.trim()) {
      const res = await createNoteAction(workspaceId, selectedProjectId, noteTitle.trim(), noteContent.trim() || null);
      if (res.success) {
        setNoteTitle("");
        setNoteContent("");
        success = true;
      }
    } else if (activeTab === "links" && linkTitle.trim() && linkUrl.trim()) {
      const res = await createLinkAction(workspaceId, selectedProjectId, linkTitle.trim(), linkUrl.trim(), linkDesc.trim() || null);
      if (res.success) {
        setLinkTitle("");
        setLinkUrl("");
        setLinkDesc("");
        success = true;
      }
    } else if (activeTab === "snippets" && snipTitle.trim() && snipCode.trim()) {
      const res = await createCodeSnippetAction(workspaceId, selectedProjectId, snipTitle.trim(), snipDesc.trim() || null, snipCode, snipLanguage);
      if (res.success) {
        setSnipTitle("");
        setSnipCode("");
        setSnipDesc("");
        success = true;
      }
    }

    setSubmitting(false);
    if (success) {
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string, type: "note" | "link" | "snippet") => {
    if (type === "note") {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      await deleteNoteAction(id);
    } else if (type === "link") {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      await deleteLinkAction(id);
    } else if (type === "snippet") {
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      await deleteCodeSnippetAction(id);
    }
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground stroke-1" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to view knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build project intelligence with documents, custom notes, links, and snippets
          </p>
        </div>
        <Button
          className="gap-2 cursor-pointer"
          onClick={() => {
            if (projects.length === 0) {
              setError("Please create a project first before adding knowledge assets.");
            } else {
              setDialogOpen(true);
            }
          }}
          disabled={activeTab === "documents"}
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 border-solid max-w-md">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card/60 border border-border border-solid p-1 rounded-xl">
          <TabsTrigger value="notes" className="gap-2 cursor-pointer">
            <BookOpen className="w-4 h-4" />
            <span>Notes</span>
          </TabsTrigger>
          <TabsTrigger value="snippets" className="gap-2 cursor-pointer">
            <Code className="w-4 h-4" />
            <span>Code Snippets</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2 cursor-pointer">
            <LinkIcon className="w-4 h-4" />
            <span>Links</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4" />
            <span>Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. NOTES TAB */}
        <TabsContent value="notes" className="space-y-4 outline-none">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-accent animate-pulse rounded-lg" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card">
              <BookOpen className="w-12 h-12 text-muted-foreground stroke-1" />
              <h3 className="mt-4 text-sm font-semibold">No notes created</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
                Draft internal release guidelines, feature mappings, or meeting decisions.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => {
                const proj = projects.find((p) => p.id === note.project_id);
                return (
                  <Card key={note.id} className="border-border bg-card group relative">
                    <button
                      onClick={() => handleDelete(note.id, "note")}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold truncate pr-6">{note.title}</CardTitle>
                      {proj && <span className="text-[10px] text-muted-foreground font-semibold">{proj.name}</span>}
                    </CardHeader>
                    {note.content && (
                      <CardContent className="p-4 pt-0 text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-4">
                        {note.content}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 2. SNIPPETS TAB */}
        <TabsContent value="snippets" className="space-y-4 outline-none">
          {loading ? (
            <div className="space-y-4">
              <div className="h-32 bg-accent animate-pulse rounded-lg" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card">
              <Code className="w-12 h-12 text-muted-foreground stroke-1" />
              <h3 className="mt-4 text-sm font-semibold">No code snippets saved</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
                Save configuration templates, API hooks, or functions for the agent to reference.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {snippets.map((snip) => {
                const proj = projects.find((p) => p.id === snip.project_id);
                return (
                  <Card key={snip.id} className="border-border bg-card group flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold truncate max-w-xs">{snip.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {proj && <span className="text-[10px] text-muted-foreground font-semibold">{proj.name}</span>}
                          <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-semibold">
                            {snip.language}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(snip.id, "snippet")}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {snip.description && (
                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{snip.description}</p>
                      )}
                      <pre className="p-3 bg-accent/40 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-border border-solid">
                        <code>{snip.code}</code>
                      </pre>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 3. LINKS TAB */}
        <TabsContent value="links" className="space-y-4 outline-none">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-accent animate-pulse rounded-lg" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card">
              <LinkIcon className="w-12 h-12 text-muted-foreground stroke-1" />
              <h3 className="mt-4 text-sm font-semibold">No resource links saved</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center">
                Link project specs, Linear boards, GitHub repositories, or external wikis.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => {
                const proj = projects.find((p) => p.id === link.project_id);
                return (
                  <Card key={link.id} className="border-border bg-card group relative flex flex-col justify-between">
                    <button
                      onClick={() => handleDelete(link.id, "link")}
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-1">
                        <CardTitle className="text-sm font-bold truncate pr-6">{link.title}</CardTitle>
                      </div>
                      {proj && <span className="text-[10px] text-muted-foreground font-semibold">{proj.name}</span>}
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {link.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                          {link.description}
                        </p>
                      )}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 4. DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-4 outline-none">
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card text-card-foreground">
            <FileText className="w-12 h-12 text-primary stroke-1" />
            <h3 className="mt-4 text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 fill-current text-primary" />
              <span>Documents parsing setup</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center leading-relaxed">
              PDF, Markdown, and TXT parsing, Supabase Storage uploads, and 384-dimensional vector embedding integrations will be hooked up in Phase 6.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset Creation Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Asset</DialogTitle>
            <DialogDescription>
              Create a new note, code snippet, or reference link for your active project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assetProj">Project</Label>
                <select
                  id="assetProj"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assetType">Type</Label>
                <select
                  id="assetType"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="notes">Note</option>
                  <option value="snippets">Code Snippet</option>
                  <option value="links">Link</option>
                </select>
              </div>
            </div>

            {/* Note Fields */}
            {activeTab === "notes" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="noteTitle">Note Title</Label>
                  <Input
                    id="noteTitle"
                    placeholder="E.g., Production Deploy Checklist"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="noteContent">Content (Markdown supported)</Label>
                  <textarea
                    id="noteContent"
                    rows={4}
                    placeholder="Enter notes text here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}

            {/* Link Fields */}
            {activeTab === "links" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="linkTitle">Link Title</Label>
                  <Input
                    id="linkTitle"
                    placeholder="E.g., Linear Roadmap"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkUrl">URL</Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://linear.app/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkDesc">Description</Label>
                  <textarea
                    id="linkDesc"
                    rows={2}
                    placeholder="Reference URL description..."
                    value={linkDesc}
                    onChange={(e) => setLinkDesc(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}

            {/* Snippet Fields */}
            {activeTab === "snippets" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="snipTitle">Snippet Title</Label>
                  <Input
                    id="snipTitle"
                    placeholder="E.g., Supabase Auth trigger query"
                    value={snipTitle}
                    onChange={(e) => setSnipTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="snipLang">Language</Label>
                    <select
                      id="snipLang"
                      value={snipLanguage}
                      onChange={(e) => setSnipLanguage(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="sql">SQL</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="bash">Bash</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="snipDesc">Description (Optional)</Label>
                    <Input
                      id="snipDesc"
                      placeholder="Brief note about snippet"
                      value={snipDesc}
                      onChange={(e) => setSnipDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="snipCode">Code Block</Label>
                  <textarea
                    id="snipCode"
                    rows={4}
                    placeholder="console.log('Hello World');"
                    value={snipCode}
                    onChange={(e) => setSnipCode(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs font-mono placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
