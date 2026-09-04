"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Admin has its own layout with its own sidebar
  const isAdminRoute = pathname?.startsWith("/admin");

  // Only show the app sidebar for authenticated users on non-admin routes
  const hasSidebar = !!user && !isAdminRoute;

  return (
    <div className={hasSidebar ? "lg:pl-64 pb-24 md:pb-0" : undefined}>
      {!isAdminRoute && <AppSidebar />}
      {children}
    </div>
  );
}
