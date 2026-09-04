"use client";

import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Crown,
  Lock,
  Loader2,
  Star,
  Target,
  TrendingUp,
  Phone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PredictionCard } from "@/components/prediction-card";

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

type VIPPrediction = {
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
  isVIP: boolean;
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
};

export default function VIPAreaPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const router = useRouter();

  const [hasVIPAccess, setHasVIPAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [tokenCode, setTokenCode] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [currentPagePredictions, setCurrentPagePredictions] = useState(1);
  const [currentPageUpdates, setCurrentPageUpdates] = useState(1);
  const [currentPageHistoryPredictions, setCurrentPageHistoryPredictions] =
    useState(1);
  const [currentPageHistoryUpdates, setCurrentPageHistoryUpdates] = useState(1);
  const [vipPredictions, setVipPredictions] = useState<VIPPrediction[]>([]);
  const [vipUpdates, setVipUpdates] = useState<VIPPrediction[]>([]);
  const [historyPredictions, setHistoryPredictions] = useState<VIPPrediction[]>(
    [],
  );
  const [historyUpdates, setHistoryUpdates] = useState<VIPPrediction[]>([]);
  const [entitlements, setEntitlements] = useState<{
    subscription: SubscriptionData;
    tokenAccess: TokenAccess;
  } | null>(null);

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
    try {
      const res = await api.get("/vip/status");
      if (res.success) {
        const data = res.data as {
          hasAccess: boolean;
          subscription?: SubscriptionData;
          tokenAccess?: TokenAccess;
        };

        setHasVIPAccess(Boolean(data.hasAccess));
        setEntitlements({
          subscription: data.subscription ?? null,
          tokenAccess: data.tokenAccess ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to check VIP access:", error);
      setHasVIPAccess(false);
      setEntitlements(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchVIPPredictions = useCallback(async () => {
    setLoadingPredictions(true);
    setLoadingUpdates(true);

    try {
      const res = await api.get("/predictions?vip=true");
      if (!res.success || !res.data) {
        return;
      }

      const data = res.data as { predictions: VIPPrediction[] };
      const predictions = data.predictions || [];
      const tips = predictions.filter(
        (prediction) => prediction.category === "tip",
      );
      const updates = predictions.filter(
        (prediction) => prediction.category === "update",
      );

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const currentTips = tips.filter((prediction) => {
        if (!prediction.matchDate) return true;
        const matchDate = new Date(prediction.matchDate);
        return matchDate >= twoHoursAgo && prediction.result === "pending";
      });

      const historyTips = tips.filter((prediction) => {
        if (!prediction.matchDate) return false;
        const matchDate = new Date(prediction.matchDate);
        return matchDate < twoHoursAgo || prediction.result !== "pending";
      });

      const currentUpdates = updates.filter((prediction) => {
        if (!prediction.matchDate) return true;
        const matchDate = new Date(prediction.matchDate);
        return matchDate >= twoHoursAgo && prediction.result === "pending";
      });

      const historyUpdates = updates.filter((prediction) => {
        if (!prediction.matchDate) return false;
        const matchDate = new Date(prediction.matchDate);
        return matchDate < twoHoursAgo || prediction.result !== "pending";
      });

      setVipPredictions(currentTips);
      setVipUpdates(currentUpdates);
      setHistoryPredictions(historyTips);
      setHistoryUpdates(historyUpdates);
    } catch (error) {
      console.error("Failed to fetch VIP predictions:", error);
    } finally {
      setLoadingPredictions(false);
      setLoadingUpdates(false);
    }
  }, [api]);

  useEffect(() => {
    if (!user) {
      setHasVIPAccess(false);
      setEntitlements(null);
      setLoading(false);
      return;
    }

    checkVIPAccess();
  }, [user, checkVIPAccess]);

  useEffect(() => {
    if (hasVIPAccess) {
      fetchVIPPredictions();
    }
  }, [hasVIPAccess, fetchVIPPredictions]);

  const handleTokenRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError("");

    if (!user) {
      setTokenError("You need to be signed in to redeem tokens");
      return;
    }

    setRedeeming(true);
    try {
      const normalized = tokenCode.trim().toUpperCase();
      const res = await api.post("/vip/tokens/redeem", { token: normalized });

      if (res.success) {
        setHasVIPAccess(true);
        setTokenCode("");
        setTokenError("");

        if (res.data) {
          const redeemData = res.data as {
            type?: string;
            remainingUses?: number;
            expiresAt?: string;
          };

          setEntitlements((prev) => ({
            subscription: prev?.subscription ?? null,
            tokenAccess:
              redeemData.remainingUses !== undefined
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

        await checkVIPAccess();
        await fetchVIPPredictions();
      } else {
        setTokenError(res.error || "Invalid token code");
      }
    } catch (error) {
      console.error("Redeem failed:", error);
      setTokenError("Failed to redeem token. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!hasVIPAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="border-2 border-primary">
              <CardHeader className="text-center p-4 md:p-6">
                <div className="flex justify-center mb-4">
                  <Lock className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl mb-2">
                  VIP Access Required
                </CardTitle>
                <p className="text-sm md:text-base text-muted-foreground">
                  Unlock premium betting tips, correct score updates, and VIP
                  history with proven success rates.
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

                {/* {user && (
                  <div className="bg-secondary p-4 md:p-6 space-y-4">
                    <div className="flex justify-between items-center gap-3">
                      <h3 className="font-bold text-base md:text-lg">
                        Subscription Plans
                      </h3>
                      <button
                        type="button"
                        className="text-sm md:text-base text-muted-foreground hover:underline"
                        onClick={() => router.push("/subscriptions")}
                      >
                        See All Plans
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="border-2 border-border p-3 md:p-4 space-y-2">
                        <h4 className="font-bold text-sm md:text-base">
                          Weekly
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
                )} */}

                {!user && (
                  <Card className="border-2 border-primary">
                    <CardContent className="p-4 md:p-6 text-center">
                      <h3 className="font-bold text-base md:text-lg mb-2">
                        Sign up or log in to access VIP features
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1 mt-6">
                        Need a token?{" "}
                        <Link
                          href="/contact"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Contact us
                          <Phone className="h-3 w-3" />
                        </Link>
                      </p>
                    </div>
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

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current VIP Predictions</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Active VIP predictions with detailed analysis and winning ticket
              snapshots
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {displayedVipPredictions.map((prediction) => (
                  <PredictionCard
                    key={prediction.id}
                    item={prediction as any}
                    className="border-2 border-primary hover:shadow-lg transition-all hover:border-primary/50"
                    showTipResultDetails={false}
                    showTicketSnapshots={false}
                    showResultBadges
                  />
                ))}
              </div>
            )}

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
          </CardContent>
        </Card>

        {/* <Card className="mb-8">
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
            ) : vipUpdates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No VIP updates available yet</p>
                <p className="text-sm mt-2">
                  Check back soon for exclusive correct score predictions and
                  draw alerts
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {displayedVipUpdates.map((update) => (
                  <PredictionCard
                    key={update.id}
                    item={update as any}
                    className="border-2 border-purple-500 hover:shadow-lg transition-all hover:border-primary/50"
                    showTipResultDetails={false}
                    showTicketSnapshots={false}
                    showResultBadges
                  />
                ))}
              </div>
            )}

            {vipUpdates.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPageUpdates(Math.max(1, currentPageUpdates - 1))
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
          </CardContent>
        </Card> */}

        {(historyPredictions.length > 0 || historyUpdates.length > 0) && (
          <Card className="mb-8">
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
                      <PredictionCard
                        key={prediction.id}
                        item={prediction as any}
                        className={`border-2 ${
                          prediction.result === "won"
                            ? "border-emerald-500"
                            : prediction.result === "lost"
                              ? "border-red-500"
                              : "border-border"
                        } hover:shadow-lg transition-all hover:border-primary/50`}
                        showTipResultDetails
                        showTicketSnapshots={false}
                        showResultBadges
                      />
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
                      <PredictionCard
                        key={update.id}
                        item={update as any}
                        className={`border-2 ${
                          update.result === "won"
                            ? "border-emerald-500"
                            : update.result === "lost"
                              ? "border-red-500"
                              : "border-border"
                        } hover:shadow-lg transition-all hover:border-primary/50`}
                        showTipResultDetails
                        showTicketSnapshots={false}
                        showResultBadges
                      />
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
