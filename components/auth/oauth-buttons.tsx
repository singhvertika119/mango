"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface OAuthButtonsProps {
  onError: (errorMsg: string) => void;
  disabled?: boolean;
}

export function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
      />
    </svg>
  );
}

export function OAuthButtons({ onError, disabled }: OAuthButtonsProps) {
  const supabase = createClient();
  const [loadingProvider, setLoadingProvider] = React.useState<"github" | "google" | null>(null);

  const handleOAuth = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === "google" ? {
            access_type: "offline",
            prompt: "consent",
          } : undefined
        }
      });

      if (error) {
        onError(error.message);
        setLoadingProvider(null);
      }
    } catch (err: any) {
      onError(err.message || `Failed to initiate ${provider} authentication.`);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-2.5 w-full">
      <div className="grid grid-cols-2 gap-3">
        {/* GitHub OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("github")}
          disabled={disabled || loadingProvider !== null}
          className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold bg-accent/30 hover:bg-accent/70 border-border cursor-pointer transition-all"
        >
          {loadingProvider === "github" ? (
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
          ) : (
            <GithubIcon className="w-4 h-4 text-foreground shrink-0" />
          )}
          <span>GitHub</span>
        </Button>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
          disabled={disabled || loadingProvider !== null}
          className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold bg-accent/30 hover:bg-accent/70 border-border cursor-pointer transition-all"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
          ) : (
            <GoogleIcon className="w-4 h-4 shrink-0" />
          )}
          <span>Google</span>
        </Button>
      </div>

      <div className="relative flex items-center justify-center py-2">
        <div className="w-full border-t border-solid border-border/80" />
        <span className="absolute bg-card px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
          Or with email
        </span>
      </div>
    </div>
  );
}
