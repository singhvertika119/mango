"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  FolderKanban,
  Save,
  Calendar,
  GitBranch,
  Users,
  UserPlus,
  ExternalLink,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Copy,
  Sliders,
  Info,
  Shield,
  Clock,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getWorkspaceProjectAction,
  updateProjectAction,
  getProjectMembersAction,
  inviteProjectMemberAction,
  removeProjectMemberAction
} from "@/app/actions/project";
import { Project, ProjectMember } from "@/lib/services/project";

export default function ProjectSettingsPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Form fields
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [githubRepo, setGithubRepo] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");

  // Members state
  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = React.useState(false);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState(false);

  const fetchProjectData = React.useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const res = await getWorkspaceProjectAction(workspaceId);
    if (res.success && res.project) {
      const p = res.project;
      setProject(p);
      setName(p.name || "");
      setDescription(p.description || "");
      setStatus(p.status || "active");
      setGithubRepo(p.github_repo || "");
      setStartDate(p.start_date ? p.start_date.split("T")[0] : "");
      setTargetDate(p.target_date ? p.target_date.split("T")[0] : "");

      // Load members for this project
      setLoadingMembers(true);
      const memRes = await getProjectMembersAction(p.id);
      if (memRes.success && memRes.members) {
        setMembers(memRes.members);
      }
      setLoadingMembers(false);
    } else {
      setError(res.error || "Failed to load project details.");
    }
    setLoading(false);
  }, [workspaceId]);

  React.useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleSaveProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!project?.id || !name.trim()) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const res = await updateProjectAction(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      status,
      github_repo: githubRepo.trim() || null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      target_date: targetDate ? new Date(targetDate).toISOString() : null
    });

    setSaving(false);

    if (res.success && res.project) {
      setProject(res.project);
      setSuccessMsg("Project settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(res.error || "Failed to update project settings.");
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    const res = await inviteProjectMemberAction(project.id, inviteEmail.trim(), inviteRole);
    setInviting(false);

    if (res.success && res.member) {
      setInviteEmail("");
      setMembers((prev) => [...prev, res.member!]);
      setSuccessMsg(`Invited ${inviteEmail} to project!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError(res.error || "Failed to add project member.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!project?.id) return;
    setRemovingMemberId(memberId);
    setError(null);
    const res = await removeProjectMemberAction(project.id, memberId);
    setRemovingMemberId(null);

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      setError(res.error || "Failed to remove member.");
    }
  };

  const handleCopyProjectId = () => {
    if (!project) return;
    navigator.clipboard.writeText(project.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Sliders className="w-12 h-12 text-muted-foreground stroke-1 animate-pulse" />
        <h3 className="mt-4 text-lg font-semibold">No active workspace</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select or create a workspace from the sidebar switcher to manage project settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse py-4">
        <div className="h-10 w-64 bg-muted rounded-lg" />
        <div className="h-72 bg-card rounded-2xl border border-border" />
        <div className="h-56 bg-card rounded-2xl border border-border" />
        <div className="h-72 bg-card rounded-2xl border border-border" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24">
      {/* Sticky / Floating Header */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-md pt-2 pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Settings</h1>
            {status === "active" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-solid border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full border border-solid border-border capitalize">
                {status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>Workspace Single Stream</span>
            <span>•</span>
            <button
              type="button"
              onClick={handleCopyProjectId}
              className="inline-flex items-center gap-1 font-mono text-[11px] hover:text-primary transition-colors cursor-pointer bg-accent/40 border border-border px-2 py-0.5 rounded-md"
              title="Click to copy Project ID"
            >
              <span>ID: {project?.id?.slice(0, 8)}...</span>
              {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => handleSaveProject()}
            disabled={saving || !name.trim()}
            className="gap-2 text-xs font-semibold cursor-pointer h-9 px-5 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-sm">Update Error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20 border-solid animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: GENERAL INFORMATION                           */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border">
          <FolderKanban className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">General Information</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Primary identification, lifecycle status, and development timeline for this project.
            </p>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card/60 p-6 shadow-xs">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name" className="text-xs font-bold text-foreground">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Workspace Agent MVP, Core Engine"
                required
                className="text-xs h-10 bg-accent/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-status" className="text-xs font-bold text-foreground">
                Lifecycle Status
              </Label>
              <select
                id="proj-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-accent/20 px-3 text-xs text-foreground font-medium outline-none cursor-pointer"
              >
                <option value="active">Active (Current focus)</option>
                <option value="paused">Paused (On hold)</option>
                <option value="completed">Completed (Shipped)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc" className="text-xs font-bold text-foreground">
              Description & Scope
            </Label>
            <textarea
              id="proj-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the architectural goals, core deliverables, or scope of this project..."
              className="w-full rounded-md border border-input bg-accent/20 p-3 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/60">
            <div className="space-y-2">
              <Label htmlFor="proj-start" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Start Date</span>
              </Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs h-10 bg-accent/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-target" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Target Completion Date</span>
              </Label>
              <Input
                id="proj-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-xs h-10 bg-accent/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 2: GITHUB REPOSITORY BINDING                     */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">GitHub Repository Binding</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your codebase repository. The AI Agent automatically runs Git actions, inspects commits, and manages PRs against this repo.
              </p>
            </div>
          </div>

          {githubRepo && (
            <a
              href={`https://github.com/${githubRepo}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Open on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card/60 p-6 shadow-xs">
          <div className="space-y-2">
            <Label htmlFor="proj-repo" className="text-xs font-bold text-foreground">
              Repository Identifier (<code>owner/repo</code>)
            </Label>
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none">
                  github.com/
                </span>
                <Input
                  id="proj-repo"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="e.g. singhvertika119/mango"
                  className="text-xs h-10 pl-26 font-mono bg-accent/20"
                />
              </div>
              {githubRepo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://github.com/${githubRepo}`, "_blank")}
                  className="h-10 text-xs px-3.5 cursor-pointer shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Zero-friction agent queries:</strong> When you chat with the AI Agent (e.g. <em>"list the open pull requests"</em>, <em>"check latest commits"</em>, or <em>"create an issue"</em>), it directly uses this repository without prompting for a repository name.
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: TEAM & ACCESS CONTROL                         */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Team & Collaborator Access</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Invite teammates to collaborate on this project without granting full workspace administrative privileges.
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-muted-foreground bg-accent px-3 py-1 rounded-full border border-border">
            {members.length} {members.length === 1 ? "Collaborator" : "Collaborators"}
          </span>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card/60 p-6 shadow-xs">
          {/* Invite Form */}
          <form onSubmit={handleInviteMember} className="space-y-3">
            <Label htmlFor="invite-email" className="text-xs font-bold text-foreground">
              Invite New Collaborator
            </Label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="text-xs h-10 bg-accent/20 flex-1"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "EDITOR" | "VIEWER")}
                className="h-10 px-3 text-xs bg-accent border border-border rounded-md text-foreground font-semibold outline-none cursor-pointer sm:w-36"
              >
                <option value="EDITOR">Editor (Write)</option>
                <option value="VIEWER">Viewer (Read only)</option>
              </select>
              <Button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="h-10 px-4 text-xs font-semibold cursor-pointer gap-2 shrink-0"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite Teammate</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Members Table / List */}
          <div className="space-y-2 pt-4 border-t border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Active Teammates
            </span>

            <div className="divide-y divide-border rounded-xl border border-solid border-border bg-accent/10 overflow-hidden">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading team members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                  <p className="font-semibold text-foreground">No external teammates added yet.</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Workspace owners and creators have automatic access to this project.
                  </p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3.5 text-xs hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8">
                        {m.profile?.avatar_url && (
                          <AvatarImage src={m.profile.avatar_url} alt={m.profile.email} />
                        )}
                        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-bold">
                          {(m.profile?.full_name || m.profile?.email || "U")
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {m.profile?.full_name || m.profile?.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {m.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-solid ${
                          m.role === "EDITOR"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        }`}
                      >
                        {m.role === "EDITOR" ? "Editor" : "Viewer"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={removingMemberId === m.id}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                        title="Remove member access"
                      >
                        {removingMemberId === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 4: DANGER ZONE                                   */}
      {/* ======================================================== */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-destructive/20">
          <Shield className="w-5 h-5 text-destructive" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-destructive">Danger Zone</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Destructive actions for this project stream.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-foreground">Archive Project</h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
                Archiving sets this project to read-only. Tasks and knowledge assets will be preserved, but agent executions will be halted.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus("archived");
                handleSaveProject();
              }}
              className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold text-xs h-9 px-4 cursor-pointer shrink-0 gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Project</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
