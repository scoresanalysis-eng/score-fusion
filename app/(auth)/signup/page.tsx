"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth, SignupError } from "@/contexts/auth-context";
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
import {
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
  Gift,
} from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function SignupForm() {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralParam = searchParams.get("ref");
  const callbackUrl =
    searchParams.get("callbackUrl") || searchParams.get("redirect") || "/dashboard";
  const authErrorParam = searchParams.get("error");

  const getInitialError = () => {
    if (!authErrorParam) return "";
    if (authErrorParam === "Configuration") {
      return "Google sign-up is not configured yet. Please sign up with your email and password below.";
    }
    if (authErrorParam === "OAuthCallback" || authErrorParam === "OAuthSignin") {
      return "Could not complete sign-up with Google. Please try again or use the form below.";
    }
    if (authErrorParam === "AccessDenied") {
      return "Access denied when connecting to Google. Please try again.";
    }
    return "Authentication failed. Please try again.";
  };

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: referralParam || "",
  });

  const [showReferralInput, setShowReferralInput] = useState(!!referralParam);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [generalError, setGeneralError] = useState(getInitialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error as user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (field === "email") {
      setEmailAlreadyExists(false);
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      errors.displayName = "Please enter your full name or nickname";
    } else if (formData.displayName.trim().length < 2) {
      errors.displayName = "Name must be at least 2 characters long";
    }

    if (!formData.email.trim()) {
      errors.email = "Please enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      errors.password = "Please enter a password";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setEmailAlreadyExists(false);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await signup(
        {
          email: formData.email.trim(),
          password: formData.password,
          displayName: formData.displayName.trim(),
          referralCode: formData.referralCode.trim() || undefined,
          consents: {
            analytics: true,
            marketing: marketingConsent,
            essential: true,
          },
        },
        callbackUrl,
      );
    } catch (err) {
      if (err instanceof SignupError) {
        const isEmailExists =
          err.code === "EMAIL_EXISTS" ||
          err.message.toLowerCase().includes("already exists") ||
          err.message.toLowerCase().includes("already registered");

        if (isEmailExists) {
          setEmailAlreadyExists(true);
          setFieldErrors((prev) => ({
            ...prev,
            email:
              err.fieldErrors?.email ||
              err.message ||
              "An account with this email already exists",
          }));
          // Don't show generalError when we have the inline account-exists UI
        } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          // Server returned per-field validation errors — show them inline, not as banner
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors! }));
          // Only show a general banner if there's no field to attach to
          const unattachedFields = Object.keys(err.fieldErrors).filter(
            (k) => !["displayName", "email", "password", "confirmPassword"].includes(k)
          );
          if (unattachedFields.length > 0 || Object.keys(err.fieldErrors).length === 0) {
            setGeneralError(err.message || "Please correct the errors in the form.");
          }
        } else {
          setGeneralError(err.message || "Signup failed. Please try again.");
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An unexpected error occurred during signup. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGeneralError("");
    setIsGoogleLoading(true);
    try {
      await signIn("google", {
        callbackUrl:
          callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard",
      });
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to sign up with Google");
      setIsGoogleLoading(false);
    }
  };

  const loginUrl = `/login?email=${encodeURIComponent(formData.email.trim())}${
    callbackUrl && callbackUrl !== "/dashboard"
      ? `&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : ""
  }`;

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg shadow-xl border-border">
        <CardHeader className="space-y-1 p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Icon />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground">
            Get instant access to VIP betting tips, livescores, and insights
          </CardDescription>

          {referralParam && (
            <div className="mt-2 flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-lg text-xs md:text-sm font-medium">
              <Gift className="h-4 w-4" />
              <span>Referral code <strong>{referralParam}</strong> applied! Extra bonus tokens included.</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-5">
          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 md:h-10 text-sm md:text-base flex items-center justify-center gap-3 font-medium transition-colors hover:bg-muted"
            onClick={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <GoogleIcon />
            )}
            <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Email Already Exists Prompt */}
          {emailAlreadyExists && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Account already exists
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    An account with <strong>{formData.email}</strong> is already registered.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full gap-2 mt-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                onClick={() => router.push(loginUrl)}
              >
                <span>Sign in to your account</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {generalError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="displayName"
                className={`text-sm font-medium ${
                  fieldErrors.displayName ? "text-destructive" : ""
                }`}
              >
                Full Name or Username
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Alex Morgan"
                value={formData.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className={`h-11 md:h-10 text-base ${
                  fieldErrors.displayName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                autoComplete="name"
              />
              {fieldErrors.displayName && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.displayName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className={`text-sm font-medium ${
                  fieldErrors.email ? "text-destructive" : ""
                }`}
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className={`h-11 md:h-10 text-base ${
                  fieldErrors.email
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className={`text-sm font-medium ${
                    fieldErrors.password ? "text-destructive" : ""
                  }`}
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    className={`h-11 md:h-10 text-base pr-10 ${
                      fieldErrors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isGoogleLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.password}
                  </p>
                ) : (
                  formData.password.length >= 6 && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      Password length requirement met
                    </p>
                  )
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className={`text-sm font-medium ${
                    fieldErrors.confirmPassword ? "text-destructive" : ""
                  }`}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                    disabled={isLoading || isGoogleLoading}
                    className={`h-11 md:h-10 text-base pr-10 ${
                      fieldErrors.confirmPassword
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    disabled={isLoading || isGoogleLoading}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                ) : (
                  formData.confirmPassword &&
                  formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" />
                      Passwords match
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Optional Referral Code Toggle */}
            <div className="space-y-2 pt-1">
              {!showReferralInput && !referralParam ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  onClick={() => setShowReferralInput(true)}
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span>Have a referral code?</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="referralCode" className="text-xs font-medium text-muted-foreground">
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="e.g. WINNER50"
                    value={formData.referralCode}
                    onChange={(e) => updateField("referralCode", e.target.value)}
                    disabled={isLoading || isGoogleLoading || !!referralParam}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Checkbox & Terms */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="rounded border-gray-300 mt-1 h-4 w-4 text-primary focus:ring-primary"
                  disabled={isLoading || isGoogleLoading}
                />
                <Label
                  htmlFor="marketing"
                  className="text-xs text-muted-foreground font-normal cursor-pointer leading-relaxed"
                >
                  Send me daily match predictions, promotional tokens, and platform updates.
                </Label>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                By registering, you agree to ScoreFusion&apos;s{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 md:h-10 text-base font-semibold transition-all mt-2"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating your account...</span>
                </div>
              ) : (
                "Create Free Account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center p-6 border-t border-border">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push(loginUrl)}
              className="text-primary hover:underline font-semibold"
            >
              Sign in
            </button>
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}