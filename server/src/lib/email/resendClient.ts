import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export function isResendConfigured(): boolean {
  return !!apiKey && !!process.env.RESEND_FROM_EMAIL;
}
