"use client";
/* eslint-disable @next/next/no-img-element */

import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown,
  Lock,
  Star,
  TrendingUp,
  CheckCircle,
  Target,
  Calendar,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function VIPAreaPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const [hasVIPAccess, setHasVIPAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  type TokenAccess = {
    expiresAt: string;
    remaining: number;
    type: string;
  } | null;
  type SubscriptionData = {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;

  const [entitlements, setEntitlements] = useState<{
    subscription: SubscriptionData;
    tokenAccess: TokenAccess;
  } | null>(null);
  const [tokenCode, setTokenCode] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [vipPredictions, setVipPredictions] = useState<
    Array<{
      id: string;
      title: string;
      summary?: string;
      content: string;
      odds?: number;
      sport: string;
      league?: string;
      homeTeam?: { name: string; logoUrl?: string };
      awayTeam?: { name: string; logoUrl?: string };
      predictedOutcome?: string;
      confidenceLevel?: number;
      ticketSnapshots: string[];
      result?: string;
      matchDate?: string;
      createdAt: string;
      category: "tip" | "update";
      matchResult?: string;
      tipResult?: {
        id: string;
        settledAt: string;
        outcome: string;
        payout?: number;
        createdAt: string;
      };
    }>
  >([]);
  const [vipUpdates, setVipUpdates] = useState<
    Array<{
      id: string;
      title: string;
      summary?: string;
      content: string;
      odds?: number;
      sport: string;
      league?: string;
      homeTeam?: { name: string; logoUrl?: string };
      awayTeam?: { name: string; logoUrl?: string };
      predictedOutcome?: string;
      confidenceLevel?: number;
      ticketSnapshots: string[];
      result?: string;
      matchDate?: string;
      createdAt: string;
      category: "tip" | "update";
      matchResult?: string;
      tipResult?: {
        id: string;
        settledAt: string;
        outcome: string;
        payout?: number;
        createdAt: string;
      };
    }>
  >([]);
  const [historyPredictions, setHistoryPredictions] = useState<
    typeof vipPredictions
  >([]);
  const [historyUpdates, setHistoryUpdates] = useState<typeof vipUpdates>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const router = useRouter();
  const [currentPagePredictions, setCurrentPagePredictions] = useState(1);
  const [currentPageUpdates, setCurrentPageUpdates] = useState(1);
  const [currentPageHistoryPredictions, setCurrentPageHistoryPredictions] =
    useState(1);
  const [currentPageHistoryUpdates, setCurrentPageHistoryUpdates] = useState(1);
  const itemsPerPage = 12;

  const displayedVipPredictions = useMemo(
    () =>
      vipPredictions.slice(
        (currentPagePredictions - 1) * itemsPerPage,
        currentPagePredictions * itemsPerPage,
      ),
    [vipPredictions, currentPagePredictions],
  );

  const displayedVipUpdates = useMemo(
    () =>
      vipUpdates.slice(
        (currentPageUpdates - 1) * itemsPerPage,
        currentPageUpdates * itemsPerPage,
      ),
    [vipUpdates, currentPageUpdates],
  );

  const displayedHistoryPredictions = useMemo(
    () =>
      historyPredictions.slice(
        (currentPageHistoryPredictions - 1) * itemsPerPage,
        currentPageHistoryPredictions * itemsPerPage,
      ),
    [historyPredictions, currentPageHistoryPredictions],
  );

  const displayedHistoryUpdates = useMemo(
    () =>
      historyUpdates.slice(
        (currentPageHistoryUpdates - 1) * itemsPerPage,
        currentPageHistoryUpdates * itemsPerPage,
      ),
    [historyUpdates, currentPageHistoryUpdates],
  );
  const checkVIPAccess = useCallback(async () => {
    console.log("🔍 [VIP Page] Starting VIP access check...");
    console.log("🔍 [VIP Page] Current user:", user);

    try {
      // Check if user has active subscription or valid token
      console.log("🔍 [VIP Page] Calling /vip/status endpoint...");
      const res = await api.get("/vip/status");

      console.log("🔍 [VIP Page] API Response:", {
        success: res.success,
        fullResponse: res,
        hasData: !!res.data,
        dataKeys: res.data ? Object.keys(res.data) : [],
      });

      if (res.success) {
        // /api/vip/status returns { success: true, data: { hasAccess, subscription, tokenAccess } }
        const data = res.data as {
          hasAccess: boolean;
          subscription?: SubscriptionData | null;
          tokenAccess?: TokenAccess | null;
        };

        console.log("🔍 [VIP Page] Parsed data:", data);

        setHasVIPAccess(Boolean(data.hasAccess));
        setEntitlements({
          subscription: data.subscription ?? null,
          tokenAccess: data.tokenAccess ?? null,
        });

        if (data.hasAccess) {
          // console.log("✅ [VIP Page] VIP ACCESS GRANTED!");
        } else {
          // console.log("❌ [VIP Page] VIP ACCESS DENIED");
        }
      } else {
        // console.log("❌ [VIP Page] API call failed:", res.error);
      }
    } catch (error) {
      // console.error("❌ [VIP Page] Error checking VIP access:", error);
    } finally {
      setLoading(false);
      // console.log("🔍 [VIP Page] VIP access check complete.");
    }
  }, [api, user]);

  const fetchVIPPredictions = useCallback(async () => {
    setLoadingPredictions(true);
    setLoadingUpdates(true);
    try {
      const res = await api.get("/predictions?vip=true");
      if (res.success) {
        const data = res.data as { predictions: typeof vipPredictions };
        const predictions = data.predictions || [];

        // Separate tips and updates
        const tips = predictions.filter((p) => p.category === "tip");
        const updates = predictions.filter((p) => p.category === "update");

        // Separate current from history based on match date and result
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const currentTips = tips.filter((p) => {
          if (!p.matchDate) return true; // No match date, show as current
          const matchDate = new Date(p.matchDate);
          return matchDate >= twoHoursAgo && p.result === "pending";
        });

        const historyTips = tips.filter((p) => {
          if (!p.matchDate) return false;
          const matchDate = new Date(p.matchDate);
          return matchDate < twoHoursAgo || p.result !== "pending";
        });

        const currentUpdates = updates.filter((p) => {
          if (!p.matchDate) return true;
          const matchDate = new Date(p.matchDate);
          return matchDate >= twoHoursAgo && p.result === "pending";
        });

        const historyUpdates = updates.filter((p) => {
          if (!p.matchDate) return false;
          const matchDate = new Date(p.matchDate);
          return matchDate < twoHoursAgo || p.result !== "pending";
        });

        setVipPredictions(currentTips);
        setVipUpdates(currentUpdates);
        setHistoryPredictions(historyTips);
        setHistoryUpdates(historyUpdates);
      }
    } catch (error) {
      console.error("Failed to fetch VIP predictions:", error);
    } finally {
      setLoadingPredictions(false);
      setLoadingUpdates(false);
    }
  }, [api]);

  useEffect(() => {
    console.log("🔄 [VIP Page] User effect triggered. User:", user);
    // Only run check when we have a user object and it's not a guest placeholder
    if (!user || user.guest) {
      // If no authenticated user, clear out entitlements and stop loading
      setHasVIPAccess(false);
      setEntitlements(null);
      setLoading(false);
      return;
    }

    checkVIPAccess();
  }, [user, checkVIPAccess]);

  useEffect(() => {
    console.log("🔄 [VIP Page] hasVIPAccess changed to:", hasVIPAccess);
    if (hasVIPAccess) {
      console.log("🔄 [VIP Page] Fetching VIP predictions...");
      fetchVIPPredictions();
    }
  }, [hasVIPAccess, fetchVIPPredictions]);

  // Add logging on every render
  console.log("🎨 [VIP Page] RENDER - State:", {
    hasVIPAccess,
    loading,
    user: user?.email || "no user",
    isGuest: user?.guest,
  });

  const handleTokenRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError("");
    // Ensure user is authenticated (page shows login CTA when no user)
    if (!user) {
      setTokenError("You need to be signed in to redeem tokens");
      return;
    }

    setRedeeming(true);
    try {
      const normalized = tokenCode.trim().toUpperCase();

      const res = await api.post("/vip/tokens/redeem", {
        token: normalized,
      });

      if (res.success) {
        // Refresh entitlements and predictions and show immediate access
        setHasVIPAccess(true);
        setTokenCode("");
        setTokenError("");

        // If the response provides remainingUses, update entitlements tokenAccess
        if (res.data) {
          const redeemData = res.data as {
            tokenId?: string;
            type?: string;
            remainingUses?: number;
            expiresAt?: string;
          };

          setEntitlements((prev) => ({
            subscription: prev?.subscription ?? null,
            tokenAccess:
              redeemData && redeemData.remainingUses !== undefined
                ? {
                    expiresAt: String(
                      redeemData.expiresAt ?? new Date().toISOString(),
                    ),
                    remaining: Number(redeemData.remainingUses ?? 0),
                    type: String(redeemData.type ?? "general"),
                  }
                : (prev?.tokenAccess ?? null),
          }));
        }

        // Refresh entitlements and predictions
        await checkVIPAccess();
        await fetchVIPPredictions();
      } else {
        setTokenError(res.error || "Invalid token code");
      }
    } catch (err) {
      console.error("Redeem failed:", err);
      setTokenError("Failed to redeem token. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    console.log("⏳ [VIP Page] Rendering LOADING state");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!hasVIPAccess) {
    // console.log(
    //   "🚫 [VIP Page] Rendering ACCESS DENIED state (hasVIPAccess is false)",
    // );
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-primary">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="flex justify-center mb-4">
                  <Lock className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl mb-2">
                  VIP Access Required
                </CardTitle>
                <p className="text-sm md:text-base text-muted-foreground">
                  Unlock premium betting tips and exclusive correct score
                  predictions with proven success rates
                </p>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-center">
                  <div className="p-3 md:p-4 border border-border">
                    <Crown className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-bold text-sm md:text-base mb-1">
                      VIP Tips & Updates
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Premium predictions and exclusive correct score updates
                    </p>
                  </div>
                  <div className="p-3 md:p-4 border border-border">
                    <Star className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-bold text-sm md:text-base mb-1">
                      Higher Success
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Average 75%+ win rate on VIP tips
                    </p>
                  </div>
                  <div className="p-3 md:p-4 border border-border">
                    <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-2" />
                    <h3 className="font-bold text-sm md:text-base mb-1">
                      Advanced Analytics
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Deep insights and trend analysis
                    </p>
                  </div>
                </div>

                {user && (
                  <div className="bg-secondary p-4 md:p-6 space-y-4">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-base md:text-lg">
                        Subscription Plans
                      </h3>
                      <div
                        className="text-sm md:text-base text-muted-foreground hover:underline cursor-pointer"
                        onClick={() => router.push("/subscriptions")}
                      >
                        See All Plans
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="border-2 border-border p-3 md:p-4 space-y-2">
                        <h4 className="font-bold text-sm md:text-base">
                          Monthly
                        </h4>
                        <p className="text-xl md:text-2xl font-bold text-primary">
                          € 100.00/week
                        </p>
                        <ul className="text-xs md:text-sm space-y-1">
                          <li>✓ All VIP tips & updates</li>
                          <li>✓ Correct score predictions</li>
                          <li>✓ Priority support</li>
                          <li>✓ Cancel anytime</li>
                        </ul>
                        <Button className="w-full mt-4 h-10 text-sm md:text-base">
                          Subscribe Weekly
                        </Button>
                      </div>
                      <div className="border-2 border-primary p-3 md:p-4 space-y-2">
                        <div className="inline-block bg-primary text-primary-foreground text-xs px-2 py-1 mb-2">
                          BEST VALUE
                        </div>
                        <h4 className="font-bold text-sm md:text-base">
                          Monthly
                        </h4>
                        <p className="text-xl md:text-2xl font-bold text-primary">
                          € 400.00/month
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Save € 400 per Month
                        </p>
                        <ul className="text-xs md:text-sm space-y-1">
                          <li>✓ All VIP tips & updates</li>
                          <li>✓ Correct score predictions</li>
                          <li>✓ Priority support</li>
                        </ul>
                        <Button className="w-full mt-4 h-10 text-sm md:text-base">
                          Subscribe Monthly
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!user && (
                  <Card className="border-2 border-primary">
                    <CardContent className="p-4 md:p-6 text-center">
                      <h3 className="font-bold text-base md:text-lg mb-2">
                        Sign up or log in to subscribe
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-4">
                        Create an account to access VIP features
                      </p>
                      <Button
                        className="h-10"
                        onClick={() => (window.location.href = "/login")}
                      >
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="border-2 border-border p-4 md:p-6">
                  <h3 className="font-bold text-base md:text-lg mb-4 text-center">
                    Have a VIP Token?
                  </h3>
                  <form onSubmit={handleTokenRedeem} className="space-y-4">
                    <div>
                      <Input
                        placeholder="Enter your VIP token code"
                        value={tokenCode}
                        onChange={(e) =>
                          setTokenCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/gi, "")
                              .slice(0, 7),
                          )
                        }
                        className="text-center font-mono h-11 md:h-10 text-base"
                        required
                      />
                      {tokenError && (
                        <p className="text-xs md:text-sm text-destructive mt-2">
                          {tokenError}
                        </p>
                      )}

                      {entitlements?.tokenAccess && (
                        <p className="text-xs md:text-sm text-muted-foreground mt-2 text-center">
                          You have {entitlements.tokenAccess.remaining} token
                          use
                          {entitlements.tokenAccess.remaining !== 1
                            ? "s"
                            : ""}{" "}
                          remaining — expires{" "}
                          {new Date(
                            entitlements.tokenAccess.expiresAt,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-10 text-sm md:text-base"
                      disabled={redeeming}
                    >
                      {redeeming ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Redeem Token
                        </>
                      )}
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Tokens provide instant VIP access without subscription
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // VIP content (shown when user has access)
  // console.log("✅ [VIP Page] Rendering VIP CONTENT (hasVIPAccess is TRUE)");
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">VIP Predictions Area</h1>
          </div>
          <p className="text-muted-foreground">
            Premium predictions with exclusive analysis and ticket snapshots
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current VIP Predictions</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Active VIP predictions with detailed analysis, team insights, and
              winning ticket snapshots
            </p>
          </CardHeader>
          <CardContent>
            {loadingPredictions ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                <p className="text-sm">Loading VIP predictions...</p>
              </div>
            ) : vipPredictions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Crown className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No VIP predictions available yet</p>
                <p className="text-sm mt-2">
                  Check back soon for premium sports predictions
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {displayedVipPredictions.map((prediction) => (
                    <Card
                      key={prediction.id}
                      className="border-2 border-primary"
                    >
                      <CardContent className="p-4">
                        <h3 className="font-bold text-sm md:text-base mb-3 line-clamp-2">
                          {prediction.title}
                        </h3>
                        {(prediction.homeTeam || prediction.awayTeam) && (
                          <div className="flex items-center justify-between mb-3 p-2 bg-secondary rounded">
                            <div className="text-center flex-1">
                              {prediction.homeTeam?.logoUrl && (
                                <img
                                  src={prediction.homeTeam.logoUrl}
                                  alt={prediction.homeTeam.name}
                                  className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                />
                              )}
                              <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                {prediction.homeTeam?.name}
                              </p>
                            </div>
                            <div className="px-3 font-bold text-muted-foreground text-xs md:text-sm">
                              VS
                            </div>
                            <div className="text-center flex-1">
                              {prediction.awayTeam?.logoUrl && (
                                <img
                                  src={prediction.awayTeam.logoUrl}
                                  alt={prediction.awayTeam.name}
                                  className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                />
                              )}
                              <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                {prediction.awayTeam?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        {prediction.matchResult && (
                          <div className="text-center text-xs md:text-sm font-medium text-primary mb-3">
                            {prediction.matchResult}
                          </div>
                        )}
                        <div className="space-y-1 text-[10px] md:text-xs mb-3">
                          {prediction.predictedOutcome && (
                            <div>
                              <span className="text-muted-foreground">
                                Prediction:{" "}
                              </span>
                              <span className="font-medium">
                                {prediction.predictedOutcome}
                              </span>
                            </div>
                          )}
                          {prediction.confidenceLevel && (
                            <div>
                              <span className="text-muted-foreground">
                                Confidence Level:{" "}
                              </span>
                              <span className="font-medium">
                                {prediction.confidenceLevel}%
                              </span>
                            </div>
                          )}
                          {prediction.result && (
                            <div>
                              <span className="text-muted-foreground">
                                Result:{" "}
                              </span>
                              <span className="font-medium capitalize">
                                {prediction.result}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
                          {prediction.summary || prediction.content}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          {prediction.odds && (
                            <div>
                              <div className="text-lg md:text-xl font-bold text-primary">
                                {/* {prediction.odds} */}
                                {Number(prediction.odds).toFixed(2)}
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                Odds
                              </div>
                            </div>
                          )}
                          {prediction.predictedOutcome && (
                            <div className="text-right">
                              <div className="text-xs md:text-sm font-bold line-clamp-1">
                                {prediction.predictedOutcome}
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                Prediction
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mb-3 gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                            <span className="truncate">
                              {new Date(
                                prediction.matchDate || prediction.createdAt,
                              ).toLocaleString("en-NG", {
                                year: "numeric",
                                timeZone: "UTC",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {prediction.confidenceLevel && (
                            <span className="truncate">
                              Confidence Level:{prediction.confidenceLevel}
                            </span>
                          )}
                        </div>
                        {prediction.ticketSnapshots.length > 0 && (
                          <div className="mb-3 text-[10px] md:text-xs text-muted-foreground">
                            Ticket snapshots:{" "}
                            {prediction.ticketSnapshots.length}
                          </div>
                        )}
                        {prediction.result === "won" && (
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Won
                            </span>
                          </div>
                        )}
                        {prediction.result === "lost" && (
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                              <XCircle className="w-3 h-3 mr-1" />
                              Lost
                            </span>
                          </div>
                        )}
                        <Link href={`/tips/${prediction.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[10px] md:text-xs"
                          >
                            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {vipPredictions.length > itemsPerPage && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPagePredictions(
                          Math.max(1, currentPagePredictions - 1),
                        )
                      }
                      disabled={currentPagePredictions === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPagePredictions} of{" "}
                      {Math.ceil(vipPredictions.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPagePredictions(
                          Math.min(
                            Math.ceil(vipPredictions.length / itemsPerPage),
                            currentPagePredictions + 1,
                          ),
                        )
                      }
                      disabled={
                        currentPagePredictions ===
                        Math.ceil(vipPredictions.length / itemsPerPage)
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VIP Updates Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              VIP Updates
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Exclusive correct score predictions and draw alerts with real-time
              updates
            </p>
          </CardHeader>
          <CardContent>
            {loadingUpdates ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                <p className="text-sm">Loading VIP updates...</p>
              </div>
            ) : vipUpdates.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {displayedVipUpdates.map((update) => (
                    <Card
                      key={update.id}
                      className="border-2 border-purple-500"
                    >
                      <CardContent className="p-4">
                        <h3 className="font-bold text-sm md:text-base mb-3 line-clamp-2">
                          {update.title}
                        </h3>
                        {(update.homeTeam || update.awayTeam) && (
                          <div className="flex items-center justify-between mb-3 p-2 bg-secondary rounded">
                            <div className="text-center flex-1">
                              {update.homeTeam?.logoUrl && (
                                <img
                                  src={update.homeTeam.logoUrl}
                                  alt={update.homeTeam.name}
                                  className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                />
                              )}
                              <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                {update.homeTeam?.name}
                              </p>
                            </div>
                            <div className="px-3 font-bold text-muted-foreground text-xs md:text-sm">
                              VS
                            </div>
                            <div className="text-center flex-1">
                              {update.awayTeam?.logoUrl && (
                                <img
                                  src={update.awayTeam.logoUrl}
                                  alt={update.awayTeam.name}
                                  className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                />
                              )}
                              <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                {update.awayTeam?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        {update.matchResult && (
                          <div
                            className={`text-xs md:text-sm font-medium mb-2 ${
                              update.result === "won"
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-primary"
                            }`}
                          >
                            {update.matchResult}
                          </div>
                        )}
                        {update.matchResult && (
                          <div
                            className={`text-xs md:text-sm font-medium mb-2 ${
                              update.result === "lost"
                                ? "text-red-700 dark:text-red-400"
                                : "text-primary"
                            }`}
                          >
                            {update.matchResult}
                          </div>
                        )}
                        <div className="space-y-1 text-[10px] md:text-xs mb-3">
                          {update.predictedOutcome && (
                            <div>
                              <span className="text-muted-foreground">
                                Prediction:{" "}
                              </span>
                              <span className="font-medium">
                                {update.predictedOutcome}
                              </span>
                            </div>
                          )}
                          {update.confidenceLevel && (
                            <div>
                              <span className="text-muted-foreground">
                                Confidence Level:{" "}
                              </span>
                              <span className="font-medium">
                                {update.confidenceLevel}%
                              </span>
                            </div>
                          )}
                          {update.result && (
                            <div>
                              <span className="text-muted-foreground">
                                Result:{" "}
                              </span>
                              <span
                                className={`font-medium capitalize ${
                                  update.result === "won"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : update.result === "lost"
                                      ? "text-red-500"
                                      : ""
                                }`}
                              >
                                {update.result}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
                          {update.summary || update.content}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          {update.odds && (
                            <div>
                              <div className="text-lg md:text-xl font-bold text-primary">
                                {Number(update.odds).toFixed(2)}
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                Odds
                              </div>
                            </div>
                          )}
                          {update.predictedOutcome && (
                            <div className="text-right">
                              <div className="text-xs md:text-sm font-bold line-clamp-1">
                                {update.predictedOutcome}
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                Prediction
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mb-3 gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                            <span className="truncate">
                              {new Date(
                                update.matchDate || update.createdAt,
                              ).toLocaleString("en-NG", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                          </div>
                          {update.confidenceLevel && (
                            <span className="truncate">
                              Confidence Level:{update.confidenceLevel}
                            </span>
                          )}
                        </div>
                        {update.ticketSnapshots.length > 0 && (
                          <div className="mb-3 text-[10px] md:text-xs text-muted-foreground">
                            Ticket snapshots: {update.ticketSnapshots.length}
                          </div>
                        )}
                        {update.result === "won" && (
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Won
                            </span>
                          </div>
                        )}

                        {update.result === "lost" && (
                          <div className="mb-3 flex justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                              <XCircle className="w-3 h-3 mr-1" />
                              Lost
                            </span>
                          </div>
                        )}
                        <Link href={`/tips/${update.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[10px] md:text-xs"
                          >
                            <Target className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                            View Update
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {vipUpdates.length > itemsPerPage && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPageUpdates(
                          Math.max(1, currentPageUpdates - 1),
                        )
                      }
                      disabled={currentPageUpdates === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPageUpdates} of{" "}
                      {Math.ceil(vipUpdates.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPageUpdates(
                          Math.min(
                            Math.ceil(vipUpdates.length / itemsPerPage),
                            currentPageUpdates + 1,
                          ),
                        )
                      }
                      disabled={
                        currentPageUpdates ===
                        Math.ceil(vipUpdates.length / itemsPerPage)
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No VIP updates available yet</p>
                <p className="text-sm mt-2">
                  Check back soon for exclusive correct score predictions and
                  draw alerts
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Section */}
        {(historyPredictions.length > 0 || historyUpdates.length > 0) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Past Results & History
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                View our track record and past predictions with results
              </p>
            </CardHeader>
            <CardContent>
              {historyPredictions.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-base mb-4">Past VIP Tips</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {displayedHistoryPredictions.map((prediction) => (
                      <Card
                        key={prediction.id}
                        className={`border-2 ${
                          prediction.result === "won"
                            ? "border-emerald-500"
                            : prediction.result === "lost"
                              ? "border-red-500"
                              : "border-border"
                        }`}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-bold text-sm md:text-base mb-3 line-clamp-2">
                            {prediction.title}
                          </h3>
                          {(prediction.homeTeam || prediction.awayTeam) && (
                            <div className="flex items-center justify-between mb-3 p-2 bg-secondary rounded">
                              <div className="text-center flex-1">
                                {prediction.homeTeam?.logoUrl && (
                                  <img
                                    src={prediction.homeTeam.logoUrl}
                                    alt={prediction.homeTeam.name}
                                    className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                  />
                                )}
                                <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                  {prediction.homeTeam?.name}
                                </p>
                              </div>
                              <div className="px-3 font-bold text-muted-foreground text-xs md:text-sm">
                                VS
                              </div>
                              <div className="text-center flex-1">
                                {prediction.awayTeam?.logoUrl && (
                                  <img
                                    src={prediction.awayTeam.logoUrl}
                                    alt={prediction.awayTeam.name}
                                    className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                  />
                                )}
                                <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                  {prediction.awayTeam?.name}
                                </p>
                              </div>
                            </div>
                          )}
                          {prediction.matchResult && (
                            <div
                              className={`text-xs md:text-sm font-medium mb-2 ${
                                prediction.result === "won"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-primary"
                              }`}
                            >
                              {prediction.matchResult}
                            </div>
                          )}
                          <div className="space-y-1 text-[10px] md:text-xs mb-3">
                            {prediction.predictedOutcome && (
                              <div>
                                <span className="text-muted-foreground">
                                  Prediction:{" "}
                                </span>
                                <span className="font-medium">
                                  {prediction.predictedOutcome}
                                </span>
                              </div>
                            )}
                            {prediction.confidenceLevel && (
                              <div>
                                <span className="text-muted-foreground">
                                  Confidence Level:{" "}
                                </span>
                                <span className="font-medium">
                                  {prediction.confidenceLevel}%
                                </span>
                              </div>
                            )}
                            {prediction.result && (
                              <div>
                                <span className="text-muted-foreground">
                                  Result:{" "}
                                </span>
                                <span
                                  className={`font-medium capitalize ${
                                    prediction.result === "won"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : prediction.result === "lost"
                                        ? "text-red-500"
                                        : ""
                                  }`}
                                >
                                  {prediction.result}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mb-3 gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                              <span className="truncate">
                                {new Date(
                                  prediction.matchDate || prediction.createdAt,
                                ).toLocaleString("en-NG", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </span>
                            </div>
                            {prediction.confidenceLevel && (
                              <span className="truncate">
                                Confidence Level:{prediction.confidenceLevel}
                              </span>
                            )}
                          </div>
                          {prediction.ticketSnapshots.length > 0 && (
                            <div className="mb-3 text-[10px] md:text-xs text-muted-foreground">
                              Ticket snapshots:{" "}
                              {prediction.ticketSnapshots.length}
                            </div>
                          )}
                          {prediction.tipResult && (
                            <details className="mb-3">
                              <summary className="text-[10px] md:text-xs font-medium cursor-pointer text-primary hover:text-primary/80">
                                Tip Result Details
                              </summary>
                              <div className="mt-1 space-y-1 text-[10px] md:text-xs pl-2 border-l-2 border-primary/20">
                                <div>
                                  <span className="text-muted-foreground">
                                    Settled At:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {new Date(
                                      prediction.tipResult.settledAt,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Outcome:{" "}
                                  </span>
                                  <span className="font-medium capitalize">
                                    {prediction.tipResult.outcome}
                                  </span>
                                </div>
                                {prediction.tipResult.payout && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Payout:{" "}
                                    </span>
                                    <span className="font-medium">
                                      €{prediction.tipResult.payout}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                          {prediction.result === "won" && (
                            <div className="mb-3 flex justify-center">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Won
                              </span>
                            </div>
                          )}
                          {prediction.result === "lost" && (
                            <div className="mb-3 flex justify-center">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                <XCircle className="w-3 h-3 mr-1" />
                                Lost
                              </span>
                            </div>
                          )}
                          <Link href={`/tips/${prediction.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-[10px] md:text-xs"
                            >
                              View Details
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {historyPredictions.length > itemsPerPage && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageHistoryPredictions(
                            Math.max(1, currentPageHistoryPredictions - 1),
                          )
                        }
                        disabled={currentPageHistoryPredictions === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPageHistoryPredictions} of{" "}
                        {Math.ceil(historyPredictions.length / itemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageHistoryPredictions(
                            Math.min(
                              Math.ceil(
                                historyPredictions.length / itemsPerPage,
                              ),
                              currentPageHistoryPredictions + 1,
                            ),
                          )
                        }
                        disabled={
                          currentPageHistoryPredictions ===
                          Math.ceil(historyPredictions.length / itemsPerPage)
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {historyUpdates.length > 0 && (
                <div>
                  <h3 className="font-bold text-base mb-4">Past VIP Updates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {displayedHistoryUpdates.map((update) => (
                      <Card
                        key={update.id}
                        className={`border-2 ${
                          update.result === "won"
                            ? "border-emerald-500"
                            : update.result === "lost"
                              ? "border-red-500"
                              : "border-border"
                        }`}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-bold text-sm md:text-base mb-3 line-clamp-2">
                            {update.title}
                          </h3>
                          {(update.homeTeam || update.awayTeam) && (
                            <div className="flex items-center justify-between mb-3 p-2 bg-secondary rounded">
                              <div className="text-center flex-1">
                                {update.homeTeam?.logoUrl && (
                                  <img
                                    src={update.homeTeam.logoUrl}
                                    alt={update.homeTeam.name}
                                    className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                  />
                                )}
                                <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                  {update.homeTeam?.name}
                                </p>
                              </div>
                              <div className="px-3 font-bold text-muted-foreground text-xs md:text-sm">
                                VS
                              </div>
                              <div className="text-center flex-1">
                                {update.awayTeam?.logoUrl && (
                                  <img
                                    src={update.awayTeam.logoUrl}
                                    alt={update.awayTeam.name}
                                    className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 object-contain"
                                  />
                                )}
                                <p className="text-[10px] md:text-xs font-medium line-clamp-1">
                                  {update.awayTeam?.name}
                                </p>
                              </div>
                            </div>
                          )}
                          {update.matchResult && (
                            <div
                              className={`text-xs md:text-sm font-medium mb-2 ${
                                update.result === "won"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : update.result === "lost"
                                    ? "text-red-500 dark:text-red-400"
                                    : "text-primary"
                              }`}
                            >
                              {update.matchResult}
                            </div>
                          )}
                          <div className="space-y-1 text-[10px] md:text-xs mb-3">
                            {update.predictedOutcome && (
                              <div>
                                <span className="text-muted-foreground">
                                  Prediction:{" "}
                                </span>
                                <span className="font-medium">
                                  {update.predictedOutcome}
                                </span>
                              </div>
                            )}
                            {update.confidenceLevel && (
                              <div>
                                <span className="text-muted-foreground">
                                  Confidence Level:{" "}
                                </span>
                                <span className="font-medium">
                                  {update.confidenceLevel}%
                                </span>
                              </div>
                            )}
                            {update.result && (
                              <div>
                                <span className="text-muted-foreground">
                                  Result:{" "}
                                </span>
                                <span
                                  className={`font-medium capitalize ${
                                    update.result === "won"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : update.result === "lost"
                                        ? "text-red-500"
                                        : ""
                                  }`}
                                >
                                  {update.result}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] md:text-xs text-muted-foreground mb-3 gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                              <span className="truncate">
                                {new Date(
                                  update.matchDate || update.createdAt,
                                ).toLocaleString("en-NG", {
                                  year: "numeric",
                                  month: "short",
                                  timeZone: "UTC",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {update.confidenceLevel && (
                              <span className="truncate">
                                Confidence Level:{update.confidenceLevel}
                              </span>
                            )}
                          </div>
                          {update.ticketSnapshots.length > 0 && (
                            <div className="mb-3 text-[10px] md:text-xs text-muted-foreground">
                              Ticket snapshots: {update.ticketSnapshots.length}
                            </div>
                          )}
                          {update.tipResult && (
                            <details className="mb-3">
                              <summary className="text-[10px] md:text-xs font-medium cursor-pointer text-primary hover:text-primary/80">
                                Tip Result Details
                              </summary>
                              <div className="mt-1 space-y-1 text-[10px] md:text-xs pl-2 border-l-2 border-primary/20">
                                <div>
                                  <span className="text-muted-foreground">
                                    Settled At:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {new Date(
                                      update.tipResult.settledAt,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Outcome:{" "}
                                  </span>
                                  <span className="font-medium capitalize">
                                    {update.tipResult.outcome}
                                  </span>
                                </div>
                                {update.tipResult.payout && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Payout:{" "}
                                    </span>
                                    <span className="font-medium">
                                      €{update.tipResult.payout}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                          {update.result === "won" && (
                            <div className="mb-3 flex justify-center">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Won
                              </span>
                            </div>
                          )}
                          <Link href={`/tips/${update.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-[10px] md:text-xs"
                            >
                              View Details
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {historyUpdates.length > itemsPerPage && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageHistoryUpdates(
                            Math.max(1, currentPageHistoryUpdates - 1),
                          )
                        }
                        disabled={currentPageHistoryUpdates === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPageHistoryUpdates} of{" "}
                        {Math.ceil(historyUpdates.length / itemsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageHistoryUpdates(
                            Math.min(
                              Math.ceil(historyUpdates.length / itemsPerPage),
                              currentPageHistoryUpdates + 1,
                            ),
                          )
                        }
                        disabled={
                          currentPageHistoryUpdates ===
                          Math.ceil(historyUpdates.length / itemsPerPage)
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">VIP Updates</h3>
              <p className="text-sm text-muted-foreground">
                Exclusive correct score predictions and draw alerts with
                real-time updates
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Ticket Snapshots</h3>
              <p className="text-sm text-muted-foreground">
                View real betting tickets to track our success and build
                confidence
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Higher Success Rate</h3>
              <p className="text-sm text-muted-foreground">
                Premium predictions with proven track record and transparency
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
