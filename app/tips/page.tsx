"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Lock, Target, Loader2 } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { PredictionCard } from "@/components/prediction-card";

interface Tip {
  id: string;
  title: string;
  summary?: string;
  content: string;
  odds?: number;
  oddsSource?: string;
  sport: string;
  league?: string;
  matchDate?: string;
  homeTeam?: {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
  };
  awayTeam?: {
    id: string;
    name: string;
    shortName?: string;
    logoUrl?: string;
  };
  predictionType?: string;
  predictedOutcome?: string;
  confidenceLevel?: number;
  ticketSnapshots: string[];
  isVIP: boolean;
  featured: boolean;
  status: string;
  result?: string;
  successRate?: number;
  category?: string;
  createdAt: string;
  authorName?: string;
  matchResult?: string;
  tipResult?: {
    id: string;
    settledAt: string;
    outcome: string;
    payout?: number;
    createdAt: string;
  };
}

interface PredictionsData {
  predictions: Tip[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [historyTips, setHistoryTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "vip">("all");
  const [viewMode, setViewMode] = useState<"current" | "history">("current");
  const [hasVIPAccess, setHasVIPAccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const api = useApiClient();

  useEffect(() => {
    const fetchTips = async () => {
      try {
        setLoading(true);
        const vipStatusResponse = await api.get("/vip/status");
        const vipAccess = Boolean(
          vipStatusResponse.success &&
          vipStatusResponse.data &&
          (vipStatusResponse.data as { hasAccess: boolean }).hasAccess,
        );
        setHasVIPAccess(vipAccess);

        const [currentResponse, historyResponse] = await Promise.all([
          api.get<PredictionsData>("/predictions"),
          api.get<PredictionsData>("/predictions?history=true"),
        ]);

        const vipCurrentResponse = vipAccess
          ? await api.get<PredictionsData>("/predictions?vip=true")
          : null;

        if (
          currentResponse.success &&
          currentResponse.data &&
          historyResponse.success &&
          historyResponse.data
        ) {
          const currentPredictions = currentResponse.data.predictions || [];
          const vipCurrentPredictions =
            vipCurrentResponse?.success && vipCurrentResponse.data
              ? vipCurrentResponse.data.predictions || []
              : [];
          const allHistoryPredictions = historyResponse.data.predictions || [];

          const now = new Date();
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          const isHistorical = (p: Tip) => {
            const hasResult = p.result && p.result !== "pending";
            const isPast = p.matchDate
              ? new Date(p.matchDate) < twoHoursAgo
              : false;
            return Boolean(hasResult || isPast);
          };

          // Filter current predictions to exclude historical ones
          const filteredCurrent = [
            ...currentPredictions,
            ...vipCurrentPredictions,
          ].filter((p) => !isHistorical(p));
          // Use all historical predictions from the history endpoint
          const filteredHistory = allHistoryPredictions;

          setTips(filteredCurrent);
          setHistoryTips(filteredHistory);
        }
      } catch (error) {
        console.error("Failed to fetch predictions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTips();
  }, [api]);

  const filteredTips = useMemo(() => {
    const tipsToFilter = viewMode === "current" ? tips : historyTips;
    return tipsToFilter.filter((tip) => {
      if (filter === "all") return true;
      if (filter === "free") return !tip.isVIP;
      if (filter === "vip") return tip.isVIP;
      return true;
    });
  }, [tips, historyTips, filter, viewMode]);

  // Reset to page 1 when filter or viewMode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, viewMode]);

  const displayedTips = useMemo(() => {
    const arr = [...filteredTips];
    arr.sort((a, b) => {
      const aDate = a.matchDate ? new Date(a.matchDate).getTime() : -Infinity;
      const bDate = b.matchDate ? new Date(b.matchDate).getTime() : -Infinity;
      if (viewMode === "current") {
        const aVal = a.matchDate ? aDate : Infinity;
        const bVal = b.matchDate ? bDate : Infinity;
        return aVal - bVal;
      } else {
        return bDate - aDate;
      }
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return arr.slice(startIndex, endIndex);
  }, [filteredTips, viewMode, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTips.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b border-border bg-secondary">
        <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 lg:py-12">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 lg:mb-4">
              Expert Sports Predictions
            </h1>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground">
              Data-driven analysis and predictions from professional analysts.
              Get free predictions and premium VIP tips.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 lg:py-6">
          <div className="grid grid-cols-3 gap-2 md:gap-4 lg:gap-6">
            <div className="text-center">
              <Target className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-base md:text-lg lg:text-xl font-bold">
                {tips.filter((t) => !t.isVIP).length}
              </div>
              <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                Free Predictions
              </div>
            </div>
            <div className="text-center">
              <Lock className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-base md:text-lg lg:text-xl font-bold">
                {tips.filter((t) => t.isVIP).length}
              </div>
              <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                VIP Predictions
              </div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-base md:text-lg lg:text-xl font-bold">
                {historyTips.filter((t) => t.result === "won").length}
              </div>
              <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">
                Winning Predictions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips List */}
      <section className="py-4 md:py-8 lg:py-12">
        <div className="container mx-auto px-3 md:px-4">
          {/* View Mode Tabs */}
          <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6">
            <Button
              variant={viewMode === "current" ? "default" : "outline"}
              onClick={() => setViewMode("current")}
              className="text-xs md:text-sm"
              size="sm"
            >
              Current Predictions ({tips.length})
            </Button>
            <Button
              variant={viewMode === "history" ? "default" : "outline"}
              onClick={() => setViewMode("history")}
              className="text-xs md:text-sm"
              size="sm"
            >
              History ({historyTips.length})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 lg:mb-8">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="text-xs md:text-sm"
              size="sm"
            >
              All Predictions
            </Button>
            <Button
              variant={filter === "free" ? "default" : "outline"}
              onClick={() => setFilter("free")}
              className="text-xs md:text-sm"
              size="sm"
            >
              Free Predictions
            </Button>
            <Button
              variant={filter === "vip" ? "default" : "outline"}
              onClick={() => setFilter("vip")}
              className="text-xs md:text-sm"
              size="sm"
            >
              <Lock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              VIP Predictions
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
              <p className="text-sm">Loading tips...</p>
            </div>
          ) : viewMode === "current" && filter === "vip" && !hasVIPAccess ? (
            <Card>
              <CardContent className="p-6 md:p-8 lg:p-12 text-center">
                <p className="text-muted-foreground mb-4 text-xs md:text-sm lg:text-base">
                  Unlock premium tips by subscribing to VIP.
                </p>
                <Link href="/vip">
                  <Button size="sm" className="text-xs md:text-sm">
                    <Lock className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    Get VIP Access
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : viewMode === "current" && tips.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 lg:p-12 text-center">
                <p className="text-muted-foreground mb-4 text-xs md:text-sm lg:text-base">
                  No current predictions available at the moment. Check back
                  soon or view our history!
                </p>
                <Button size="sm" onClick={() => setViewMode("history")}>
                  View History
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "history" && historyTips.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 lg:p-12 text-center">
                <p className="text-muted-foreground mb-4 text-xs md:text-sm lg:text-base">
                  No historical predictions yet. Check back after some
                  predictions are completed!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {displayedTips.map((tip) => (
                <PredictionCard
                  key={tip.id}
                  item={tip}
                  showTipResultDetails={viewMode === "history"}
                  showResultBadges={viewMode === "history"}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {!loading &&
            filteredTips.length === 0 &&
            (filter === "vip" && !hasVIPAccess ? (
              <Card>
                <CardContent className="p-6 md:p-8 lg:p-12 text-center">
                  <p className="text-muted-foreground mb-4 text-xs md:text-sm lg:text-base">
                    Unlock premium tips by subscribing to VIP.
                  </p>
                  <Link href="/vip">
                    <Button size="sm" className="text-xs md:text-sm">
                      <Lock className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Get VIP Access
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              (viewMode === "current"
                ? tips.length > 0
                : historyTips.length > 0) && (
                <Card>
                  <CardContent className="p-6 md:p-8 lg:p-12 text-center">
                    <p className="text-muted-foreground mb-4 text-xs md:text-sm lg:text-base">
                      No{" "}
                      {filter === "all"
                        ? ""
                        : filter === "free"
                          ? "free"
                          : "VIP"}{" "}
                      predictions match your filter.
                    </p>
                    <Button size="sm" onClick={() => setFilter("all")}>
                      Clear Filter
                    </Button>
                  </CardContent>
                </Card>
              )
            ))}
        </div>
      </section>

      {/* CTA Section */}
      {!hasVIPAccess && (
        <section className="border-t border-border bg-secondary py-6 md:py-8 lg:py-12">
          <div className="container mx-auto px-3 md:px-4 text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 md:mb-3 lg:mb-4">
              Want Premium Predictions?
            </h2>
            <p className="text-sm md:text-base lg:text-xl text-muted-foreground mb-4 md:mb-6 px-2">
              Upgrade to VIP for exclusive expert analysis, ticket snapshots,
              and premium predictions
            </p>
            <Link href="/vip">
              <Button size="sm" className="text-xs md:text-sm">
                <Lock className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Get VIP Access
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
