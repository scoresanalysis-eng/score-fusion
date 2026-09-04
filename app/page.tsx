/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  TrendingUp,
  Users,
  Activity,
  Target,
  CheckCircle,
  Star,
  CreditCard,
  Crown,
  Loader2,
} from "lucide-react";
import Footer from "@/components/footer";
import Image from "next/image";
import { useApiClient } from "@/lib/api-client";

interface Match {
  id: string;
  homeTeam:
    | string
    | { id: string; name: string; shortName: string; logoUrl: string };
  awayTeam:
    | string
    | { id: string; name: string; shortName: string; logoUrl: string };
  homeTeamScore: number | null;
  awayTeamScore: number | null;
  status: string;
  minute?: number;
}

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
  ticketSnapshots: string[];
  isVIP: boolean;
  featured: boolean;
  status: string;
  result?: string;
  successRate?: number;
  createdAt: string;
  authorName?: string;
}

interface PredictionsApiResponse {
  success: boolean;
  data: {
    predictions: Tip[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
      totalPages: number;
    };
  };
}

interface Review {
  id: string;
  author: string;
  content: string;
  rating: number;
  date: string;
}

interface Carousel {
  id: string;
  title?: string;
  imageUrl: string;
  altText?: string;
  type: string;
  isActive: boolean;
  order: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  headerImage?: string;
}

type PredictionsData = PredictionsApiResponse["data"];

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const api = useApiClient();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [featuredTips, setFeaturedTips] = useState<Tip[]>([]);
  const [predictions, setPredictions] = useState<Tip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState({
    activeUsers: 0,
    todayWins: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [promoSlides, setPromoSlides] = useState([
    {
      img: "/images/home.gif",
      alt: "Win with expert tips",
      caption: "",
    },
    {
      img: "/images/home.gif",
      alt: "Live scores update",
      caption: "",
    },
    {
      img: "/images/home.gif",
      alt: "High odds betting",
      caption: "",
    },
  ]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Fetch real-time data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch live matches
        const matchesResponse = await fetch(
          "/api/livescores/matches?status=live&limit=3",
        );
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          if (matchesData.success && matchesData.data?.matches) {
            setLiveMatches(matchesData.data.matches);
          }
        }

        // Fetch featured tips
        const tipsResponse = await fetch(
          "/api/predictions?featured=true&limit=3",
        );
        if (tipsResponse.ok) {
          const tipsData = await tipsResponse.json();
          if (tipsData.success && tipsData.data?.tips) {
            setFeaturedTips(tipsData.data.tips);
          }
        }
        const predictionsResponse = await api.get<PredictionsData>(
          "/predictions?vip=false&limit=3&today=true",
        );
        // Fetch predictions (free tips)
        // const predictionsResponse = await fetch(
        //   "/predictions?vip=false&limit=3&today=true"
        // );
        if (predictionsResponse.success && predictionsResponse.data) {
          const freePredictions = predictionsResponse.data.predictions.filter(
            (tip: Tip) => !tip.isVIP,
          );
          setPredictions(freePredictions.slice(0, 5));
        }

        // Fetch reviews (mock)
        setReviews([
          {
            id: "1",
            author: "Danielle G.",
            content: "Amazing tips! Won 5/6 this week.",
            rating: 5,
            date: "Nov 10, 2025",
          },
          {
            id: "2",
            author: "Dukesbury A.",
            content: "Live scores are spot on. Great app!",
            rating: 4,
            date: "Nov 8, 2025",
          },
          {
            id: "3",
            author: "Jayden B.",
            content: "VIP predictions are worth every penny.",
            rating: 5,
            date: "Nov 5, 2025",
          },
        ]);

        // Fetch recent blog posts
        const blogsResponse = await fetch("/api/blog");
        if (blogsResponse.ok) {
          const blogsData = await blogsResponse.json();
          if (blogsData.success && blogsData.data?.blogs) {
            setBlogs(blogsData.data.blogs);
          }
        }

        // Fetch carousel images
        const carouselResponse = await fetch("/api/carousels?type=LANDING");
        if (carouselResponse.ok) {
          const carouselData = await carouselResponse.json();
          if (carouselData.carousels && carouselData.carousels.length > 0) {
            const slides = carouselData.carousels.map((c: Carousel) => ({
              img: c.imageUrl,
              alt: c.altText || c.title || "Promotion",
              caption: c.title || "",
            }));
            setPromoSlides(slides);
          }
        }

        // Fetch platform stats (you can create a dedicated endpoint for this)
        // For now, we'll use mock data but structured for real data
        setStats({
          activeUsers: 1247,
          todayWins: 89,
          successRate: 75,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh live matches every 30 seconds
    const interval = setInterval(() => {
      fetch("/api/livescores/matches?status=live&limit=3")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.matches) {
            setLiveMatches(data.data.matches);
          }
        })
        .catch(console.error);
    }, 30000);

    // Auto-slide carousel
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (promoSlides.length || 1));
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(slideInterval);
    };
  }, [api, promoSlides.length]);

  // Show nothing while checking auth to prevent flash
  if (isLoading) {
    return null;
  }

  // If user is authenticated, they will be redirected
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 leading-tight">
              Win More with{" "}
              <span className="text-primary">Expert Predictions</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 px-2">
              Data-driven betting tips, live scores, and proven strategies
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 sm:px-0">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/tips" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  View Free Tips
                </Button>
              </Link>
              <Link href="/subscriptions" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  See VIP Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Image Carousel - Promotional Banners */}
      <section className="border-b border-border bg-secondary">
        <div className="relative container mx-auto px-4 py-6 md:py-8 overflow-hidden">
          <div className="relative h-48 md:h-64 w-full rounded-lg">
            {promoSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
                onClick={() => router.push("/subscriptions")}
              >
                <Image
                  src={slide.img}
                  alt={slide.alt}
                  fill
                  className="object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-white text-center px-4">
                    {slide.caption}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-secondary">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-xl md:text-2xl font-bold">
                {stats.activeUsers.toLocaleString()}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Active Users
              </div>
            </div>
            <div className="text-center">
              <Trophy className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-xl md:text-2xl font-bold">
                {stats.todayWins}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Today&apos;s Wins
              </div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-primary mx-auto mb-1 md:mb-2" />
              <div className="text-xl md:text-2xl font-bold">
                {stats.successRate}%
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                Success Rate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIP Subscription Spotlight */}
      <section className="py-8 md:py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Unlock VIP Access
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Get exclusive correct score predictions, winning tickets, and
              premium insights
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg font-bold">Weekly</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary"> € 100.00</div>
                <div className="text-xs text-muted-foreground">per week</div>
                <div className="text-xs">
                  VIP tips • Correct scores • Priority support
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary border-2 ring-2 ring-primary/20">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg font-bold">Bi-Weekly</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">€ 200.00</div>
                <div className="text-xs text-muted-foreground">Two Weeks</div>
                <div className="text-xs">
                  Most Popular • Telegram group • Cancel anytime
                </div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg font-bold">Monthly</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">€ 400.00</div>
                <div className="text-xs text-muted-foreground">per month</div>
                <div className="text-xs">
                  Save big • Exclusive webinars • Detailed analysis
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-6 md:mt-8">
            <Link href="/subscriptions">
              <Button size="lg" className="px-8">
                Explore Full Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Live Scores + Featured Tips */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 md:gap-8">
            {/* Today's Predictions Table */}
            <div className="border-t border-border bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-4 md:mb-6 p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Today&apos;s Predictions
                </h2>
                <Link href="/tips">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="animate-spin h-8 w-8  mx-auto mb-4" />
                  {/* <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" /> */}
                  <p className="text-sm">Loading tips...</p>
                </div>
              ) : predictions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 px-4 pb-6 md:px-6 md:pb-8">
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
          </div>
        </div>
      </section>

      {/* Latest Blog Posts */}
      <section className="py-8 md:py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <svg
                className="h-5 w-5 md:h-6 md:w-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Latest News
            </h2>
            <Link href="/blog">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.length > 0 ? (
              blogs.slice(0, 3).map((blog) => (
                <Card
                  key={blog.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    {blog.headerImage && (
                      <div className="mb-4">
                        <Image
                          src={blog.headerImage}
                          alt={blog.title}
                          width={400}
                          height={200}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold mb-2 line-clamp-2">
                        <Link
                          href={`/blog/${blog.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {blog.title}
                        </Link>
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {blog.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      {/* <span>{blog.authorName}</span> */}
                      <span>
                        {new Date(blog.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>

                    <Link href={`/blog/${blog.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Read More
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                <p>No blog posts available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-8 md:py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            What Our Members Say
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6 p-4 md:p-6">
                  <div className="flex items-center mb-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    "{review.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{review.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {review.date}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="#">
              <Button variant="outline">Leave a Review</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 md:py-12 border-t border-border bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            Why ScoreFusion?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <Target className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" />
                <CardTitle className="text-base md:text-lg">
                  Expert Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs md:text-sm p-4 md:p-6 pt-0">
                AI-powered predictions from professional analysts with proven
                records
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <Trophy className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" />
                <CardTitle className="text-base md:text-lg">
                  High Success
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs md:text-sm p-4 md:p-6 pt-0">
                Over 75% success rate on VIP predictions with detailed analysis
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <Activity className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" />
                <CardTitle className="text-base md:text-lg">
                  Live Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs md:text-sm p-4 md:p-6 pt-0">
                Real-time scores, match events, and betting odds all in one
                place
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <Target className="h-7 w-7 md:h-8 md:w-8 text-primary mb-2" />
                <CardTitle className="text-base md:text-lg">
                  VIP Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs md:text-sm p-4 md:p-6 pt-0">
                Exclusive correct score predictions and draw alerts with
                real-time updates for VIP members
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-8 md:py-12 border-t border-border">
        <div className=" mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8">
            Secure & Trusted
          </h2>
          <div className="flex justify-center gap-6 text-center">
            <div>
              <h3 className="font-semibold mb-4">Available</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {["skrill", "western", "transfer"].map((logo) => (
                  <Image
                    key={logo}
                    src={`/images/${logo}.png`}
                    alt={logo}
                    width={120}
                    height={40}
                    className="opacity-70"
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Secure Payments</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {["visa", "master-card", "paypal"].map((icon) => (
                  <Image
                    key={icon}
                    src={`/images/${icon}.png`}
                    alt={icon}
                    width={120}
                    height={40}
                    className="opacity-70"
                  />
                  // <div key={icon} className="p-2 border rounded">
                  //   <CreditCard className="h-6 w-6 text-primary" />
                  // </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Now Section */}
      <section className="py-8 md:py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-4">
                Download ScoreFusion App
              </h2>
              <p className="text-base md:text-xl text-muted-foreground px-2 md:px-4">
                Get instant access to live scores, expert tips, and betting
                insights on the go
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
              {/* App Preview */}
              <div className="relative order-2 md:order-1 flex justify-center">
                <Image
                  src="/images/download.png"
                  alt="ScoreFusion App Interface"
                  height={240}
                  width={240}
                  className="rounded-lg md:rounded-2xl shadow-2xl w-full max-w-[280px] sm:max-w-xs md:max-w-sm object-cover"
                />
                <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg px-3 md:px-4 py-1.5 md:py-2 shadow-lg flex items-center gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Activity className="h-3 w-3 md:h-4 md:w-4 text-primary animate-pulse" />
                  <span className="font-medium">Live on iOS & Android</span>
                </div>
              </div>

              {/* Download Options */}
              <div className="space-y-4 md:space-y-6 order-1 md:order-2">
                <div>
                  <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">
                    Available On
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    {/* iOS Download */}
                    <Button
                      className="h-12 md:h-16 flex-1 justify-start px-3 md:px-6 gap-2 md:gap-3"
                      variant="outline"
                    >
                      <svg
                        className="h-6 w-6 md:h-8 md:w-8 shrink-0"
                        fill="#ffffff"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          {" "}
                          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>{" "}
                        </g>
                      </svg>{" "}
                      <div className="text-left min-w-0">
                        <div className="text-[10px] md:text-xs opacity-80 leading-tight">
                          Download on the
                        </div>
                        <div className="text-sm md:text-lg font-semibold leading-tight truncate">
                          App Store
                        </div>
                      </div>
                    </Button>

                    {/* Android Download */}
                    <Button
                      variant="outline"
                      className="h-12 md:h-16 flex-1 justify-start px-3 md:px-6 gap-2 md:gap-3"
                    >
                      <svg
                        className="h-6 w-6 md:h-8 md:w-8 shrink-0"
                        viewBox="0 0 32 32"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                        <g
                          id="SVGRepo_tracerCarrier"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></g>
                        <g id="SVGRepo_iconCarrier">
                          {" "}
                          <mask
                            id="mask0_87_8320"
                            maskUnits="userSpaceOnUse"
                            x="7"
                            y="3"
                            width="24"
                            height="26"
                          >
                            {" "}
                            <path
                              d="M30.0484 14.4004C31.3172 15.0986 31.3172 16.9014 30.0484 17.5996L9.75627 28.7659C8.52052 29.4459 7 28.5634 7 27.1663L7 4.83374C7 3.43657 8.52052 2.55415 9.75627 3.23415L30.0484 14.4004Z"
                              fill="#C4C4C4"
                            ></path>{" "}
                          </mask>{" "}
                          <g mask="url(#mask0_87_8320)">
                            {" "}
                            <path
                              d="M7.63473 28.5466L20.2923 15.8179L7.84319 3.29883C7.34653 3.61721 7 4.1669 7 4.8339V27.1664C7 27.7355 7.25223 28.2191 7.63473 28.5466Z"
                              fill="url(#paint0_linear_87_8320)"
                            ></path>{" "}
                            <path
                              d="M30.048 14.4003C31.3169 15.0985 31.3169 16.9012 30.048 17.5994L24.9287 20.4165L20.292 15.8175L24.6923 11.4531L30.048 14.4003Z"
                              fill="url(#paint1_linear_87_8320)"
                            ></path>{" "}
                            <path
                              d="M24.9292 20.4168L20.2924 15.8179L7.63477 28.5466C8.19139 29.0232 9.02389 29.1691 9.75635 28.766L24.9292 20.4168Z"
                              fill="url(#paint2_linear_87_8320)"
                            ></path>{" "}
                            <path
                              d="M7.84277 3.29865L20.2919 15.8177L24.6922 11.4533L9.75583 3.23415C9.11003 2.87878 8.38646 2.95013 7.84277 3.29865Z"
                              fill="url(#paint3_linear_87_8320)"
                            ></path>{" "}
                          </g>{" "}
                          <defs>
                            {" "}
                            <linearGradient
                              id="paint0_linear_87_8320"
                              x1="15.6769"
                              y1="10.874"
                              x2="7.07106"
                              y2="19.5506"
                              gradientUnits="userSpaceOnUse"
                            >
                              {" "}
                              <stop stopColor="#00C3FF"></stop>{" "}
                              <stop offset="1" stopColor="#1BE2FA"></stop>{" "}
                            </linearGradient>{" "}
                            <linearGradient
                              id="paint1_linear_87_8320"
                              x1="20.292"
                              y1="15.8176"
                              x2="31.7381"
                              y2="15.8176"
                              gradientUnits="userSpaceOnUse"
                            >
                              {" "}
                              <stop stopColor="#FFCE00"></stop>{" "}
                              <stop offset="1" stopColor="#FFEA00"></stop>{" "}
                            </linearGradient>{" "}
                            <linearGradient
                              id="paint2_linear_87_8320"
                              x1="7.36932"
                              y1="30.1004"
                              x2="22.595"
                              y2="17.8937"
                              gradientUnits="userSpaceOnUse"
                            >
                              {" "}
                              <stop stopColor="#DE2453"></stop>{" "}
                              <stop offset="1" stopColor="#FE3944"></stop>{" "}
                            </linearGradient>{" "}
                            <linearGradient
                              id="paint3_linear_87_8320"
                              x1="8.10725"
                              y1="1.90137"
                              x2="22.5971"
                              y2="13.7365"
                              gradientUnits="userSpaceOnUse"
                            >
                              {" "}
                              <stop stopColor="#11D574"></stop>{" "}
                              <stop offset="1" stopColor="#01F176"></stop>{" "}
                            </linearGradient>{" "}
                          </defs>{" "}
                        </g>
                      </svg>{" "}
                      <div className="text-left min-w-0">
                        <div className="text-[10px] md:text-xs opacity-80 leading-tight">
                          GET IT ON
                        </div>
                        <div className="text-sm md:text-lg font-semibold leading-tight truncate">
                          Google Play
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 md:pt-6">
                  <h4 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">
                    App Features:
                  </h4>
                  <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 shrink-0" />
                      <span>Push notifications for live matches</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 shrink-0" />
                      <span>Personalized tip recommendations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 shrink-0" />
                      <span>Track your betting history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 shrink-0" />
                      <span>Offline access to saved tips</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary mt-0.5 shrink-0" />
                      <span>Secure wallet management</span>
                    </li>
                  </ul>
                </div>

                {/* <div className="bg-secondary rounded-lg p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs md:text-sm font-bold">
                        4.8
                      </div>
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/40 border-2 border-background" />
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/60 border-2 border-background" />
                    </div>
                    <div className="text-xs md:text-sm min-w-0">
                      <div className="font-semibold">Rated 4.8/5</div>
                      <div className="text-muted-foreground truncate">
                        Over 10,000+ downloads
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">
            Ready to Start Winning?
          </h2>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 px-2">
            Join thousands of successful bettors. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-6 px-4 sm:px-0">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/vip" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Upgrade to VIP
              </Button>
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" />
              <span>Instant access</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
