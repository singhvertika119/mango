"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/utils/crypto";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Offline mock state
let mockConnected = false;

// Helper to validate a GitHub token with GitHub API
async function validateGithubToken(token: string) {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Workspace-Agent-NextJS",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return {
        isValid: true,
        user: {
          login: data.login,
          avatarUrl: data.avatar_url,
          name: data.name || data.login,
          htmlUrl: data.html_url,
        },
      };
    }

    const errJson = await res.json().catch(() => null);
    return {
      isValid: false,
      error:
        res.status === 401
          ? "GitHub returned 401 Bad credentials (token expired or revoked)."
          : `GitHub error ${res.status}: ${errJson?.message || res.statusText}`,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Network error connecting to GitHub: ${err.message}`,
    };
  }
}

export async function getIntegrationsAction(workspaceId: string) {
  const isPlaceholder =
    !process.env.GITHUB_CLIENT_ID ||
    process.env.GITHUB_CLIENT_ID === "your_github_client_id";

  if (!isSupabaseConfigured) {
    return {
      success: true,
      connected: mockConnected,
      isValid: mockConnected,
      isPlaceholder: true,
      authType: "mock",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("id, provider, settings, credentials")
      .eq("workspace_id", workspaceId)
      .eq("provider", "github")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Check if fallback server environment token is configured
      const envToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
      if (envToken) {
        const validation = await validateGithubToken(envToken);
        return {
          success: true,
          connected: true,
          isValid: validation.isValid,
          isPlaceholder: false,
          authType: "env",
          username: validation.user?.login,
          avatarUrl: validation.user?.avatarUrl,
          name: validation.user?.name,
          error: validation.error,
        };
      }

      return {
        success: true,
        connected: false,
        isValid: false,
        isPlaceholder,
      };
    }

    // Decrypt credentials and validate with GitHub
    let token: string | null = null;
    try {
      token = decrypt(data.credentials);
    } catch {
      token = data.credentials;
    }

    if (!token) {
      return {
        success: true,
        connected: true,
        isValid: false,
        isPlaceholder,
        error: "Failed to decrypt credentials.",
      };
    }

    const validation = await validateGithubToken(token);
    const settings = data.settings || {};

    return {
      success: true,
      connected: true,
      isValid: validation.isValid,
      isPlaceholder,
      authType: settings.auth_type || "oauth",
      username: validation.user?.login || settings.username,
      avatarUrl: validation.user?.avatarUrl || settings.avatar_url,
      name: validation.user?.name,
      connectedAt: settings.connected_at,
      error: validation.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to fetch integrations status.",
    };
  }
}

export async function saveGithubPatAction(workspaceId: string, pat: string) {
  const cleanPat = pat.trim();
  if (!cleanPat) {
    return { success: false, error: "Personal Access Token cannot be empty." };
  }

  // 1. Validate token with GitHub API first
  const validation = await validateGithubToken(cleanPat);
  if (!validation.isValid || !validation.user) {
    return {
      success: false,
      error: validation.error || "Invalid Personal Access Token.",
    };
  }

  if (!isSupabaseConfigured) {
    mockConnected = true;
    return {
      success: true,
      username: validation.user.login,
      avatarUrl: validation.user.avatarUrl,
    };
  }

  try {
    const encryptedToken = encrypt(cleanPat);
    const supabase = await createClient();

    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: "github",
          credentials: encryptedToken,
          settings: {
            auth_type: "pat",
            username: validation.user.login,
            avatar_url: validation.user.avatarUrl,
            connected_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "workspace_id,provider",
        }
      );

    if (upsertError) throw upsertError;

    revalidatePath("/integrations");
    return {
      success: true,
      username: validation.user.login,
      avatarUrl: validation.user.avatarUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to save GitHub Personal Access Token.",
    };
  }
}

export async function disconnectGithubAction(workspaceId: string) {
  if (!isSupabaseConfigured) {
    mockConnected = false;
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", "github");

    if (error) throw error;
    revalidatePath("/integrations");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to disconnect GitHub.",
    };
  }
}

export async function mockConnectGithubAction() {
  mockConnected = true;
  return { success: true };
}

