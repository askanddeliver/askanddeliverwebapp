const DEFAULT_FROM_NAME = 'Ask And Deliver';

/** Parse env booleans; strips inline `# comments` dotenv may leave on the value. */
export function parseEnvFlag(raw: string | undefined): boolean {
  if (!raw) return false;
  const token = raw.trim().split(/\s+#/)[0]?.trim().toLowerCase() ?? '';
  return token === 'true' || token === '1' || token === 'yes';
}

export function getDefaultFromName(): string {
  return (process.env.RESEND_FROM_NAME || DEFAULT_FROM_NAME).trim() || DEFAULT_FROM_NAME;
}

export function getFromEmailAddress(): string | null {
  const email = process.env.RESEND_FROM_EMAIL?.trim();
  return email || null;
}

/** `"Company Name <notify@domain.com>"` */
export function formatFromAddress(fromName?: string): string | null {
  const email = getFromEmailAddress();
  if (!email) return null;
  const name = (fromName || getDefaultFromName()).trim() || DEFAULT_FROM_NAME;
  return `${name} <${email}>`;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!getFromEmailAddress();
}

/**
 * Master delivery gate — must be `true` to send any notification email.
 * Defaults off so local/dev never sends until you opt in via env + user toggles.
 */
export function isNotificationsDeliveryEnabled(): boolean {
  return parseEnvFlag(process.env.RESEND_NOTIFICATIONS_ENABLED);
}

export function isEmailEnabled(): boolean {
  return isEmailConfigured() && isNotificationsDeliveryEnabled();
}
