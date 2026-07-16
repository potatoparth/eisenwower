import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { UserAccount } from "@/types/settings";
import { primeUserProfile, refreshUserProfile, type BadgeGradient } from "@/lib/userProfiles";
import { supabase as sb } from "@/integrations/supabase/client";

type AuthResult = { success: boolean; error?: string };

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  avatar_url?: string | null;
  badge_color?: string | null;
  badge_gradient?: unknown;
}

interface RoleRow {
  user_id: string;
  role: "admin" | "user";
}

const toAccount = (profile: ProfileRow, role?: "admin" | "user"): UserAccount => ({
  id: profile.user_id,
  email: profile.email,
  username: profile.display_name || profile.email,
  role: role || "user",
  createdAt: profile.created_at,
  avatarUrl: profile.avatar_url ?? null,
  badgeColor: profile.badge_color ?? null,
  badgeGradient: (profile.badge_gradient as BadgeGradient | null) ?? null,
});

const getDisplayName = (user: User | null) => {
  if (!user) return "";
  return user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || user.email || "User";
};

function nextRedirect(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw) return undefined;
  // Same-origin, relative path only.
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return window.location.origin + raw;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadCurrentUser = useCallback(async (user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      setUsers([]);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id,email,display_name,created_at,avatar_url,badge_color,badge_gradient")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .eq("user_id", user.id);

    const role = (roleRows?.[0]?.role || "user") as "admin" | "user";
    const fallbackProfile: ProfileRow = {
      user_id: user.id,
      email: user.email || "",
      display_name: getDisplayName(user),
      created_at: user.created_at,
    };

    const account = toAccount(((profile as unknown) as ProfileRow | null) || fallbackProfile, role);
    // Sign avatar URL for immediate render.
    if (account.avatarUrl) {
      const { data: signed } = await sb.storage.from("avatars").createSignedUrl(account.avatarUrl, 60 * 60 * 6);
      account.avatarSignedUrl = signed?.signedUrl ?? null;
    }
    primeUserProfile({
      userId: account.id,
      name: account.username,
      avatarUrl: account.avatarUrl ?? null,
      avatarSignedUrl: account.avatarSignedUrl ?? null,
      badgeColor: account.badgeColor ?? null,
      badgeGradient: account.badgeGradient ?? null,
    });
    setCurrentUser(account);
  }, []);

  const loadUsers = useCallback(async (isAdmin: boolean) => {
    if (!isAdmin) return;

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id,email,display_name,created_at,avatar_url,badge_color,badge_gradient").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id,role"),
    ]);

    const roleByUser = new Map((roles as RoleRow[] | null)?.map((row) => [row.user_id, row.role]) || []);
    setUsers((((profiles as unknown) as ProfileRow[] | null) || []).map((profile) => toAccount(profile, roleByUser.get(profile.user_id))));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthUser(nextSession?.user ?? null);
      setTimeout(() => {
        loadCurrentUser(nextSession?.user ?? null);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setAuthUser(initialSession?.user ?? null);
      loadCurrentUser(initialSession?.user ?? null).finally(() => setIsInitialized(true));
    });

    return () => subscription.unsubscribe();
  }, [loadCurrentUser]);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    loadUsers(isAdmin);
  }, [isAdmin, loadUsers]);

  const signup = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    const redirect = nextRedirect() ?? window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirect,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    const next = nextRedirect();
    if (next) window.location.href = next;
    return { success: true };
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const redirect = nextRedirect() ?? window.location.origin;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirect });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
    setCurrentUser(null);
    setUsers([]);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await supabase.from("profiles").delete().eq("user_id", id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const updateDisplayName = useCallback(async (name: string): Promise<AuthResult> => {
    if (!authUser) return { success: false, error: "Not signed in" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Name cannot be empty" };

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", authUser.id);
    if (error) return { success: false, error: error.message };

    await supabase.auth.updateUser({ data: { display_name: trimmed } });

    setCurrentUser(prev => prev ? { ...prev, username: trimmed } : prev);
    setUsers(prev => prev.map(u => u.id === authUser.id ? { ...u, username: trimmed } : u));
    primeUserProfile({ userId: authUser.id, name: trimmed });
    return { success: true };
  }, [authUser]);

  const updateBadgeAppearance = useCallback(async (patch: {
    badgeColor?: string | null;
    badgeGradient?: BadgeGradient | null;
  }): Promise<AuthResult> => {
    if (!authUser) return { success: false, error: "Not signed in" };
    const payload: { badge_color?: string | null; badge_gradient?: BadgeGradient | null } = {};
    if ("badgeColor" in patch) payload.badge_color = patch.badgeColor;
    if ("badgeGradient" in patch) payload.badge_gradient = patch.badgeGradient;
    const { error } = await supabase
      .from("profiles")
      .update(payload as never)
      .eq("user_id", authUser.id);
    if (error) return { success: false, error: error.message };
    setCurrentUser(prev => prev ? { ...prev, ...patch } : prev);
    primeUserProfile({ userId: authUser.id, ...patch });
    return { success: true };
  }, [authUser]);

  const uploadAvatar = useCallback(async (file: File): Promise<AuthResult> => {
    if (!authUser) return { success: false, error: "Not signed in" };
    if (file.size > 200 * 1024) return { success: false, error: "Image must be 200KB or smaller." };
    if (!file.type.startsWith("image/")) return { success: false, error: "File must be an image." };
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${authUser.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) return { success: false, error: upErr.message };
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", authUser.id);
    if (dbErr) return { success: false, error: dbErr.message };
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 6);
    const signedUrl = signed?.signedUrl ?? null;
    setCurrentUser(prev => prev ? { ...prev, avatarUrl: path, avatarSignedUrl: signedUrl } : prev);
    primeUserProfile({ userId: authUser.id, avatarUrl: path, avatarSignedUrl: signedUrl });
    await refreshUserProfile(authUser.id);
    return { success: true };
  }, [authUser]);

  const removeAvatar = useCallback(async (): Promise<AuthResult> => {
    if (!authUser) return { success: false, error: "Not signed in" };
    const path = currentUser?.avatarUrl;
    if (path) await supabase.storage.from("avatars").remove([path]);
    await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", authUser.id);
    setCurrentUser(prev => prev ? { ...prev, avatarUrl: null, avatarSignedUrl: null } : prev);
    primeUserProfile({ userId: authUser.id, avatarUrl: null, avatarSignedUrl: null });
    return { success: true };
  }, [authUser, currentUser?.avatarUrl]);

  return useMemo(() => ({
    session,
    authUser,
    currentUser,
    users,
    isInitialized,
    needsSetup: false,
    isAdmin,
    signup,
    login,
    loginWithGoogle,
    logout,
    deleteUser,
    updateDisplayName,
    updateBadgeAppearance,
    uploadAvatar,
    removeAvatar,
  }), [session, authUser, currentUser, users, isInitialized, isAdmin, signup, login, loginWithGoogle, logout, deleteUser, updateDisplayName, updateBadgeAppearance, uploadAvatar, removeAvatar]);
}