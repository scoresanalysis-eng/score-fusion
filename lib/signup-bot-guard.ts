const MIN_FORM_DURATION_MS = 3_000;
const MAX_FORM_DURATION_MS = 30 * 60 * 1_000;

export interface SignupBotGuardPayload {
  website?: string;
  company?: string;
  phone?: string;
  formStartedAt?: number;
}

export type BotGuardResult =
  | { ok: true }
  | { ok: false; reason: "honeypot" | "too_fast" | "expired" | "invalid" };

export function validateSignupBotGuard(
  payload: SignupBotGuardPayload,
): BotGuardResult {
  const { website, company, phone, formStartedAt } = payload;

  if (website?.trim() || company?.trim() || phone?.trim()) {
    return { ok: false, reason: "honeypot" };
  }

  if (typeof formStartedAt !== "number" || !Number.isFinite(formStartedAt)) {
    return { ok: false, reason: "invalid" };
  }

  const elapsed = Date.now() - formStartedAt;

  if (elapsed < MIN_FORM_DURATION_MS) {
    return { ok: false, reason: "too_fast" };
  }

  if (elapsed > MAX_FORM_DURATION_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

export function botGuardFailureMessage(): string {
  return "Unable to create account. Please try again.";
}