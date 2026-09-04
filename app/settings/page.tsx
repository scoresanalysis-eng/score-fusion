"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/theme-context";

// ─── Password card — extracted so it can manage its own state cleanly ────────

function PasswordCard({ userEmail }: { userEmail?: string }) {
  // Whether this account has a password already (false = Google-only)
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch whether user has a password set
  const fetchHasPassword = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setHasPassword(data?.user?.hasPassword ?? false);
    } catch {
      setHasPassword(false);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  useEffect(() => {
    fetchHasPassword();
  }, [fetchHasPassword]);

  // Password strength helpers
  const strengthChecks = [
    { label: "At least 8 characters", pass: newPassword.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(newPassword) },
    { label: "Lowercase letter", pass: /[a-z]/.test(newPassword) },
    { label: "Number", pass: /\d/.test(newPassword) },
  ];
  const allStrengthPassed = strengthChecks.every((c) => c.pass);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (hasPassword && !currentPassword) {
      errors.currentPassword = "Please enter your current password";
    }

    if (!newPassword) {
      errors.newPassword = "Please enter a new password";
    } else if (!allStrengthPassed) {
      errors.newPassword = "Password does not meet requirements";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const body: Record<string, string> = {
        newPassword,
        confirmPassword,
      };
      if (hasPassword) {
        body.currentPassword = currentPassword;
      }

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data?.error?.message || "Failed to update password. Please try again.");
      } else {
        setSuccessMsg(data?.data?.message || "Password updated successfully.");
        // Reset form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFieldErrors({});
        // After setting a password for the first time, reflect updated state
        if (!hasPassword) {
          setHasPassword(true);
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInfo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasPassword ? (
            <>
              <Lock className="h-5 w-5" />
              Change Password
            </>
          ) : (
            <>
              <KeyRound className="h-5 w-5" />
              Set a Password
            </>
          )}
        </CardTitle>
        <CardDescription>
          {hasPassword
            ? "Update the password used to sign in to your account."
            : "Your account was created with Google. Add a password so you can also sign in with your email and password."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {successMsg && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Current password — only for existing password users */}
          {hasPassword && (
            <div className="space-y-1.5">
              <Label
                htmlFor="currentPassword"
                className={fieldErrors.currentPassword ? "text-destructive" : ""}
              >
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Your current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.currentPassword)
                      setFieldErrors((p) => { const c = { ...p }; delete c.currentPassword; return c; });
                    if (errorMsg) setErrorMsg("");
                  }}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className={`pr-10 ${fieldErrors.currentPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent((v) => !v)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {fieldErrors.currentPassword}
                </p>
              )}
            </div>
          )}

          {/* New password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="newPassword"
              className={fieldErrors.newPassword ? "text-destructive" : ""}
            >
              {hasPassword ? "New Password" : "Password"}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword)
                    setFieldErrors((p) => { const c = { ...p }; delete c.newPassword; return c; });
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
                className={`pr-10 ${fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fieldErrors.newPassword}
              </p>
            )}

            {/* Strength checklist — appears once user starts typing */}
            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {strengthChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs ${check.pass ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                  >
                    <CheckCircle2 className={`h-3 w-3 ${check.pass ? "opacity-100" : "opacity-30"}`} />
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className={fieldErrors.confirmPassword ? "text-destructive" : ""}
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword)
                    setFieldErrors((p) => { const c = { ...p }; delete c.confirmPassword; return c; });
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
                className={`pr-10 ${fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fieldErrors.confirmPassword}
              </p>
            ) : (
              confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Passwords match
                </p>
              )
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {hasPassword ? "Updating..." : "Setting password..."}
              </span>
            ) : hasPassword ? (
              "Update Password"
            ) : (
              "Set Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main settings page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">Customize your experience</p>

          <div className="grid gap-6">
            {/* Password management */}
            <PasswordCard userEmail={user.email} />

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications for new tips</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive emails about tips and updates</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>VIP Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when new VIP tips are posted</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5" />
                </div>
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-muted-foreground">
                    Current theme: <span className="capitalize font-medium">{theme}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={toggleTheme}>
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advanced */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-refresh Live Scores</Label>
                    <p className="text-sm text-muted-foreground">Automatically update match scores</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Analytics Tracking</Label>
                    <p className="text-sm text-muted-foreground">Help us improve the platform</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
