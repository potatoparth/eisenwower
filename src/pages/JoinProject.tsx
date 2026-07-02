import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Preview {
  project_id: string;
  project_name: string;
  role: string;
  scope: string;
  inviter_name: string;
  expires_at: string;
  revoked: boolean;
  already_owner: boolean;
  already_member: boolean;
}

export default function JoinProject() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "missing" | "error">("loading");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Save the intended path and route to auth; Index handles auth.
        sessionStorage.setItem("post_login_redirect", `/join/${token}`);
        setStatus("signed_out"); return;
      }
      if (!token) { setStatus("missing"); return; }
      const { data, error } = await supabase.rpc("get_project_invite_preview", { _token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setStatus("missing"); return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as Preview;
      setPreview(row);
      setStatus("ready");
    })();
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    const { error } = await supabase.rpc("accept_project_invite", { _token: token });
    setAccepting(false);
    if (error) { toast({ title: "Could not join", description: error.message }); return; }
    toast({ title: "You've joined the project" });
    navigate("/");
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (status === "signed_out") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <h1 className="text-lg font-bold">Sign in to accept</h1>
          <p className="text-sm text-muted-foreground">You need an account to join this project.</p>
          <Button onClick={() => navigate("/")} className="w-full">Continue</Button>
        </div>
      </div>
    );
  }
  if (status === "missing" || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <XCircle className="w-8 h-8 text-destructive mx-auto" />
          <h1 className="text-lg font-bold">Invite not found</h1>
          <p className="text-sm text-muted-foreground">The link may be revoked or has expired.</p>
          <Button variant="ghost" onClick={() => navigate("/")}>Back to app</Button>
        </div>
      </div>
    );
  }

  const disabled = preview.revoked || preview.already_owner;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs uppercase tracking-wider font-semibold">Project invite</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">{preview.project_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {preview.inviter_name} invited you as <span className="font-medium text-foreground">{preview.role}</span> with access to{" "}
            <span className="font-medium text-foreground">{preview.scope === "all" ? "all items" : "selected items"}</span>.
          </p>
        </div>
        {preview.revoked && <p className="text-xs text-destructive">This invite has been revoked or expired.</p>}
        {preview.already_owner && <p className="text-xs text-muted-foreground">You own this project.</p>}
        {preview.already_member && !preview.revoked && !preview.already_owner && (
          <p className="text-xs text-muted-foreground">You already have access — accepting will update your role/scope.</p>
        )}
        <div className="flex gap-2">
          <Button onClick={accept} disabled={disabled || accepting} className="flex-1">
            {accepting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining…</> : "Accept invite"}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}