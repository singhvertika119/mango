"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, AlertCircle, ExternalLink, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { demoLoginAction } from "@/app/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_callback_failed") {
      setError("OAuth authentication failed or was cancelled. Please try again or sign in with your email.");
    }
  }, [searchParams]);

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    const res = await demoLoginAction("Developer");
    if (res.success) {
      router.refresh();
      router.push("/dashboard");
    } else {
      setDemoLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsTimeoutError(false);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("timed out") || signInError.message.toLowerCase().includes("timeout")) {
          setIsTimeoutError(true);
          setError("Remote Supabase instance timed out (Disk I/O depleted). You can enter immediately using Demo Sandbox Mode or restart the Supabase project.");
        } else if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError("Your email address has not been confirmed yet. Please check your inbox or spam folder for the confirmation link.");
        } else if (signInError.message.toLowerCase().includes("invalid login credentials")) {
          setError("Invalid email or password. Please verify your credentials and try again.");
        } else {
          setError(signInError.message);
        }
      } else {
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again or continue with Demo Mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-accent/20 px-4 py-8">
      <Card className="w-full max-w-md border-border bg-card shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-black text-base shadow-md shadow-amber-500/20 mb-2">
            m
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Welcome to Mango</CardTitle>
          <CardDescription>Sign in to your developer workspace and projects</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
              {isTimeoutError && (
                <div className="mt-1 pt-2 border-t border-destructive/20 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleDemoAccess}
                    disabled={demoLoading}
                    className="w-full h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{demoLoading ? "Opening Sandbox..." : "Enter in Demo Sandbox Mode"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <a
                    href="https://supabase.com/dashboard/project/ajiyynikcsmylgsrwcrw"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-foreground text-center flex items-center justify-center gap-1 hover:underline"
                  >
                    <span>Check Supabase Project Status</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* One-Click OAuth Buttons */}
          <OAuthButtons onError={(err) => setError(err)} disabled={loading} />
          
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="developer@mango.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-accent/40 text-xs h-10"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-accent/40 text-xs h-10"
              />
            </div>

            <Button type="submit" className="w-full cursor-pointer h-10 text-xs font-semibold mt-2" disabled={loading || demoLoading}>
              {loading ? "Signing in..." : "Sign In with Email"}
            </Button>
          </form>

          {/* Guest / Demo Sandbox Option */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoAccess}
              disabled={demoLoading || loading}
              className="w-full h-9 text-xs border-dashed border-border bg-accent/20 hover:bg-accent text-foreground flex items-center justify-center gap-1.5 cursor-pointer font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>{demoLoading ? "Starting Demo..." : "Explore Demo Mode (No DB required)"}</span>
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3 border-t border-border/60 pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-accent/20 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading login...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
