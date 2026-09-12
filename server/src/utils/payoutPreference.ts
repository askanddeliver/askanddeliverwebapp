import { createError } from '../middleware/errorHandler';

export const PAYOUT_METHODS = ['PAYPAL', 'ZELLE', 'VENMO', 'OTHER'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export interface PayoutPreferenceValue {
  method: PayoutMethod;
  handle: string;
  notes?: string;
}

const METHOD_SET = new Set<string>(PAYOUT_METHODS);

function looksLikeAccountNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  return /^\d{8,17}$/.test(digits);
}

export function parsePayoutMethod(raw: unknown, field = 'method'): PayoutMethod {
  const method = String(raw || '').trim().toUpperCase();
  if (!METHOD_SET.has(method)) {
    throw createError(`${field} must be PayPal, Zelle, Venmo, or Other`, 400);
  }
  return method as PayoutMethod;
}

export function parsePayoutHandle(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw createError('Payout handle must be a string', 400);
  }
  const handle = raw.trim();
  if (handle.length < 2 || handle.length > 80) {
    throw createError('Payout handle must be 2–80 characters', 400);
  }
  if (looksLikeAccountNumber(handle)) {
    throw createError(
      'Use an email, phone, or @username — not a bank account or routing number',
      400
    );
  }
  return handle;
}

/** undefined = leave unchanged; null = clear; object = set. */
export function parsePayoutPreference(
  raw: unknown
): PayoutPreferenceValue | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'object') {
    throw createError('payoutPreference must be an object', 400);
  }
  const body = raw as Record<string, unknown>;
  const methodRaw = body.method;
  const handleRaw = body.handle;
  if (
    (methodRaw === undefined || methodRaw === null || String(methodRaw).trim() === '') &&
    (handleRaw === undefined || handleRaw === null || String(handleRaw).trim() === '')
  ) {
    return null;
  }
  const method = parsePayoutMethod(methodRaw, 'payoutPreference.method');
  const handle = parsePayoutHandle(handleRaw);
  const notes =
    body.notes === undefined || body.notes === null || String(body.notes).trim() === ''
      ? undefined
      : String(body.notes).trim().slice(0, 200);
  return { method, handle, notes };
}
