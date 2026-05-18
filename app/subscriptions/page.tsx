/* eslint-disable react/no-unescaped-entities */
"use client";

import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Check,
  Star,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Trophy,
  Target,
  Clock,
  DollarSign,
  Gift,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const api = useApiClient();
  const [hasVIPAccess, setHasVIPAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const todaysDate = new Date().getMinutes();
  const [timeLeft, setTimeLeft] = useState(todaysDate + 24 * 60 * 60); // 24 hours in seconds
  const router = useRouter();
  useEffect(() => {
    async function checkVIPStatus() {
      if (user && !user.guest) {
        try {
          const res = await api.get("/vip/status");
          if (res.success) {
            const data = res.data as VIPStatus;
            setHasVIPAccess(data.hasAccess);
          }
        } catch (error) {
          console.error("Error checking VIP status:", error);
        }
      }
      setLoading(false);
    }

    checkVIPStatus();
  }, [user, api]);

  // Countdown timer for limited offer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev + 2 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600 - 3);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timeLeftNumber = timeLeft / 11;
  const plans = [
    {
      id: "weekly",
      name: "Weekly VIP",
      price: 100.0,
      originalPrice: 200.0,
      period: "week",
      popular: false,
      features: [
        "All VIP tips & updates",
        "Correct score predictions",
        "Winning ticket screenshots",
        "Priority support",
        "7-day access",
      ],
      savings: "Perfect for testing",
    },
    {
      id: "monthly",
      name: "2 Weeks VIP",
      price: 200.0,
      originalPrice: 400.0,
      period: "month",
      popular: true,
      features: [
        "All VIP tips & updates",
        "Correct score predictions",
        "Winning ticket screenshots",
        "Priority support",
        "Advanced analytics",
        "Telegram VIP group",
        "Cancel anytime",
      ],
      savings: "Most Popular",
    },
    {
      id: "Monthly",
      name: "Monthly VIP",
      price: 400.0,
      originalPrice: 800.0,
      period: "year",
      popular: false,
      features: [
        "All VIP tips & updates",
        "Correct score predictions",
        "Winning ticket screenshots",
        "Priority support",
        "Advanced analytics",
        "Telegram VIP group",
        "Personal betting consultant",
        "Exclusive talks",
      ],
      savings: "Save $400",
    },
  ];

  const testimonials = [
    {
      name: "Danielle G.",
      earnings: "$8,400",
      period: "last month",
      text: "VIP tips changed my betting game completely!",
      rating: 5,
    },
    {
      name: "Dukesbury A.",
      earnings: "$9,850",
      period: "3 weeks",
      text: "85% win rate on correct scores. Incredible!",
      rating: 5,
    },
    {
      name: "Jayden B.",
      earnings: "$3,200",
      period: "6 weeks",
      text: "Best investment I've made. Pays for itself!",
      rating: 5,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* {!hasVIPAccess && (
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
              <Clock className="h-4 w-4" />
              LIMITED TIME: {formatTime(timeLeft)}
            </div>
          )} */}

          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Join{" "}
            {timeLeftNumber.toLocaleString("en-NG", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}{" "}
            Winners
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-3xl mx-auto">
            Get exclusive VIP betting tips with{" "}
            <span className="text-primary font-bold">85%+ win rates</span> and
            start earning consistent profits
          </p>

          {/* Social Proof */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <Trophy className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                9/10 tips won last week
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {timeLeftNumber.toLocaleString("en-NG", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                active members
              </span>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                $1.2M+ member earnings
              </span>
            </div>
          </div>
        </div>

        {/* Current Status for VIP Users */}
        {hasVIPAccess && (
          <Card className="border-green-500 bg-green-50 mb-8">
            <CardContent className="p-6 text-center">
              <Crown className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                You&apos;re Already VIP! 🎉
              </h2>
              <p className="text-green-700 mb-4">
                Enjoy your exclusive access to premium tips and features
              </p>
              <Link href="/vip">
                <Button className="bg-green-600 hover:bg-green-700">
                  Access VIP Area
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans - hidden for VIP users */}
        {!hasVIPAccess && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:scale-105 ${
                  plan.popular
                    ? "border-primary shadow-2xl ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-linear-to-r from-primary to-primary/80 text-white text-center py-2 text-sm font-bold">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    MOST POPULAR - 50% OFF
                  </div>
                )}

                <CardHeader
                  className={`text-center ${plan.popular ? "pt-12" : "pt-6"}`}
                >
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl font-bold text-primary">
                        €{plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.period}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg line-through text-muted-foreground">
                        ${plan.originalPrice}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        50% OFF
                      </Badge>
                    </div>
                    <p className="text-sm text-primary font-medium">
                      {plan.savings}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full h-12 text-base font-bold ${
                      plan.popular
                        ? "bg-linear-to-r from-primary to-primary/80 hover:shadow-lg"
                        : ""
                    }`}
                    onClick={() => router.push("/checkout")}
                  >
                    {`Get ${plan.name}`}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Secure payment • Cancel anytime • 7-day money-back guarantee
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Features Showcase */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center p-6">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">85%+ Win Rate</h3>
            <p className="text-sm text-muted-foreground">
              Consistently high success rates on all VIP predictions
            </p>
          </Card>

          <Card className="text-center p-6">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Verified Results</h3>
            <p className="text-sm text-muted-foreground">
              Real winning ticket screenshots and transparent tracking
            </p>
          </Card>

          <Card className="text-center p-6">
            <Zap className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Instant Access</h3>
            <p className="text-sm text-muted-foreground">
              Get immediate access to VIP tips and exclusive content
            </p>
          </Card>

          <Card className="text-center p-6">
            <Star className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Expert Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Deep insights from professional betting analysts
            </p>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">
            What Our Members Say
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Verified Member
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {testimonial.earnings}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.period}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-bold mb-2">
                How quickly will I see results?
              </h3>
              <p className="text-sm text-muted-foreground">
                Most members see positive results within their first week. Our
                VIP tips have an 85%+ success rate.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can cancel your subscription at any time. No long-term
                commitments required.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">What makes VIP tips different?</h3>
              <p className="text-sm text-muted-foreground">
                VIP tips include detailed analysis, correct score predictions,
                and winning ticket screenshots for verification.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">
                Is there a money-back guarantee?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes! We offer a 7-day money-back guarantee if you're not
                satisfied with our VIP service.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA - hidden for VIP users */}
        {!hasVIPAccess && (
          <Card className="bg-linear-to-r from-primary/10 to-primary/5 border-primary">
            <CardContent className="text-center p-8">
              <Crown className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">
                Ready to Start Winning?
              </h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of successful bettors who trust ScoreFusion VIP
                for consistent profits
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  className="bg-linear-to-r from-primary to-primary/80 text-lg px-8 py-4"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Start Your VIP Journey
                </Button>
                <div className="text-sm text-muted-foreground">
                  <Gift className="inline h-4 w-4 mr-1" />
                  Limited time: 50% OFF expires in {formatTime(timeLeft)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
