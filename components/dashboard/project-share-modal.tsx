"use client";

import * as React from "react";
import { UserPlus, Copy, Check, Trash2, Shield, User, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Project, ProjectMember } from "@/lib/services/project";
import {
  getProjectMembersAction,
  inviteProjectMemberAction,
  removeProjectMemberAction,
} from "@/app/actions/project";

interface ProjectShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function ProjectShareModal({ open, onOpenChange, project }: ProjectShareModalProps) {
  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"EDITOR" | "VIEWER">("EDITOR");
  const [inviting, setInviting] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const loadMembers = React.useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setError(null);
    const res = await getProjectMembersAction(project.id);
    if (res.success && res.members) {
      setMembers(res.members);
    } else {
      setError(res.error || "Failed to load project members.");
    }
    setLoading(false);
  }, [project?.id]);

  React.useEffect(() => {
    if (open && project) {
      loadMembers();
    }
  }, [open, project, loadMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !email.trim()) return;

    setInviting(true);
    setError(null);
    const res = await inviteProjectMemberAction(project.id, email.trim(), role);
    setInviting(false);

    if (res.success && res.member) {
      setEmail("");
      setMembers((prev) => [...prev, res.member!]);
    } else {
      setError(res.error || "Failed to add member.");
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!project?.id) return;
    setRemovingId(memberId);
    setError(null);
    const res = await removeProjectMemberAction(project.id, memberId);
    setRemovingId(null);

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      setError(res.error || "Failed to remove member.");
    }
  };

  const handleCopyLink = () => {
    if (!project) return;
    const url = `${window.location.origin}/projects?workspaceId=${project.workspace_id}&projectId=${project.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Share "{project.name}"</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite teammates to collaborate on this specific project. Invited members will only have access to this project.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Invite Member Form */}
        <form onSubmit={handleInvite} className="space-y-3 pt-2">
          <Label className="text-xs font-semibold">Invite by Email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 text-xs bg-accent/30 border-border placeholder:text-muted-foreground flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "EDITOR" | "VIEWER")}
              className="h-9 px-2.5 text-xs bg-accent border border-border rounded-md text-foreground font-semibold outline-none cursor-pointer"
            >
              <option value="EDITOR">Can edit</option>
              <option value="VIEWER">Can view</option>
            </select>
            <Button
              type="submit"
              disabled={inviting || !email.trim()}
              size="sm"
              className="h-9 px-3.5 text-xs font-semibold bg-primary text-primary-foreground cursor-pointer shrink-0"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invite"}
            </Button>
          </div>
        </form>

        {/* Current Members List */}
        <div className="space-y-2 pt-3 border-t border-border mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Project Members ({members.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-7 text-[11px] font-semibold text-primary hover:text-primary gap-1 px-2 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-solid border-border bg-accent/10">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>No external teammates shared on this project yet.</p>
                <p className="text-[10px] mt-0.5 text-muted-foreground/80">
                  Workspace members have full access by default.
                </p>
              </div>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-7 h-7">
                      {m.profile?.avatar_url && (
                        <AvatarImage src={m.profile.avatar_url} alt={m.profile.email} />
                      )}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {(m.profile?.full_name || m.profile?.email || "U")
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {m.profile?.full_name || m.profile?.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.profile?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-solid ${
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
                      onClick={() => handleRemove(m.id)}
                      disabled={removingId === m.id}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                    >
                      {removingId === m.id ? (
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
      </DialogContent>
    </Dialog>
  );
}
