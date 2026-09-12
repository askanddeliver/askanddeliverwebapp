import type { PayoutMethod, UserPayoutPreference } from '../types';

export const PAYOUT_METHODS: PayoutMethod[] = ['PAYPAL', 'ZELLE', 'VENMO', 'OTHER'];

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  PAYPAL: 'PayPal',
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  OTHER: 'Other',
};

export const PAYOUT_HANDLE_PLACEHOLDERS: Record<PayoutMethod, string> = {
  PAYPAL: 'email or @username',
  ZELLE: 'email or mobile number',
  VENMO: '@username',
  OTHER: 'how to send payment',
};

export function formatPayoutPreference(pref?: UserPayoutPreference | null): string {
  if (!pref?.method || !pref.handle) return 'Not set';
  const label = PAYOUT_METHOD_LABELS[pref.method] || pref.method;
  return `${label} · ${pref.handle}`;
}

export function formatPayoutMethod(method?: PayoutMethod | string | null): string {
  if (!method) return '';
  return PAYOUT_METHOD_LABELS[method as PayoutMethod] || method;
}
