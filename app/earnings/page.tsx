"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Users,
  Gift,
  ArrowUpRight,
  Calendar,
} from "lucide-react";

interface Earning {
  id: string;
  amount: number;
  type: string;
  source: string;
  status: string;
  createdAt: string;
}

export default function EarningsPage() {
  const { user, isLoading } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      fetchEarnings();
    }
  }, [isLoading, user]);

  const fetchEarnings = async () => {
    try {
      const res = await fetch("/api/earnings");
      if (res.ok) {
        const data = await res.json();
        setEarnings(data.earnings || []);
        setStats(data.stats || { total: 0, pending: 0, paid: 0, thisMonth: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEarningTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "referral":
        return <Users className="h-4 w-4" />;
      case "bet_win":
        return <TrendingUp className="h-4 w-4" />;
      case "bonus":
        return <Gift className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Coming Soon Banner */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="text-center">
            <Badge className="bg-primary-foreground text-primary font-bold text-xs md:text-sm px-3 py-1">
              COMING SOON
            </Badge>
            <p className="text-xs md:text-sm mt-1 md:mt-2 opacity-90">
              This feature is currently under development and will be available
              soon
            </p>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="border-b border-border bg-secondary">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">Your Earnings</h1>
            <p className="text-xl text-muted-foreground">
              Track your earnings from referrals, wins, and bonuses
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">
                    ${stats.total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">
                    ${stats.pending.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Paid Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">
                    ${stats.paid.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">
                    ${stats.thisMonth.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {!user && !isLoading && (
            <Card className="mb-8 border-2 border-primary">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold mb-2">
                  Sign up to start earning
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create an account to track your earnings and get paid
                </p>
                <Link href="/signup">
                  <Button size="lg">Create Account</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Earnings List */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Earnings</h2>

            {loading ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Loading earnings...
                </CardContent>
              </Card>
            ) : earnings.length > 0 ? (
              <div className="space-y-4">
                {earnings.map((earning) => (
                  <Card key={earning.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
                            {getEarningTypeIcon(earning.type)}
                          </div>
                          <div>
                            <div className="font-bold">
                              {earning.type.replace("_", " ").toUpperCase()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {earning.source}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            +${earning.amount.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                earning.status === "PAID"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary"
                              }
                            >
                              {earning.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(earning.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No earnings yet. Start winning bets or refer friends to
                    earn!
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/tips">
                      <Button>View Tips</Button>
                    </Link>
                    {/* <Link href="/referral">
                      <Button variant="outline">Refer Friends</Button>
                    </Link> */}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* How to Earn Section */}
      <section className="border-t border-border bg-secondary py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Ways to Earn</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Refer Friends</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Earn 20% commission on your friends&apos; VIP subscriptions
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Win Bets</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Get bonus earnings on winning streaks and high-value bets
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Gift className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Bonuses</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Earn special bonuses through promotions and achievements
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
