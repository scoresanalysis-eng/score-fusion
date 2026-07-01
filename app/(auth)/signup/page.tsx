"use client";

import { useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/logo";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";

function SignupForm() {
  const { signup } = useAuth();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    country: "",
    referralCode: referralCode || "",
  });
  const [consents, setConsents] = useState({
    analytics: true,
    marketing: false,
    essential: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!turnstileSiteKey) {
      setError("Turnstile is not configured. Please contact support.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the Turnstile challenge.");
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        ...formData,
        consents,
        turnstileToken,
      });
    } catch (err) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className=" mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 md:p-6">
          <div className="flex items-center justify-center mb-2">
            <Icon />
          </div>
          <CardTitle className="text-xl md:text-2xl text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center text-sm md:text-base">
            Sign up to access exclusive betting tips and VIP content
          </CardDescription>
          {referralCode && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-xs md:text-sm">
              🎁 Referral code applied! You&apos;ll get bonus tokens on signup.
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm md:text-base">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                value={formData.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                required
                disabled={isLoading}
                className="h-11 md:h-10 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm md:text-base">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                disabled={isLoading}
                className="h-11 md:h-10 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm md:text-base">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 md:h-10 text-base pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm md:text-base">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  required
                  disabled={isLoading}
                  className="h-11 md:h-10 text-base pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="dob" className="text-sm md:text-base">
                Date of Birth (Optional)
              </Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => updateField("dob", e.target.value)}
                disabled={isLoading}
                className="h-11 md:h-10 text-base"
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm md:text-base">
                Country (Optional)
              </Label>
              <Input
                id="country"
                type="text"
                placeholder="United States"
                value={formData.country}
                onChange={(e) => updateField("country", e.target.value)}
                disabled={isLoading}
                className="h-11 md:h-10 text-base"
              />
            </div>
            {!referralCode && (
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-sm md:text-base">
                  Referral Code (Optional)
                </Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={(e) => updateField("referralCode", e.target.value)}
                  disabled={isLoading}
                  className="h-11 md:h-10 text-base"
                />
              </div>
            )}

            {turnstileSiteKey ? (
              <TurnstileWidget
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setError("");
                }}
                onExpire={() => setTurnstileToken("")}
                onError={() => {
                  setTurnstileToken("");
                  setError("Turnstile verification failed. Please try again.");
                }}
              />
            ) : null}

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="analytics"
                  checked={consents.analytics}
                  onChange={(e) =>
                    setConsents((prev) => ({
                      ...prev,
                      analytics: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 mt-1 h-4 w-4"
                  disabled={isLoading}
                />
                <Label
                  htmlFor="analytics"
                  className="text-sm font-normal cursor-pointer leading-tight"
                >
                  Allow analytics to help improve the platform
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={consents.marketing}
                  onChange={(e) =>
                    setConsents((prev) => ({
                      ...prev,
                      marketing: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 mt-1 h-4 w-4"
                  disabled={isLoading}
                />
                <Label
                  htmlFor="marketing"
                  className="text-sm font-normal cursor-pointer leading-tight"
                >
                  Receive tips, promotions, and updates via email
                </Label>
              </div>
              <div className="text-xs text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 md:h-10 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center p-4 md:p-6">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className=" mx-auto flex min-h-screen items-center justify-center px-4 py-8">
            <Card className="w-full max-w-md">
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </>
  );
}
