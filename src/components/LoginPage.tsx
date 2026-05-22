import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LayoutGrid, UserPlus, LogIn } from "lucide-react";

interface LoginPageProps {
  needsSetup: boolean;
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignup: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  onGoogleLogin?: () => Promise<{ success: boolean; error?: string }>;
}

export function LoginPage({ needsSetup, onLogin, onSignup, onGoogleLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">(needsSetup ? "signup" : "login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords don't match");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setIsSubmitting(false);
        return;
      }
      const result = await onSignup(email.trim(), password, displayName.trim() || undefined);
      if (!result.success) setError(result.error || "Signup failed");
    } else {
      const result = await onLogin(email.trim(), password);
      if (!result.success) setError(result.error || "Login failed");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Eisenhower Matrix</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {needsSetup ? "Create your admin account once" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border p-6 space-y-4 shadow-soft">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-xl"
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Display name</label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className="rounded-xl" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="rounded-xl"
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="rounded-xl"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl gap-2">
            {mode === "signup" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {isSubmitting ? "Please wait..." : mode === "signup" ? (needsSetup ? "Create Admin Account" : "Sign Up") : "Sign In"}
          </Button>

          {onGoogleLogin && (
            <Button type="button" variant="outline" onClick={async () => { const result = await onGoogleLogin(); if (!result.success) setError(result.error || "Google sign-in failed"); }} className="w-full rounded-xl">
              Continue with Google
            </Button>
          )}

          {!needsSetup && (
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
