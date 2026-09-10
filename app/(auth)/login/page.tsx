"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_callback_failed") {
      setError("OAuth authentication failed or was cancelled. Please try again or sign in with your email.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError("Your email address has not been confirmed yet. Please check your inbox for the confirmation link.");
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
      setError(err?.message || "An unexpected error occurred during login.");
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
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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

            <Button type="submit" className="w-full cursor-pointer h-10 text-xs font-semibold mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign In with Email"}
            </Button>
          </form>
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
