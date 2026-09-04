"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiClient } from "@/lib/api-client";
import {
  LayoutDashboard,
  Crown,
  Trophy,
  Bell,
  Gift,
  Wallet,
  Settings,
  TrendingUp,
  BarChart3,
  HelpCircle,
  Mail,
  User,
  Menu,
  X,
  LogOut,
  Activity,
  CreditCard,
  Home,
  BookCheck,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tips", label: "Tips", icon: TrendingUp },
  // { href: "/livescores", label: "Live Scores", icon: Activity },
  { href: "/vip", label: "VIP", icon: Crown },
  { href: "/history", label: "History", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  // { href: "/notifications", label: "Notifications", icon: Bell },
  // { href: "/referral", label: "Refer & Earn", icon: Gift },
  // { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/blog", label: "Blog", icon: BookCheck },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const api = useApiClient();
  const [isVIP, setIsVIP] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchVIP = async () => {
      try {
        if (user) {
          const res = await api.get("/vip/status");
          if (!ignore) {
            const has =
              res.success && (res.data as { hasAccess: boolean })?.hasAccess;
            setIsVIP(!!has);
          }
        } else if (!ignore) {
          setIsVIP(false);
        }
      } catch {
        if (!ignore) setIsVIP(false);
      }
    };
    fetchVIP();
    return () => {
      ignore = true;
    };
  }, [user, api]);

  if (!user) return null;

  const menuItems = items;

  const closeSheet = () => setIsOpen(false);
  const toggleSheet = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    closeSheet();
  };

  return (
    <>
      {/* Desktop Sidebar - Vertical List */}
      <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-30">
        <nav className="p-3 space-y-1 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}

          {/* Desktop User Actions */}
          <div className="pt-4 mt-4 border-t border-border space-y-1">
            <Link href="/profile">
              <Button
                variant={pathname === "/profile" ? "default" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant={pathname === "/settings" ? "default" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </nav>
      </aside>

      {/* Mobile - App-Style Control Bar */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-background/95 backdrop-blur border border-primary rounded-2xl shadow-2xl p-2">
          <div className="flex items-center justify-around">
            {/* Dashboard */}
            <Link href="/dashboard" onClick={closeSheet}>
              <button
                className={`p-3 rounded-xl transition-all ${
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <Home className="h-6 w-6" />
              </button>
            </Link>

            {/* Tips */}
            <Link href="/tips" onClick={closeSheet}>
              <button
                className={`p-3 rounded-xl transition-all ${
                  pathname === "/tips"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <TrendingUp className="h-6 w-6" />
              </button>
            </Link>

            {/* Live Scores */}
            {/* <Link href="/livescores" onClick={closeSheet}>
              <button
                className={`p-3 rounded-xl transition-all ${
                  pathname === "/livescores"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <Activity className="h-6 w-6" />
              </button>
            </Link> */}

            {/* VIP/Subscriptions */}
            <Link href={isVIP ? "/vip" : "/subscriptions"} onClick={closeSheet}>
              <button
                className={`p-3 rounded-xl transition-all relative ${
                  pathname === "/subscriptions" || pathname === "/vip"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <CreditCard className="h-6 w-6" />
                {!isVIP && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full animate-pulse" />
                )}
              </button>
            </Link>

            {/* Menu Button */}
            <button
              onClick={toggleSheet}
              className={`p-3 rounded-xl transition-all ${
                isOpen
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <LayoutDashboard className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile - Bottom Sheet Overlay */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={closeSheet}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* Sheet Header */}
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    {user.displayName || "User"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {user.email || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSheet}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sheet Content - Scrollable Grid */}
            <div className="overflow-y-auto max-h-[calc(85vh-10rem)] p-4">
              {/* Menu Items Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {menuItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={closeSheet}>
                      <Card
                        className={`
                          flex flex-col items-center justify-center p-4 min-h-24 
                          transition-all duration-200 active:scale-95 cursor-pointer
                          ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card hover:bg-accent border-border"
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 mb-2 ${
                            active
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium text-center leading-tight ${
                            active
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              {/* User Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-border">
                {user.isAdmin && (
                  <Link href="/admin" onClick={closeSheet}>
                    <Button
                      variant="default"
                      className="w-full justify-start gap-3 h-12"
                    >
                      <Crown className="h-5 w-5" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                <Link href="/profile" onClick={closeSheet}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </Button>
                </Link>
                <Link href="/settings" onClick={closeSheet}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
