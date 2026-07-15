import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { setToken, getToken } from "@/lib/session";
import type { PublicUser } from "@shared/schema";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    fullName?: string;
    city?: string;
    country?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: user, refetch } = useQuery<PublicUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      if (!getToken()) return null;
      try {
        const res = await fetch("/api/auth/me", {
          headers: { "x-session-token": getToken() || "" },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user as PublicUser;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      setToken(data.token);
      await refetch();
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

  const register = useCallback(async (data: {
    email: string;
    username: string;
    password: string;
    fullName?: string;
    city?: string;
    country?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", data);
      const json = await res.json();
      setToken(json.token);
      await refetch();
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    setToken(null);
    queryClient.clear();
    await refetch();
  }, [refetch, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
