"use client";

import { useState, Suspense } from "react";
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
import { Loader2, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";

const STEPS = [
  { id: 1, title: "Account", description: "Email & password" },
  { id: 2, title: "Profile", description: "Your details" },
  { id: 3, title: "Finish", description: "Review & create" },
] as const;

function SignupForm() {
  const { signup } = useAuth();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");

  const [step, setStep] = useState(1);
  const [formStartedAt] = useState(() => Date.now());
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    country: "",
    referralCode: referralCode || "",
  });
  const [honeypot, setHoneypot] = useState({
    website: "",
    company: "",
    phone: "",
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

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (!formData.email.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return "Enter a valid email address";
      }
      if (formData.password.length < 6) {
        return "Password must be at least 6 characters long";
      }
      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match";
      }
    }

    if (currentStep === 2) {
      if (formData.displayName.trim().length < 2) {
        return "Display name must be at least 2 characters";
      }
    }

    return null;
  };

  const goNext = () => {
    setError("");
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const goBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateStep(2);
    if (validationError) {
      setError(validationError);
      setStep(2);
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        country: formData.country || undefined,
        referralCode: formData.referralCode || undefined,
        consents,
        botGuard: {
          website: honeypot.website,
          company: honeypot.company,
          phone: honeypot.phone,
          formStartedAt,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 p-4 md:p-6">
          <div className="flex items-center justify-center mb-2">
            <Icon />
          </div>
          <CardTitle className="text-xl md:text-2xl text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center text-sm md:text-base">
            Step {step} of {STEPS.length}: {STEPS[step - 1].description}
          </CardDescription>
          {referralCode && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-xs md:text-sm">
              Referral code applied. You&apos;ll get bonus tokens on signup.
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex-1 flex items-center gap-2">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    s.id <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
                {index < STEPS.length - 1 && (
                  <span className="sr-only">{s.title}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            {STEPS.map((s) => (
              <span
                key={s.id}
                className={s.id === step ? "text-primary font-medium" : ""}
              >
                {s.title}
              </span>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <form
            onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}
            className="space-y-4"
          >
            {/* Honeypot fields — hidden from real users, bots often fill these */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
            >
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot.website}
                onChange={(e) =>
                  setHoneypot((prev) => ({ ...prev, website: e.target.value }))
                }
              />
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot.company}
                onChange={(e) =>
                  setHoneypot((prev) => ({ ...prev, company: e.target.value }))
                }
              />
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot.phone}
                onChange={(e) =>
                  setHoneypot((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            {step === 1 && (
              <>
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
                    autoFocus
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
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm md:text-base"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
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
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm md:text-base">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.displayName}
                    onChange={(e) =>
                      updateField("displayName", e.target.value)
                    }
                    required
                    disabled={isLoading}
                    className="h-11 md:h-10 text-base"
                    autoFocus
                  />
                </div>
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
                    <Label
                      htmlFor="referralCode"
                      className="text-sm md:text-base"
                    >
                      Referral Code (Optional)
                    </Label>
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder="Enter referral code"
                      value={formData.referralCode}
                      onChange={(e) =>
                        updateField("referralCode", e.target.value)
                      }
                      disabled={isLoading}
                      className="h-11 md:h-10 text-base"
                    />
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-right break-all">
                      {formData.email}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Display name</span>
                    <span className="font-medium">{formData.displayName}</span>
                  </div>
                  {formData.country && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{formData.country}</span>
                    </div>
                  )}
                  {formData.referralCode && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Referral</span>
                      <span className="font-medium">
                        {formData.referralCode}
                      </span>
                    </div>
                  )}
                </div>

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
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 md:h-10"
                  onClick={goBack}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  className="flex-1 h-11 md:h-10 text-base"
                  onClick={goNext}
                  disabled={isLoading}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 h-11 md:h-10 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              )}
            </div>
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
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen items-center justify-center px-4 py-8">
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
  );
}