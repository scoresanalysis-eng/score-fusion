export interface SignupBotGuardPayload {
  website?: string;
  company?: string;
  phone?: string;
  formStartedAt?: number;
}

export type BotGuardResult =
  | { ok: true }
  | { ok: false; reason: "honeypot" };

export function validateSignupBotGuard(
  payload?: SignupBotGuardPayload,
): BotGuardResult {
  if (!payload) return { ok: true };

  const { website, company } = payload;

  // Only check hidden bot traps (website/company). Do not check phone as browser autofill often populates phone.
  if (website && website.trim().length > 0) {
    return { ok: false, reason: "honeypot" };
  }

  if (company && company.trim().length > 0) {
    return { ok: false, reason: "honeypot" };
  }

  return { ok: true };
}

export function botGuardFailureMessage(): string {
  return "Unable to verify request. Please try again.";
}