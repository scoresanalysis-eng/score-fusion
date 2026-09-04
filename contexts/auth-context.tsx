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
  createdAt?: string;
  role?: string;
}

export class SignupError extends Error {
  fieldErrors?: Record<string, string>;
  code?: string;
  constructor(message: string, fieldErrors?: Record<string, string>, code?: string) {
    super(message);
    this.name = "SignupError";
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    callbackUrl?: string,
  ) => Promise<void>;
  signup: (data: SignupData, callbackUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface SignupData {
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
  botGuard?: {
    website?: string;
    company?: string;
    phone?: string;
    formStartedAt?: number;
  };
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
  };

  const user: User | null = useMemo(() => {
    if (status !== "authenticated" || !session?.user) {
      return null;
    }

    const u = session.user as unknown as SessionUser;
    return {
      id: u.id,
      email: u.email || undefined,
      displayName: u.displayName || u.name || null,
      isAdmin: u.isAdmin ?? false,
      role: u.role,
    };
  }, [session, status]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe = false,
      callbackUrl?: string,
    ) => {
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
      try {
        const userResponse = await fetch("/api/auth/me");
        const userData = await userResponse.json();

        toast({
          title: "Welcome back!",
          description: `Logged in as ${email}`,
        });

        if (userData.success && userData.user?.role === "ADMIN") {
          router.push(callbackUrl && callbackUrl.startsWith("/admin") ? callbackUrl : "/admin");
        } else {
          router.push(
            callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("/login") && !callbackUrl.startsWith("/signup")
              ? callbackUrl
              : "/dashboard"
          );
        }
      } catch {
        router.push(
          callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("/login") && !callbackUrl.startsWith("/signup")
            ? callbackUrl
            : "/dashboard"
        );
      }
    },
    [router],
  );

  const signup = useCallback(
    async (data: SignupData, callbackUrl?: string) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result?.error || "Signup failed";
        // Only show toast for non-field-level errors (field errors are shown inline)
        const hasOnlyFieldErrors =
          result?.fieldErrors &&
          Object.keys(result.fieldErrors).length > 0 &&
          !result?.code;
        if (!hasOnlyFieldErrors) {
          toast({
            variant: "destructive",
            title: "Signup failed",
            description: message,
          });
        }
        throw new SignupError(message, result?.fieldErrors, result?.code);
      }

      // Auto sign-in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (signInRes?.error) {
        toast({
          title: "Account created!",
          description: "Please sign in with your credentials.",
        });
        router.push(
          `/login?email=${encodeURIComponent(data.email)}&signedUp=true${
            callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
          }`,
        );
        return;
      }

      toast({
        title: "Account created!",
        description: `Welcome, ${data.displayName}!`,
      });

      const target =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("/login") && !callbackUrl.startsWith("/signup")
          ? callbackUrl
          : "/dashboard";
      router.push(target);
    },
    [router],
  );

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
    refreshUser,
  };

  return ctx;
}

