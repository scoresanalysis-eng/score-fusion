"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || user.guest)) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    // Validate password strength
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
        credentials: "include", // Include cookies for session authentication
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to change password");
      }

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");

    if (!deletePassword.trim()) {
      setDeleteError("Enter your current password to delete the account");
      return;
    }

    const confirmed = window.confirm(
      "Delete this account permanently? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const response = await fetch("/api/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: deletePassword }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete account");
      }

      await signOut({ callbackUrl: "/login?deleted=1" });
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete account",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || user.guest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage your account details and preferences
          </p>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    defaultValue={user.displayName || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email || ""}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters with uppercase, lowercase,
                      and number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  No active subscription
                </p>
                <Button variant="outline">Manage Subscription</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsible Gaming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Daily Betting Limit</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    placeholder="No limit set"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cooldown">Cooldown Period (hours)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    placeholder="No cooldown"
                  />
                </div>
                <Button variant="outline">Update Limits</Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This permanently deletes your account, clears your profile
                  data, and signs you out everywhere.
                </p>
                {deleteError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {deleteError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="deletePassword">Current Password</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
