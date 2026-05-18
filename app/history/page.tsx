"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Crown, Loader2 } from "lucide-react";
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

export default function HistoryPage() {
  const api = useApiClient();
  const [allPredictions, setAllPredictions] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "vip">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredPredictions = useMemo(() => {
    return allPredictions.filter((tip) =>
      filter === "all" ? true : filter === "free" ? !tip.isVIP : tip.isVIP,
    );
  }, [allPredictions, filter]);

  const displayedPredictions = useMemo(() => {
    const arr = [...filteredPredictions];
    arr.sort((a, b) => {
      const aDate = a.matchDate ? new Date(a.matchDate).getTime() : -Infinity;
      const bDate = b.matchDate ? new Date(b.matchDate).getTime() : -Infinity;
      return bDate - aDate;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return arr.slice(startIndex, endIndex);
  }, [filteredPredictions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPredictions.length / itemsPerPage);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/predictions?history=true");
      if (res.success) {
        const data = res.data as { predictions: Tip[] };
        setAllPredictions(data.predictions || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">
            Predictions History
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-8">
            View all completed predictions and their outcomes
          </p>

          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-8">
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
              className="text-xs md:text-sm flex items-center gap-1"
              size="sm"
            >
              <Crown className="h-3 w-3 md:h-4 md:w-4" />
              VIP Predictions
            </Button>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-4 lg:p-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                Completed Predictions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4 lg:p-6 pt-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
                  <p className="text-sm">Loading history...</p>
                </div>
              ) : filteredPredictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {displayedPredictions.map((tip) => (
                    <PredictionCard
                      key={tip.id}
                      item={tip}
                      showTipResultDetails
                      showResultBadges
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 opacity-50" />
                  <p className="text-sm md:text-base lg:text-lg">
                    No completed predictions yet
                  </p>
                  <p className="text-xs md:text-sm mt-2">
                    Completed predictions will appear here after matches
                    conclude
                  </p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
