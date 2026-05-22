import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { UserAccount } from "@/types/settings";

type AuthResult = { success: boolean; error?: string };

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
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
});

const getDisplayName = (user: User | null) => {
  if (!user) return "";
  return user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || user.email || "User";
};

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
      .select("user_id,email,display_name,created_at")
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

    setCurrentUser(toAccount((profile as ProfileRow | null) || fallbackProfile, role));
  }, []);

  const loadUsers = useCallback(async (isAdmin: boolean) => {
    if (!isAdmin) return;

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id,email,display_name,created_at").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id,role"),
    ]);

    const roleByUser = new Map((roles as RoleRow[] | null)?.map((row) => [row.user_id, row.role]) || []);
    setUsers(((profiles as ProfileRow[] | null) || []).map((profile) => toAccount(profile, roleByUser.get(profile.user_id))));
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
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
  }), [session, authUser, currentUser, users, isInitialized, isAdmin, signup, login, loginWithGoogle, logout, deleteUser]);
}