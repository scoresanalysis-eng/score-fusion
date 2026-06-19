"use client";

import React, { useCallback, useMemo } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

export interface User {
  id: string;
  email?: string;
  displayName?: string | null;
  isAdmin: boolean;
  guest: boolean;
  createdAt?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  guestLogin: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  displayName: string;
  country?: string;
  dob?: string;
  referralCode?: string;
  consents?: {
    analytics: boolean;
    marketing: boolean;
    essential: boolean;
  };
  turnstileToken?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  type SessionUser = {
    id: string;
    email?: string | null;
    name?: string | null;
    displayName?: string | null;
    isAdmin?: boolean;
    role: string;
    guest?: boolean;
  };

  const user: User | null = useMemo(() => {
    console.log("🔐 [Auth Context] Computing user from session:", {
      status,
      hasSession: !!session,
      sessionUser: session?.user,
    });

    if (status !== "authenticated" || !session?.user) {
      console.log("🔐 [Auth Context] No authenticated user");
      return null;
    }

    const u = session.user as unknown as SessionUser;
    const computedUser = {
      id: u.id,
      email: u.email || undefined,
      displayName: u.displayName || u.name || null,
      isAdmin: u.isAdmin ?? false,
      guest: u.guest ?? false,
      role: u.role,
    };

    console.log("🔐 [Auth Context] Computed user:", computedUser);
    return computedUser;
  }, [session, status]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        rememberMe,
      });
      if (!res || res.error) {
        const message =
          res?.error === "CredentialsSignin"
            ? "Invalid email or password"
            : res?.error || "Login failed";
        toast({
          variant: "destructive",
          title: "Login failed",
          description: message,
        });
        throw new Error(message);
      }

      // Fetch user data to determine redirect
      const userResponse = await fetch("/api/auth/me");
      const userData = await userResponse.json();

      toast({
        title: "Welcome back!",
        description: `Logged in as ${email}`,
      });

      // Redirect based on role
      if (userData.success && userData.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    },
    [router],
  );

  const signup = useCallback(
    async (data: SignupData) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result?.error || "Signup failed";
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: message,
        });
        throw new Error(message);
      }
      await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });
      toast({
        title: "Account created!",
        description: `Welcome, ${data.displayName}!`,
      });

      // New users are not admins, so always go to dashboard
      router.push("/dashboard");
    },
    [router],
  );

  const guestLogin = useCallback(async () => {
    const res = await signIn("credentials", { redirect: false, mode: "guest" });
    if (!res || res.error) {
      const message = res?.error || "Guest login failed";
      toast({ variant: "destructive", title: "Error", description: message });
      throw new Error(message);
    }
    toast({
      title: "Guest access enabled",
      description: "Limited access session.",
    });
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    router.push("/");
  }, [router]);

  const refreshUser = useCallback(async () => {
    await update();
  }, [update]);

  const ctx: AuthContextType = {
    user,
    isLoading: status === "loading",
    login,
    signup,
    logout,
    guestLogin,
    refreshUser,
  };

  return ctx;
}
