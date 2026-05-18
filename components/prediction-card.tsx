"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Crown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type PredictionCardItem = {
  id: string;
  title: string;
  summary?: string;
  sport: string;
  league?: string;
  matchDate?: string;
  homeTeam?: {
    name: string;
    logoUrl?: string;
  };
  awayTeam?: {
    name: string;
    logoUrl?: string;
  };
  predictedOutcome?: string;
  odds?: number;
  ticketSnapshots?: string[];
  isVIP?: boolean;
  result?: string;
  tipResult?: {
    settledAt: string;
    outcome: string;
    payout?: number;
  };
};

type PredictionCardProps = {
  item: PredictionCardItem;
  hrefPrefix?: string;
  className?: string;
  showTipResultDetails?: boolean;
  showTicketSnapshots?: boolean;
  showResultBadges?: boolean;
  showVipIcon?: boolean;
};

export function PredictionCard({
  item,
  hrefPrefix = "/tips",
  className = "hover:shadow-lg transition-all hover:border-primary/50",
  showTipResultDetails = false,
  showTicketSnapshots = true,
  showResultBadges = true,
  showVipIcon = true,
}: PredictionCardProps) {
  return (
    <Link href={`${hrefPrefix}/${item.id}`} className="block">
      <Card className={className}>
        <CardContent className="p-3 sm:p-4">
          {item.homeTeam && item.awayTeam ? (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.homeTeam.logoUrl && (
                    <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                      <img
                        src={item.homeTeam.logoUrl}
                        alt={item.homeTeam.name}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="font-semibold text-sm sm:text-base truncate">
                    {item.homeTeam.name}
                  </span>
                </div>
                <div className="px-2 py-1 bg-muted rounded text-xs font-bold">
                  VS
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="font-semibold text-sm sm:text-base truncate">
                    {item.awayTeam.name}
                  </span>
                  {item.awayTeam.logoUrl && (
                    <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                      <img
                        src={item.awayTeam.logoUrl}
                        alt={item.awayTeam.name}
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <h3 className="font-semibold text-sm sm:text-base mb-2">
              {item.title}
            </h3>
          )}

          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-2">
            <span className="px-2 py-0.5 bg-secondary rounded">
              {item.sport}
            </span>
            {item.league && <span className="truncate">{item.league}</span>}
          </div>
          <div className="flex items-center justify-center gap-2 text-[14px] sm:text-xs text-muted-foreground mb-2">
            {item.matchDate && (
              <span className="truncate">
                {new Date(item.matchDate).toLocaleString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            )}
          </div>

          {item.summary && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.summary}
            </p>
          )}

          {showTipResultDetails && item.tipResult && (
            <details className="mb-3">
              <summary className="text-[10px] md:text-xs lg:text-sm font-medium cursor-pointer text-primary hover:text-primary/80">
                Tip Result Details
              </summary>
              <div className="mt-1 space-y-1 text-[10px] md:text-xs lg:text-sm pl-2 border-l-2 border-primary/20">
                <div>
                  <span className="text-muted-foreground">Settled At: </span>
                  <span className="font-medium">
                    {new Date(item.tipResult.settledAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome: </span>
                  <span className="font-medium capitalize">
                    {item.tipResult.outcome}
                  </span>
                </div>
                {item.tipResult.payout && (
                  <div>
                    <span className="text-muted-foreground">Payout: </span>
                    <span className="font-medium">
                      €{item.tipResult.payout}
                    </span>
                  </div>
                )}
              </div>
            </details>
          )}

          {showTicketSnapshots &&
            !item.isVIP &&
            item.ticketSnapshots &&
            item.ticketSnapshots.length > 0 && (
              <div className="mb-3 text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span>
                  {item.ticketSnapshots.length} ticket snapshot(s) available
                </span>
              </div>
            )}

          <div className="flex items-center justify-between pt-2 border-t gap-2 flex-wrap">
            {item.predictedOutcome && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  Prediction:
                </span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {item.predictedOutcome}
                </span>
              </div>
            )}
            {item.odds && (
              <div className="px-2 py-1 bg-primary/10 text-primary rounded font-bold text-xs sm:text-sm">
                Odds: {Number(item.odds).toFixed(2)}
              </div>
            )}
            {showVipIcon && item.isVIP && (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            {showResultBadges && item.result === "won" && (
              <div className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                Won
              </div>
            )}
            {showResultBadges && item.result === "lost" && (
              <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                Lost
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
