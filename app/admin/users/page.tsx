"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Ban,
  CheckCircle,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  DollarSign,
  CreditCard,
  TrendingUp,
  Users,
  Calendar,
  Loader2,
} from "lucide-react";

interface Subscription {
  plan: string;
  currentPeriodEnd: string;
}

interface Wallet {
  balance: number | string;
  tokens: number;
  bonusTokens?: number;
  totalEarned?: number | string;
  totalWithdrawn?: number | string;
}

interface Profile {
  country?: string | null;
  selfExclusionUntil?: string | null;
  marketingConsent?: boolean;
  analyticsConsent?: boolean;
}

interface User {
  id: string;
  email: string | null;
  displayName?: string | null;
  name?: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
  _count?: {
    bets: number;
    referredUsers: number;
  };
  totalBets?: number;
  totalReferrals?: number;
  betWinRate?: number;
  totalEarnings?: number;
  vipStatus?: boolean;
  subscriptionPlan?: string | null;
  subscriptions?: Subscription[];
  wallet?: Wallet | null;
  profile?: Profile | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

interface DialogState {
  open: boolean;
  type: "ban" | "unban" | "makeAdmin" | "delete" | null;
  user: User | null;
  reason?: string;
}

interface EditFormData {
  displayName: string;
  email: string;
  country: string;
  subscriptionPlan: string;
  subscriptionDuration: number;
  walletAdjustment: number;
  walletReason: string;
  walletType: "bonus" | "penalty" | "refund";
  vipTokens: number;
  tokenExpiration: number;
  tokenReason: string;
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "banned">("all");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
    totalPages: 0,
  });
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    type: null,
    user: null,
    reason: "",
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    displayName: "",
    email: "",
    country: "",
    subscriptionPlan: "",
    subscriptionDuration: 30,
    walletAdjustment: 0,
    walletReason: "",
    walletType: "bonus",
    vipTokens: 0,
    tokenExpiration: 30,
    tokenReason: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pagination.page, filter]);

  const fetchUsers = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) {
        params.append("search", search);
      }

      if (filter === "active") {
        params.append("status", "active");
      } else if (filter === "banned") {
        params.append("status", "banned");
      }

      const res = await fetch(`/api/admin/users?${params}`);
      const response = await res.json();

      if (!res.ok) {
        setError(response.error || `Failed to fetch users: ${res.status}`);
        return;
      }

      const usersList = response.data?.users || response.users || [];
      const paginationData = response.data?.pagination || {};

      setUsers(usersList);
      setPagination(paginationData);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    const debounceTimer = setTimeout(() => {
      fetchUsers(value);
    }, 500);
    return () => clearTimeout(debounceTimer);
  };

  const openDialog = (
    type: "ban" | "unban" | "makeAdmin" | "delete",
    user: User
  ) => {
    setDialogState({ open: true, type, user, reason: "" });
  };

  const closeDialog = () => {
    setDialogState({ open: false, type: null, user: null, reason: "" });
  };

  const confirmAction = async () => {
    if (!dialogState.user || !dialogState.type) return;

    setActionLoading(true);
    try {
      switch (dialogState.type) {
        case "ban":
          await handleBanUser(dialogState.user.id, true);
          break;
        case "unban":
          await handleBanUser(dialogState.user.id, false);
          break;
        case "makeAdmin":
          await handleMakeAdmin(dialogState.user.id);
          break;
        case "delete":
          await handleDeleteUser(dialogState.user.id);
          break;
      }
      closeDialog();
      fetchUsers();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        status: ban ? "BANNED" : "ACTIVE",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update user status");
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        role: "ADMIN",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update user role");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      throw new Error("Failed to delete user");
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      displayName: user.displayName || user.name || "",
      email: user.email || "",
      country: user.profile?.country || "",
      subscriptionPlan: user.subscriptionPlan || "",
      subscriptionDuration: 30,
      walletAdjustment: 0,
      walletReason: "",
      walletType: "bonus",
      vipTokens: 0,
      tokenExpiration: 30,
      tokenReason: "",
    });
    setIsEditing(false);
    setSheetOpen(true);
  };

  const handleSubscriptionAction = async (
    action: "create" | "cancel" | "extend"
  ) => {
    if (!selectedUser) return;

    setSubscriptionLoading(true);
    try {
      const payload: {
        userId: string;
        action: "create" | "cancel" | "extend";
        plan?: "monthly" | "yearly" | "trial";
        durationDays?: number;
      } = {
        userId: selectedUser.id,
        action,
      };

      if (action === "create") {
        payload.plan = editFormData.subscriptionPlan as
          | "monthly"
          | "yearly"
          | "trial";
      }

      if (action === "extend") {
        payload.durationDays = editFormData.subscriptionDuration;
      }

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to manage subscription");
      }

      // Refresh user data
      fetchUsers();
      setSheetOpen(false);
    } catch (error) {
      console.error("Subscription action failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to manage subscription"
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleGenerateTokens = async () => {
    if (!selectedUser || editFormData.vipTokens <= 0) return;

    setTokenLoading(true);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          quantity: editFormData.vipTokens,
          type: "general",
          expirationDays: editFormData.tokenExpiration,
          reason: editFormData.tokenReason || "Admin generated",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate tokens");
      }

      alert(
        `Successfully generated ${editFormData.vipTokens} VIP token${
          editFormData.vipTokens > 1 ? "s" : ""
        }`
      );

      // Reset token fields
      setEditFormData({
        ...editFormData,
        vipTokens: 0,
        tokenReason: "",
      });

      // Refresh user data
      fetchUsers();
    } catch (error) {
      console.error("Token generation failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate tokens"
      );
    } finally {
      setTokenLoading(false);
    }
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const updateData: {
        displayName?: string;
        email?: string;
        profile?: { country: string };
        walletAdjustment?: {
          amount: number;
          reason: string;
          type: "bonus" | "penalty" | "refund";
        };
      } = {};

      if (editFormData.displayName !== selectedUser.displayName) {
        updateData.displayName = editFormData.displayName;
      }

      if (editFormData.email !== selectedUser.email) {
        updateData.email = editFormData.email;
      }

      if (editFormData.country !== selectedUser.profile?.country) {
        updateData.profile = {
          country: editFormData.country,
        };
      }

      if (editFormData.walletAdjustment !== 0) {
        updateData.walletAdjustment = {
          amount: editFormData.walletAdjustment,
          reason: editFormData.walletReason,
          type: editFormData.walletType,
        };
      }

      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        throw new Error("Failed to update user");
      }

      setSheetOpen(false);
      setIsEditing(false);
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user edits:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "all") return true;
    if (filter === "active") return u.status === "ACTIVE";
    if (filter === "banned") return u.status === "BANNED";
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-destructive mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => fetchUsers()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user?.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Search and Filters */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Users Management</h1>

          {/* Search Bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              className="pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => {
                setFilter("all");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              All ({pagination.total})
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => {
                setFilter("active");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Active
            </Button>
            <Button
              variant={filter === "banned" ? "default" : "outline"}
              onClick={() => {
                setFilter("banned");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Banned
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Users List */}
        {!loading && (
          <>
            <div className="space-y-4">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">
                            {u.displayName ||
                              u.name ||
                              u.email ||
                              "Unknown User"}
                          </h3>
                          {u.role === "ADMIN" && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {u.vipStatus && (
                            <Badge className="bg-yellow-500 text-white">
                              VIP
                            </Badge>
                          )}
                          <Badge
                            className={
                              u.status === "ACTIVE"
                                ? "bg-green-500 text-white"
                                : u.status === "BANNED"
                                ? "bg-destructive"
                                : "bg-border"
                            }
                          >
                            {u.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">
                          {u.email || "No email"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {u.totalBets || u._count?.bets || 0} bets
                          </span>
                          {u.betWinRate !== undefined && (
                            <span className="flex items-center gap-1">
                              Win Rate: {u.betWinRate.toFixed(1)}%
                            </span>
                          )}
                          {u.wallet && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />$
                              {Number(u.wallet.balance).toFixed(2)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {u.totalReferrals ||
                              u._count?.referredUsers ||
                              0}{" "}
                            referrals
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUserDetails(u)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {u.role !== "ADMIN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog("makeAdmin", u)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Admin
                          </Button>
                        )}
                        {u.status === "ACTIVE" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog("ban", u)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Ban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog("unban", u)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Unban
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog("delete", u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredUsers.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No users found with the selected filter.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} users
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        const pageNum =
                          pagination.page <= 3
                            ? i + 1
                            : Math.min(
                                pagination.page - 2 + i,
                                pagination.totalPages - 4 + i
                              );
                        return (
                          <Button
                            key={pageNum}
                            variant={
                              pagination.page === pageNum
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: pageNum,
                              }))
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasMore}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === "ban" && "Ban User"}
              {dialogState.type === "unban" && "Unban User"}
              {dialogState.type === "makeAdmin" && "Make Admin"}
              {dialogState.type === "delete" && "Delete User"}
            </DialogTitle>
            <DialogDescription>
              {dialogState.type === "ban" &&
                "Are you sure you want to ban this user? They will not be able to access the platform."}
              {dialogState.type === "unban" &&
                "Are you sure you want to unban this user? They will regain access to the platform."}
              {dialogState.type === "makeAdmin" &&
                "Are you sure you want to make this user an admin? They will have full administrative privileges."}
              {dialogState.type === "delete" &&
                "Are you sure you want to delete this user? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading}
              variant={
                dialogState.type === "delete" || dialogState.type === "ban"
                  ? "destructive"
                  : "default"
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Edit className="h-5 w-5" />
                      Edit User
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5" />
                      User Details
                    </>
                  )}
                </SheetTitle>
                <SheetDescription>
                  {isEditing
                    ? "Make changes to user information and subscription"
                    : "View detailed information about this user"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {!isEditing ? (
                  <>
                    {/* View Mode */}
                    <div>
                      <h3 className="font-semibold mb-2">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Name</Label>
                          <p className="font-medium">
                            {selectedUser.displayName ||
                              selectedUser.name ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">
                            {selectedUser.email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            Country
                          </Label>
                          <p className="font-medium">
                            {selectedUser.profile?.country || "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            User ID
                          </Label>
                          <p className="font-mono text-xs">{selectedUser.id}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Status & Role</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge
                          className={
                            selectedUser.status === "ACTIVE"
                              ? "bg-green-500 text-white"
                              : "bg-destructive"
                          }
                        >
                          {selectedUser.status}
                        </Badge>
                        {selectedUser.role === "ADMIN" && (
                          <Badge className="bg-primary">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {selectedUser.vipStatus && (
                          <Badge className="bg-yellow-500 text-white">
                            VIP Member
                          </Badge>
                        )}
                      </div>
                    </div>

                    {selectedUser.wallet && (
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Wallet
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Balance
                            </span>
                            <span className="font-medium">
                              ${Number(selectedUser.wallet.balance).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Tokens
                            </span>
                            <span className="font-medium">
                              {selectedUser.wallet.tokens}
                            </span>
                          </div>
                          {selectedUser.wallet.bonusTokens !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Bonus Tokens
                              </span>
                              <span className="font-medium">
                                {selectedUser.wallet.bonusTokens}
                              </span>
                            </div>
                          )}
                          {selectedUser.wallet.totalEarned !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Total Earned
                              </span>
                              <span className="font-medium">
                                $
                                {Number(
                                  selectedUser.wallet.totalEarned
                                ).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold mb-2">Activity Stats</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Total Bets
                          </span>
                          <span className="font-medium">
                            {selectedUser.totalBets ||
                              selectedUser._count?.bets ||
                              0}
                          </span>
                        </div>
                        {selectedUser.betWinRate !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Win Rate
                            </span>
                            <span className="font-medium">
                              {selectedUser.betWinRate.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Referrals
                          </span>
                          <span className="font-medium">
                            {selectedUser.totalReferrals ||
                              selectedUser._count?.referredUsers ||
                              0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Member Since
                          </span>
                          <span className="font-medium">
                            {new Date(
                              selectedUser.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedUser.subscriptionPlan && (
                      <div>
                        <h3 className="font-semibold mb-2">Subscription</h3>
                        <Badge className="bg-primary">
                          {selectedUser.subscriptionPlan}
                        </Badge>
                        {selectedUser.subscriptions &&
                          selectedUser.subscriptions[0] && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Expires:{" "}
                              {new Date(
                                selectedUser.subscriptions[0].currentPeriodEnd
                              ).toLocaleDateString()}
                            </p>
                          )}
                      </div>
                    )}

                    <div className="pt-4">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={editFormData.displayName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              displayName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={editFormData.country}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              country: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">
                          Wallet Adjustment
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="walletType">Adjustment Type</Label>
                            <Select
                              value={editFormData.walletType}
                              onValueChange={(
                                value: "bonus" | "penalty" | "refund"
                              ) =>
                                setEditFormData({
                                  ...editFormData,
                                  walletType: value,
                                })
                              }
                            >
                              <SelectTrigger id="walletType">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bonus">Bonus</SelectItem>
                                <SelectItem value="penalty">Penalty</SelectItem>
                                <SelectItem value="refund">Refund</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="walletAdjustment">Amount ($)</Label>
                            <Input
                              id="walletAdjustment"
                              type="number"
                              step="0.01"
                              value={editFormData.walletAdjustment}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  walletAdjustment:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="walletReason">Reason</Label>
                            <Input
                              id="walletReason"
                              value={editFormData.walletReason}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  walletReason: e.target.value,
                                })
                              }
                              placeholder="Reason for adjustment"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subscription Management */}
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Subscription Management
                        </h3>
                        <div className="space-y-3">
                          {!selectedUser.vipStatus ? (
                            <>
                              <div>
                                <Label htmlFor="subscriptionPlan">
                                  Create Subscription
                                </Label>
                                <Select
                                  value={editFormData.subscriptionPlan}
                                  onValueChange={(value) =>
                                    setEditFormData({
                                      ...editFormData,
                                      subscriptionPlan: value,
                                    })
                                  }
                                >
                                  <SelectTrigger id="subscriptionPlan">
                                    <SelectValue placeholder="Select plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="trial">
                                      Trial (7 days)
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      Monthly
                                    </SelectItem>
                                    <SelectItem value="yearly">
                                      Yearly
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={() =>
                                  handleSubscriptionAction("create")
                                }
                                disabled={
                                  subscriptionLoading ||
                                  !editFormData.subscriptionPlan
                                }
                                className="w-full"
                                variant="outline"
                              >
                                {subscriptionLoading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Create Subscription
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="bg-secondary/50 p-3 rounded-lg">
                                <p className="text-sm font-medium">
                                  Current Plan:{" "}
                                  <Badge className="ml-1">
                                    {selectedUser.subscriptionPlan}
                                  </Badge>
                                </p>
                                {selectedUser.subscriptions &&
                                  selectedUser.subscriptions[0] && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Expires:{" "}
                                      {new Date(
                                        selectedUser.subscriptions[0].currentPeriodEnd
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                              </div>

                              <div>
                                <Label htmlFor="subscriptionDuration">
                                  Extend by (days)
                                </Label>
                                <Input
                                  id="subscriptionDuration"
                                  type="number"
                                  min="1"
                                  value={editFormData.subscriptionDuration}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      subscriptionDuration:
                                        parseInt(e.target.value) || 30,
                                    })
                                  }
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() =>
                                    handleSubscriptionAction("extend")
                                  }
                                  disabled={subscriptionLoading}
                                  className="flex-1"
                                  variant="outline"
                                >
                                  {subscriptionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Calendar className="h-4 w-4 mr-2" />
                                  )}
                                  Extend
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleSubscriptionAction("cancel")
                                  }
                                  disabled={subscriptionLoading}
                                  className="flex-1"
                                  variant="destructive"
                                >
                                  {subscriptionLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Ban className="h-4 w-4 mr-2" />
                                  )}
                                  Cancel
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* VIP Token Generation */}
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          VIP Token Generation
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="vipTokens">Number of Tokens</Label>
                            <Input
                              id="vipTokens"
                              type="number"
                              min="1"
                              max="100"
                              value={editFormData.vipTokens}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  vipTokens: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="tokenExpiration">
                              Expiration (days)
                            </Label>
                            <Input
                              id="tokenExpiration"
                              type="number"
                              min="1"
                              value={editFormData.tokenExpiration}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  tokenExpiration:
                                    parseInt(e.target.value) || 30,
                                })
                              }
                            />
                          </div>

                          <div>
                            <Label htmlFor="tokenReason">
                              Reason (Optional)
                            </Label>
                            <Input
                              id="tokenReason"
                              value={editFormData.tokenReason}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  tokenReason: e.target.value,
                                })
                              }
                              placeholder="e.g., Promotional reward"
                            />
                          </div>

                          <Button
                            onClick={handleGenerateTokens}
                            disabled={
                              tokenLoading || editFormData.vipTokens <= 0
                            }
                            className="w-full"
                            variant="outline"
                          >
                            {tokenLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Generate {editFormData.vipTokens || 0} Token
                                {editFormData.vipTokens !== 1 ? "s" : ""}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveUserEdits}
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
