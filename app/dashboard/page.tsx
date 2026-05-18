/* eslint-disable react/no-unescaped-entities */
"use client";

import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  TrendingUp,
  Wallet,
  Crown,
  Activity,
  Loader2,
  Smartphone,
  Apple,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserEngagement } from "@/components/user-engagement";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
interface Prediction {
  id: string;
  title: string;
  summary: string;
  odds?: number;
  sport: string;
  league?: string;
  matchDate?: string;
  homeTeam?: { name: string; logoUrl?: string };
  awayTeam?: { name: string; logoUrl?: string };
  predictedOutcome?: string;
  result?: string;
  isVIP: boolean;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamScore: number;
  awayTeamScore: number;
  status: string;
  minute?: number;
  league: { name: string };
  sport: { displayName: string };
}

interface VIPStatus {
  success: boolean;
  hasAccess: boolean;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  tokenAccess?: {
    expiresAt: string;
    remaining: number;
  } | null;
}

interface UserStats {
  totalTipsViewed: number;
  correctPredictions: number;
  winRate: number;
  totalEarnings: number;
  streakDays: number;
  joinedDaysAgo: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [isVIP, setIsVIP] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTipsViewed: 0,
    correctPredictions: 0,
    winRate: 0,
    totalEarnings: 0,
    streakDays: 0,
    joinedDaysAgo: 0,
  });
  const [showWelcomeTooltip, setShowWelcomeTooltip] = useState(false);
  const [derivedWinRate, setDerivedWinRate] = useState<number | null>(null);
  const [bannerImage, setBannerImage] = useState("/images/do.gif");
  const [showAppDialog, setShowAppDialog] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        let vipStatus = false;
        // Fetch VIP status if user is logged in and not a guest
        if (user && !user.guest) {
          const vipRes = await api.get("/vip/status");
          if (vipRes.success) {
            const vipData = vipRes.data as VIPStatus;
            setIsVIP(vipData.hasAccess);
            vipStatus = vipData.hasAccess;
          }
        }

        // Fetch predictions - VIP if user has access, otherwise free
        const predictionsRes = await api.get(
          `/predictions?vip=false&limit=3&today=true`,
        );

        if (predictionsRes.success) {
          const predictionsData = predictionsRes.data as {
            predictions: Prediction[];
          };
          setPredictions(predictionsData.predictions);
        } else if (vipStatus && !user?.guest) {
          // If VIP predictions fail, fallback to free predictions
          const freeRes = await api.get(
            "/predictions?vip=false&limit=3&today=true",
          );
          if (freeRes.success) {
            const freeData = freeRes.data as { predictions: Prediction[] };
            setPredictions(freeData.predictions);
          }
        }

        // Fetch live matches
        const matchesRes = await api.get(
          "/livescores/matches?status=live&limit=5",
        );
        if (matchesRes.success) {
          const matchesData = matchesRes.data as { matches: Match[] };
          setLiveMatches(matchesData.matches);
        }

        // Fetch user statistics and compute derived win rate with fallbacks
        let winRateCandidate: number | null = null;
        if (user && !user.guest) {
          const statsRes = await api.get("/user/stats");
          if (statsRes.success) {
            const s = statsRes.data as UserStats;
            setUserStats(s);
            if (s && typeof s.winRate === "number" && s.winRate > 0) {
              winRateCandidate = s.winRate;
            } else if (
              s &&
              typeof s.correctPredictions === "number" &&
              typeof s.totalTipsViewed === "number" &&
              s.totalTipsViewed > 0
            ) {
              const calc = (s.correctPredictions / s.totalTipsViewed) * 100;
              if (calc > 0) winRateCandidate = calc;
            }
          }

          if (winRateCandidate === null) {
            const betsRes = await api.get("/bets?limit=1");
            if (betsRes.success) {
              const stats = (betsRes.data as any)?.statistics;
              const wr =
                typeof stats?.winRate === "number" ? stats.winRate : null;
              if (wr && wr > 0) {
                winRateCandidate = wr;
              }
            }
          }
        }

        setDerivedWinRate(
          winRateCandidate && winRateCandidate > 0 ? winRateCandidate : null,
        );

        // Fetch banner carousel
        const bannerType = vipStatus ? "DASHBOARD_VIP" : "DASHBOARD_FREE";
        const bannerRes = await fetch(`/api/carousels?type=${bannerType}`);
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          if (bannerData.carousels && bannerData.carousels.length > 0) {
            setBannerImage(bannerData.carousels[0].imageUrl);
          }
        }

        // Show welcome tooltip for new users
        if (user && !user.guest) {
          const joinedRecently = userStats.joinedDaysAgo <= 3;
          const hasLowActivity = userStats.totalTipsViewed < 5;
          setShowWelcomeTooltip(joinedRecently && hasLowActivity);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, api]);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("appDialogDismissedAt");
    if (dismissedAt) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedAt);
      if (timeSinceDismissed < 5 * 60 * 60 * 1000) return; // Don't show for 5 hours
    }
    const timer = setTimeout(() => {
      setShowAppDialog(true);
    }, 3000); // Show dialog after 3 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className=" mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl p-20">
        {/* Header - Compact for mobile */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
            Hey, {user?.displayName || "Punter"}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Your winning predictions start here
          </p>
        </div>

        {/* Stats Grid - Enhanced with real data and engagement */}
        <div className="flex mb-4 relative sm:mb-6 h-48 md:h-64 w-full">
          <Image
            src={bannerImage}
            alt="Dashboard Banner"
            fill
            className="object-cover rounded-lg"
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Latest Predictions */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                {/* {isVIP && <Crown className="h-4 w-4 text-amber-500" />}
                {isVIP ? "VIP Tips" : "Today's Tips"} */}
                Today's Tips
              </h2>
              <Link
                href="/tips"
                className="text-xs sm:text-sm text-primary hover:underline font-medium"
              >
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin h-8 w-8  mx-auto mb-4" />
                {/* <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" /> */}
                <p className="text-sm">Loading tips...</p>
              </div>
            ) : predictions.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {predictions.map((pred) => (
                  <Link
                    key={pred.id}
                    href={`/tips/${pred.id}`}
                    className="block"
                  >
                    <Card className="hover:shadow-lg transition-all hover:border-primary/50">
                      <CardContent className="p-3 sm:p-4">
                        {/* Match Teams with Logos */}
                        {pred.homeTeam && pred.awayTeam ? (
                          <div className="mb-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {pred.homeTeam.logoUrl && (
                                  <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                                    <img
                                      src={pred.homeTeam.logoUrl}
                                      alt={pred.homeTeam.name}
                                      // fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                                <span className="font-semibold text-sm sm:text-base truncate">
                                  {pred.homeTeam.name}
                                </span>
                              </div>
                              <div className="px-2 py-1 bg-muted rounded text-xs font-bold">
                                VS
                              </div>
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="font-semibold text-sm sm:text-base truncate">
                                  {pred.awayTeam.name}
                                </span>
                                {pred.awayTeam.logoUrl && (
                                  <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                                    <img
                                      src={pred.awayTeam.logoUrl}
                                      alt={pred.awayTeam.name}
                                      // fill
                                      className="object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <h3 className="font-semibold text-sm sm:text-base mb-2">
                            {pred.title}
                          </h3>
                        )}

                        {/* League & Sport */}
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-2">
                          <span className="px-2 py-0.5 bg-secondary rounded">
                            {pred.sport}
                          </span>
                          {pred.league && (
                            <span className="truncate">{pred.league}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-[14px] sm:text-xs text-muted-foreground mb-2">
                          {pred.matchDate && (
                            <span className="truncate">
                              {" "}
                              {new Date(pred.matchDate).toLocaleString(
                                "en-US",
                                {
                                  timeZone: "UTC",
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                },
                              )}
                            </span>
                          )}
                        </div>
                        {/* Prediction Summary */}
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                          {pred.summary}
                        </p>

                        {/* Footer - Odds & Prediction */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          {pred.predictedOutcome && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                Prediction:
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-primary">
                                {pred.predictedOutcome}
                              </span>
                            </div>
                          )}
                          {pred.odds && (
                            <div className="px-2 py-1 bg-primary/10 text-primary rounded font-bold text-xs sm:text-sm">
                              Odds: {Number(pred.odds).toFixed(2)}
                            </div>
                          )}

                          {pred.isVIP && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium">No tips available</p>
                  <p className="text-xs mt-1">Check back soon for new tips</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* User Engagement Features */}
            {user && !user.guest && (
              <UserEngagement user={user} userStats={userStats} isVIP={isVIP} />
            )}
            {/* Enhanced VIP Access Card with Social Proof */}
            {/* {!isVIP && (
              <Card className="border-primary relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  Limited Time
                </div>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <Crown className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 text-amber-500" />
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-1">
                        Go VIP - 50% OFF
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Join 2,847+ winning members
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                    <p className="text-xs text-green-800 font-medium">
                      🎯 Last week: 10/10 VIP tips won (100% success rate)
                    </p>
                  </div>
                  <ul className="space-y-2 mb-4 text-xs sm:text-sm">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      <span>85%+ win rates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      <span>Correct score predictions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      <span>Winning ticket screenshots</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                      <span>24/7 VIP support</span>
                    </li>
                  </ul>
                  <Link href="/subscriptions" className="block">
                    <button className="w-full bg-linear-to-r from-primary to-primary/80 text-white font-bold py-2.5 px-4 rounded-lg hover:shadow-lg transition-all text-sm">
                      Get 50% OFF Now
                    </button>
                  </Link>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Offer expires in 24 hours
                  </p>
                </CardContent>
              </Card>
            )} */}

            {/* Welcome Tooltip for New Users */}
            {showWelcomeTooltip && (
              <Card className="border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-sm">👋</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1">
                        Welcome to ScoreFusion!
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Start by exploring our tips and tracking your wins
                      </p>
                      <button
                        onClick={() => setShowWelcomeTooltip(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        Got it!
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Quick Actions with Engagement */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/tips" className="block">
                  <button className="w-full text-left border-2 border-border py-2.5 px-3 rounded-lg hover:bg-accent transition-colors text-xs sm:text-sm font-medium relative">
                    📊 All Tips
                    {predictions.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {predictions.length}
                      </span>
                    )}
                  </button>
                </Link>
                {!isVIP && (
                  <Link href="/subscriptions" className="block">
                    <button className="w-full text-left border-2 border-primary py-2.5 px-3 rounded-lg hover:bg-primary/5 transition-colors text-xs sm:text-sm font-medium relative">
                      💰 Upgrade to VIP
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                        50% OFF
                      </span>
                    </button>
                  </Link>
                )}
                <Link href="/history" className="block">
                  <button className="w-full text-left border-2 border-border py-2.5 px-3 rounded-lg hover:bg-accent transition-colors text-xs sm:text-sm font-medium relative">
                    ✅ ⏰ History
                  </button>
                </Link>
                <Link href="/contact" className="block">
                  <button className="w-full text-left border-2 border-border py-2.5 px-3 rounded-lg hover:bg-accent transition-colors text-xs sm:text-sm font-medium">
                    ☎ Contact Us
                  </button>
                </Link>
              </CardContent>
            </Card>

            {/* Dynamic Pro Tips & Success Stories */}
            {/* <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">🏆</span>
                  <h3 className="font-bold text-xs sm:text-sm">
                    Success Story
                  </h3>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                  "Made $7,400 last month following VIP tips!" - Danielle
                </p>
                <div className="flex items-center gap-1 text-[10px] ">
                  <span>⭐⭐⭐⭐⭐</span>
                  <span className="font-medium">Verified Winner</span>
                </div>
              </CardContent>
            </Card> */}

            {/* Progress Tracker for Engagement */}
            {user && !user.guest && (
              <Card className="border-primary">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xs sm:text-sm">
                      Your Progress
                    </h3>
                    <span className="text-xs text-primary">
                      {Math.min(userStats.totalTipsViewed, 10)}/10
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (userStats.totalTipsViewed / 10) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {userStats.totalTipsViewed < 10
                      ? `View ${
                          10 - userStats.totalTipsViewed
                        } more tips to unlock rewards!`
                      : "🎉 Rewards unlocked! Check your profile."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
