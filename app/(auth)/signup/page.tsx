"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");

  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_callback_failed") {
      setError("OAuth registration failed or was cancelled. Please try again or create an account with email.");
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
        setError(signUpError.message);
      } else if (data?.session) {
        // Active session granted immediately (Email Confirmation disabled in Supabase)
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
      setError("An unexpected error occurred. Please try again.");
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
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 border-solid animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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

            <Button type="submit" className="w-full cursor-pointer h-10 text-xs font-semibold mt-2" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up with Email"}
            </Button>
          </form>
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
