/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle,
  MessageSquare,
  Mail,
  Phone,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "weekly",
    name: "Weekly VIP",
    price: 100,
    period: "week",
    features: [
      "All VIP tips & updates",
      "Correct score predictions",
      "Winning ticket screenshots",
      "Priority support",
      "7-day access",
    ],
  },
  {
    id: "biweekly",
    name: "2 Weeks VIP",
    price: 200,
    period: "2 weeks",
    features: [
      "All VIP tips & updates",
      "Correct score predictions",
      "Winning ticket screenshots",
      "Priority support",
      "Advanced analytics",
      "Telegram VIP group",
      "Cancel anytime",
    ],
  },
  {
    id: "monthly",
    name: "Monthly VIP",
    price: 400,
    period: "month",
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
  },
];

// Move this function inside the component and accept username as parameter
const getContactLinks = (plan: Plan, username: string) => [
  {
    label: "WhatsApp",
    value: "+84 867 084 414",
    href: `https://wa.me/84867084414?text=Hi!%20I%20want%20to%20subscribe%20to%20${encodeURIComponent(
      plan.name,
    )}%20(%E2%82%AC${plan.price}).%20Please%20send%20payment%20details.`,
    color: "bg-green-500 hover:bg-green-600",
    icon: MessageSquare,
  },
  {
    label: "Telegram",
    value: "@Donaldauthorr",
    href: "https://t.me/Donaldauthorr",
    color: "bg-sky-500 hover:bg-sky-600",
    icon: MessageSquare,
  },
  {
    label: "Email",
    value: "Scorefusionn@gmail.com",
    href: `mailto:Scorefusionn@gmail.com?subject=VIP%20Subscription%20-%20${encodeURIComponent(
      plan.name,
    )}&body=Hi,%0D%0A%0D%0AI'd%20like%20to%20purchase%20the%20${
      plan.name
    }%20for%20%E2%82%AC${
      plan.price
    }.%0D%0A%0D%0APlease%20send%20me%20payment%20details.%0D%0AUsername:%20${
      username || "[Your Username]"
    }%0D%0AThank%20you!`,
    color: "bg-blue-500 hover:bg-blue-600",
    icon: Mail,
  },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  useEffect(() => {
    const planId = searchParams.get("plan");
    if (planId) {
      const plan = plans.find((p) => p.id === planId);
      if (plan) setSelectedPlan(plan);
    }
    // Default to monthly if no plan selected
    if (!selectedPlan && !planId) {
      setSelectedPlan(plans[1]); // 2 Weeks is a good middle option
    }
  }, [searchParams]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsChangingPlan(false);
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const links = getContactLinks(selectedPlan, user?.displayName || "");

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Get VIP Access Now
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Choose your plan and contact us to activate instantly
          </p>
        </div>

        {/* Selected Plan Card */}
        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center gap-3 text-md">
                <Shield className="h-7 w-7 text-primary" />
                Your Selected Plan
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChangingPlan(true)}
              >
                <Pencil className="h-4 w-4" />
                Change Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isChangingPlan ? (
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan.id === plan.id
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <div className="text-3xl font-bold text-primary">
                        €{plan.price}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">
                      per {plan.period}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <Badge key={i} variant="secondary">
                          {f}
                        </Badge>
                      ))}
                      {plan.features.length > 4 && (
                        <Badge variant="outline">
                          +{plan.features.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <h2 className="text-3xl font-bold mb-2">{selectedPlan.name}</h2>
                <div className="text-4xl sm:text-5xl font-extrabold text-primary my-4">
                  €{selectedPlan.price}
                </div>
                <p className="text-xl text-muted-foreground mb-6">
                  for {selectedPlan.period}
                </p>
                <Badge variant="default" className="text-lg px-6 py-2">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Selected
                </Badge>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {selectedPlan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Options */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              <MessageSquare className="h-8 w-8 inline-block mr-3" />
              Contact Admin to Pay & Activate
            </CardTitle>
            <p className="text-center text-muted-foreground mt-2">
              Click any button below — we'll reply instantly with payment
              details
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-4 sm:p-6 rounded-2xl text-white font-semibold text-base sm:text-lg shadow-lg transform transition-all hover:scale-105 active:scale-95 ${link.color}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-white/20 p-3 sm:p-4 rounded-full">
                      <Icon className="h-6 sm:h-8 w-6 sm:w-8" />
                    </div>
                    <div>
                      <div>{link.label}</div>
                      <div className="text-sm opacity-90">{link.value}</div>
                    </div>
                  </div>
                  <span className="text-3xl">→</span>
                </a>
              );
            })}

            <div className="mt-8 p-6 bg-primary/5 rounded-2xl border-2 border-primary/20">
              <h4 className="font-bold text-lg mb-3 text-center">
                Your Order Summary
              </h4>
              <div className="space-y-2 text-center">
                <p>
                  <span className="font-semibold">Plan:</span>{" "}
                  {selectedPlan.name}
                </p>
                <p>
                  <span className="font-semibold">Price:</span>{" "}
                  <span className="text-2xl font-bold text-primary">
                    €{selectedPlan.price}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Username:</span>{" "}
                  {user?.displayName || "Not logged in"}
                </p>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="font-medium mb-2">
                After payment, your VIP access will be activated in under 24h
                (usually within minutes)
              </p>
              <p className="text-xs">
                Support available 24/7 • 100% money-back if not satisfied
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xl">
          Loading...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
