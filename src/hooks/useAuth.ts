import { useState, useEffect, useCallback } from "react";
import { UserAccount } from "@/types/settings";

const USERS_KEY = "eisenhower-users";
const SESSION_KEY = "eisenhower-session";

const loadUsers = (): UserAccount[] => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveUsers = (users: UserAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export function useAuth() {
  const [users, setUsers] = useState<UserAccount[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // If no users exist, we need setup
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  const signup = useCallback((username: string, password: string, role: "admin" | "user" = "user"): { success: boolean; error?: string } => {
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: "Username already exists" };
    }
    const newUser: UserAccount = {
      id: crypto.randomUUID(),
      username,
      password,
      role,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    setUsers(updated);
    setCurrentUser(newUser);
    return { success: true };
  }, [users]);

  const login = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }
    setCurrentUser(user);
    return { success: true };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const needsSetup = users.length === 0;
  const isAdmin = currentUser?.role === "admin";

  return {
    currentUser,
    users,
    isInitialized,
    needsSetup,
    isAdmin,
    signup,
    login,
    logout,
    deleteUser,
  };
}
