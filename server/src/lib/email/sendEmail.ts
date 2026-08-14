import { resend } from './resendClient';
import {
  formatFromAddress,
  isEmailConfigured,
  isNotificationsDeliveryEnabled,
} from './emailConfig';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Overrides RESEND_FROM_NAME / SiteConfig default for the From display name. */
  fromName?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  skippedReason?: 'disabled' | 'delivery_disabled' | 'missing_from' | 'no_recipients';
}

function normalizeRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return [...new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!isNotificationsDeliveryEnabled()) {
    console.warn(
      '[email] RESEND_NOTIFICATIONS_ENABLED is not true — skipping send'
    );
    return { sent: false, skippedReason: 'delivery_disabled' };
  }

  if (!isEmailConfigured()) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping send');
    return { sent: false, skippedReason: 'disabled' };
  }

  if (!resend) {
    return { sent: false, skippedReason: 'disabled' };
  }

  const from = formatFromAddress(options.fromName);
  if (!from) {
    console.warn('[email] RESEND_FROM_EMAIL not set — skipping send');
    return { sent: false, skippedReason: 'missing_from' };
  }

  const to = normalizeRecipients(options.to);
  if (to.length === 0) {
    return { sent: false, skippedReason: 'no_recipients' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[email] send failed', error);
      return { sent: false };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[email] send failed', err);
    return { sent: false };
  }
}
