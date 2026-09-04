"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Lock,
  Calendar,
  Target,
  ArrowLeft,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  BicepsFlexed,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
  viewCount: number;
  createdAt: string;
  authorName?: string;
  tags: string[];
  matchResult?: string;
  tipResult?: {
    id: string;
    settledAt: string;
    outcome: string;
    payout?: number;
    createdAt: string;
  };
}

export default function TipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tip, setTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [vipLocked, setVipLocked] = useState(false);
  const { user } = useAuth();

  const fetchTip = async () => {
    try {
      const res = await fetch(`/api/predictions/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTip(data.data.prediction);
      } else if (res.status === 401 || res.status === 403) {
        setVipLocked(true);
      } else if (res.status === 404) {
        router.push("/tips");
      }
    } catch (error) {
      console.error("Failed to fetch prediction:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const getResultIcon = () => {
    if (!tip?.result) return null;
    switch (tip.result) {
      case "won":
        return (
          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
        );
      case "lost":
        return <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />;
      case "void":
        return <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm md:text-base text-muted-foreground">
          Loading prediction...
        </p>
      </div>
    );
  }

  if (vipLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="pb-2 flex flex-col items-center">
            <Lock className="h-8 w-8 md:h-10 md:w-10 text-primary mb-2" />
            <CardTitle className="text-lg md:text-2xl">
              VIP Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <p className="text-sm md:text-base text-muted-foreground">
              This prediction is reserved for VIP members. Unlock full analysis,
              ticket snapshots, and expert insights by upgrading your access.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/vip">
                <Button size="sm" className="w-full sm:w-auto">
                  View VIP Plans
                </Button>
              </Link>
              {!user && (
                <Link href="/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Log in
                  </Button>
                </Link>
              )}
            </div>
            <div className="pt-2 border-t border-border mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs md:text-sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Prediction not found
            </p>
            <Link href="/tips">
              <Button size="sm">Back to Predictions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border bg-secondary">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <Link href="">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-2 -ml-2 text-xs md:text-sm"
            >
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Back to Predictions
            </Button>
          </Link>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-4 md:py-8">
        <div className="container mx-auto px-3 md:px-4">
          <div className="max-w-4xl mx-auto">
            {/* Title and Info */}
            <div className="mb-4 md:mb-6">
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3">
                {tip.title}
              </h1>
              {tip.summary && (
                <p className="text-sm md:text-base lg:text-lg text-muted-foreground mb-3 md:mb-4">
                  {tip.summary}
                </p>
              )}
              <div className="space-y-1 text-xs md:text-sm">
                {tip.predictedOutcome && (
                  <div>
                    <span className="text-muted-foreground">Prediction: </span>
                    <span className="font-medium">{tip.predictedOutcome}</span>
                  </div>
                )}
                {tip.confidenceLevel && (
                  <div>
                    <span className="text-muted-foreground">
                      Confidence Level:{" "}
                    </span>
                    <span className="font-medium">{tip.confidenceLevel}%</span>
                  </div>
                )}
                {tip.result && (
                  <div className="flex items-center gap-1.5">
                    {getResultIcon()}
                    <div>
                      <span className="text-muted-foreground">Result: </span>
                      <span
                        className={`font-medium capitalize ${
                          tip.result === "won"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : tip.result === "lost"
                              ? "text-red-500"
                              : ""
                        }`}
                      >
                        {tip.result}
                      </span>
                    </div>
                  </div>
                )}
                {tip.isVIP && (
                  <div>
                    <span className="text-muted-foreground">Access: </span>
                    <span className="font-medium text-primary">
                      VIP Exclusive
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Team Match Display */}
            {(tip.homeTeam || tip.awayTeam) && (
              <Card className="mb-4 md:mb-6">
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center min-w-0">
                      {tip.homeTeam && (
                        <>
                          {tip.homeTeam.logoUrl && (
                            <img
                              src={tip.homeTeam.logoUrl}
                              alt={tip.homeTeam.name}
                              className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-1.5 md:mb-2 object-contain"
                            />
                          )}
                          <p className="text-xs md:text-sm lg:text-base font-bold line-clamp-2">
                            {tip.homeTeam.name}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="px-3 md:px-6 text-muted-foreground font-bold text-sm md:text-lg lg:text-xl shrink-0">
                      VS
                    </div>
                    <div className="flex-1 text-center min-w-0">
                      {tip.awayTeam && (
                        <>
                          {tip.awayTeam.logoUrl && (
                            <img
                              src={tip.awayTeam.logoUrl}
                              alt={tip.awayTeam.name}
                              className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-1.5 md:mb-2 object-contain"
                            />
                          )}
                          <p className="text-xs md:text-sm lg:text-base font-bold line-clamp-2">
                            {tip.awayTeam.name}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {tip.matchResult && (
                    <div className="text-center text-sm md:text-base font-medium text-primary mt-2">
                      {tip.matchResult}
                    </div>
                  )}
                  {tip.matchDate && (
                    <div className="flex items-center justify-center gap-1 mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                      <span>
                        {new Date(tip.matchDate).toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          timeZone: "UTC",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analytics Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
              {tip.odds && (
                <Card>
                  <CardContent className="p-3 md:p-4 text-center">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary mx-auto mb-1" />
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">
                      {/* {tip.odds} */}
                      {Number(tip.odds).toFixed(2)}
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Odds
                    </div>
                  </CardContent>
                </Card>
              )}
              {tip.confidenceLevel && (
                <Card>
                  <CardContent className="p-3 md:p-4 text-center">
                    <BicepsFlexed className="h-5 w-5 md:h-6 md:w-6 text-primary mx-auto mb-1" />
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">
                      {tip.confidenceLevel}%
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Confidence
                    </div>
                  </CardContent>
                </Card>
              )}

              {tip.predictedOutcome && (
                <Card>
                  <CardContent className="p-3 md:p-4 text-center">
                    <Lightbulb className="h-5 w-5 md:h-6 md:w-6 text-primary mx-auto mb-1" />
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">
                      {/* {tip.odds} */}
                      {tip.predictedOutcome}
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Predicted
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-3 md:p-4 text-center">
                  <Eye className="h-5 w-5 md:h-6 md:w-6 text-primary mx-auto mb-1" />
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold">
                    {tip.viewCount}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    Views
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Content */}
            <Card className="mb-4 md:mb-6">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg lg:text-xl">
                  Expert Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                  <div
                    className="text-sm md:text-base leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: tip.content }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ticket Snapshots */}
            {tip.ticketSnapshots && tip.ticketSnapshots.length > 0 && (
              <Card className="mb-4 md:mb-6">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-base md:text-lg lg:text-xl flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                    Ticket Snapshots ({tip.ticketSnapshots.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {tip.ticketSnapshots.map((snapshot, index) => (
                      <div
                        key={index}
                        className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors cursor-pointer"
                        onClick={() => setSelectedImage(snapshot)}
                      >
                        <img
                          src={snapshot}
                          alt={`Ticket snapshot ${index + 1}`}
                          className="w-full h-auto object-contain"
                        />
                        <div className="absolute top-2 right-2">
                          <div className="bg-black/70 text-white text-[10px] md:text-xs px-1.5 py-0.5 rounded">
                            {index + 1}/{tip.ticketSnapshots.length}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4 text-center">
                    Click on any image to view full size
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg lg:text-xl">
                  Prediction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                  {tip.confidenceLevel && (
                    <div>
                      <span className="text-muted-foreground">
                        Confidence Level:
                      </span>
                      <span className="ml-2 font-medium">
                        {tip.confidenceLevel}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Published:</span>
                    <span className="ml-2 font-medium">
                      {new Date(tip.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {/* {tip.predictionType && (
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium capitalize">
                        {tip.predictionType.replace(/_/g, " ")}
                      </span>
                    </div>
                  )} */}
                  {tip.successRate && (
                    <div>
                      <span className="text-muted-foreground">
                        Success Rate:
                      </span>
                      <span className="ml-2 font-medium">
                        {tip.successRate}%
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Sport:</span>
                    <span className="ml-2 font-medium">{tip.sport}</span>
                  </div>
                  {tip.league && (
                    <div>
                      <span className="text-muted-foreground">League:</span>
                      <span className="ml-2 font-medium">{tip.league}</span>
                    </div>
                  )}
                  {tip.oddsSource && (
                    <div>
                      <span className="text-muted-foreground">
                        Odds Source:
                      </span>
                      <span className="ml-2 font-medium capitalize">
                        {tip.oddsSource}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 font-medium capitalize">
                      {tip.status}
                    </span>
                  </div>
                  {tip.featured && (
                    <div>
                      <span className="text-muted-foreground">Featured:</span>
                      <span className="ml-2 font-medium text-primary">Yes</span>
                    </div>
                  )}
                </div>
                {tip.tipResult && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="font-medium mb-2 text-sm md:text-base">
                      Tip Result
                    </h4>
                    <div className="space-y-1 text-xs md:text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Settled At:
                        </span>
                        <span className="ml-2 font-medium">
                          {new Date(tip.tipResult.settledAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outcome:</span>
                        <span className="ml-2 font-medium capitalize">
                          {tip.tipResult.outcome}
                        </span>
                      </div>
                      {tip.tipResult.payout && (
                        <div>
                          <span className="text-muted-foreground">Payout:</span>
                          <span className="ml-2 font-medium">
                            €{tip.tipResult.payout}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {tip.tags && tip.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <span className="text-muted-foreground text-xs md:text-sm">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                      {tip.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 bg-secondary text-secondary-foreground rounded"
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Full-size Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-sm md:text-base hover:text-gray-300"
            >
              Close ✕
            </button>
            <img
              src={selectedImage}
              alt="Full size ticket"
              className="w-full h-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
