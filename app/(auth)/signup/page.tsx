"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Sparkles, ExternalLink, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { demoLoginAction } from "@/app/actions/auth";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_callback_failed") {
      setError("OAuth registration failed or was cancelled. Please try again or create an account with email.");
    }
  }, [searchParams]);

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    const res = await demoLoginAction(fullName.trim() || "Developer");
    if (res.success) {
      router.refresh();
      router.push("/dashboard");
    } else {
      setDemoLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsTimeoutError(false);
    setSuccess(false);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("timed out") || signUpError.message.toLowerCase().includes("timeout")) {
          setIsTimeoutError(true);
          setError("Remote Supabase instance timed out (Disk I/O depleted). You can enter immediately using Demo Sandbox Mode or restart the Supabase project.");
        } else {
          setError(signUpError.message);
        }
      } else if (data?.session) {
        // Active session granted immediately
        router.refresh();
        router.push("/dashboard");
      } else {
        // Confirmation email sent
        setSubmittedEmail(email.trim());
        setSuccess(true);
        setFullName("");
        setEmail("");
        setPassword("");
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
          <CardTitle className="text-xl font-bold tracking-tight">Create Mango Account</CardTitle>
          <CardDescription>Get started by setting up your developer workspace</CardDescription>
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

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20 border-solid space-y-1 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <div>
                <span className="font-semibold block text-sm">Account registered successfully!</span>
                <p className="mt-0.5 leading-relaxed">
                  A confirmation email has been sent to <strong>{submittedEmail || "your email"}</strong>. Please click the link to activate your account, then{" "}
                  <Link href="/login" className="underline font-bold text-primary">
                    Sign In here
                  </Link>.
                </p>
              </div>
            </div>
          )}

          {/* One-Click OAuth Buttons */}
          <OAuthButtons onError={(err) => setError(err)} disabled={loading} />
          
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ada Lovelace"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-accent/40 text-xs h-10"
              />
            </div>

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
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
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
              {loading ? "Creating account..." : "Sign Up with Email"}
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
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-accent/20 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading signup...</div>}>
      <SignupForm />
    </React.Suspense>
  );
}
