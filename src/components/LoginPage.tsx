import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LayoutGrid, UserPlus, LogIn } from "lucide-react";

interface LoginPageProps {
  needsSetup: boolean;
  onLogin: (username: string, password: string) => { success: boolean; error?: string };
  onSignup: (username: string, password: string, role: "admin" | "user") => { success: boolean; error?: string };
}

export function LoginPage({ needsSetup, onLogin, onSignup }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">(needsSetup ? "signup" : "login");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }
      const role = needsSetup ? "admin" : "user";
      const result = onSignup(username.trim(), password, role);
      if (!result.success) setError(result.error || "Signup failed");
    } else {
      const result = onLogin(username.trim(), password);
      if (!result.success) setError(result.error || "Login failed");
    }
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
            {needsSetup ? "Create your admin account to get started" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border p-6 space-y-4 shadow-soft">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className="rounded-xl"
            />
          </div>
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

          <Button type="submit" className="w-full rounded-xl gap-2">
            {mode === "signup" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {mode === "signup" ? (needsSetup ? "Create Admin Account" : "Sign Up") : "Sign In"}
          </Button>

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
