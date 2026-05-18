"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  TrendingUp,
  Settings,
  LogOut,
  BarChart3,
  Menu,
  X,
  Home,
  HelpCircle,
  Mail,
  Activity,
  BookOpen,
  Crown,
} from "lucide-react";
import { Icon } from "@/components/logo";
// import { NotificationSystem } from "@/components/notification-system";
import { useApiClient } from "@/lib/api-client";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const api = useApiClient();
  const [isVIP, setIsVIP] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchVIP = async () => {
      try {
        if (user && !user.guest) {
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

  // Don't show regular navbar on admin routes - admin has its own navbar
  const isAdminRoute = pathname?.startsWith("/admin");
  if (isAdminRoute) return null;

  const isActive = (path: string) => pathname === path;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Navigation items for non-authenticated users only
  const publicNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/vip", label: "VIP", icon: Crown },
    { href: "/tips", label: "Tips", icon: TrendingUp },
    // { href: "/livescores", label: "Live Scores", icon: Activity },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/help", label: "Help", icon: HelpCircle },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center space-x-2"
            onClick={closeMobileMenu}
          >
            <div className="h-4 flex relative">
              <Icon />
              <span className="text-xl font-bold">ScoreFusion</span>
            </div>
          </Link>

          {/* Desktop Navigation Links (only show for non-authenticated users) */}
          {!user && (
            <div className="hidden lg:flex items-center space-x-1">
              {publicNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}

          {/* Logged in user - show welcome message on desktop */}
          {user && (
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Welcome, {user.displayName || "User"}</span>
              {user.guest && (
                <span className="text-xs bg-secondary px-2 py-1 rounded">
                  Guest
                </span>
              )}
            </div>
          )}

          {/* Right side - Auth & Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Notifications for logged in users */}
            {/* {user && !user.guest && (
              <NotificationSystem user={user} isVIP={isVIP} />
            )} */}
            <ThemeToggle />
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden lg:inline">
                        {user.displayName || "Account"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.displayName || "User"}
                        </p>
                        {user.email && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                        {user.guest && (
                          <p className="text-xs text-primary">Guest Account</p>
                        )}
                        {user.role === "ADMIN" && (
                          <p className="text-xs text-primary">Administrator</p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === "ADMIN" && (
                      <>
                        <Link href="/admin">
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Admin Panel</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!user.guest && (
                      <>
                        <Link href="/profile">
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                          <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user.guest && (
                      <>
                        <Link href="/signup">
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Create Account</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={logout}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Menu Button - only show for non-authenticated users */}
            {!user && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu - Only for non-authenticated users */}
        {mobileMenuOpen && !user && (
          <div className="lg:hidden border-t border-border">
            <div className="py-4 space-y-1">
              {/* Public Nav Items - only show when not logged in */}
              {publicNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                >
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}

              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <Link href="/login" onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={closeMobileMenu}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
