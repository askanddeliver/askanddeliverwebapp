import StripeImport from 'stripe';

type StripeClient = StripeImport.Stripe;

const StripeCtor = StripeImport as unknown as new (
  key: string,
  config?: Record<string, unknown>
) => StripeClient;

const secretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = secretKey ? new StripeCtor(secretKey) : null;

export function isStripeEnabled(): boolean {
  return !!secretKey;
}

/** Base URL for the SPA (no trailing slash). Used for post-payment redirect. */
export function getFrontendBaseUrl(): string {
  const fromEnv =
    process.env.FRONTEND_URL ||
    (process.env.CLIENT_URL || '').split(',')[0].trim();
  return (fromEnv || 'http://localhost:5173').replace(/\/$/, '');
}

export function getPublicPaymentSuccessUrl(): string {
  return `${getFrontendBaseUrl()}/invoices/paid`;
}

export async function createPaymentLink(params: {
  amountCents: number;
  currency?: string;
  invoiceId: string;
  invoiceNumber: string;
  workspaceOwnerId: string;
  successUrl?: string;
}): Promise<{ url: string; id: string } | null> {
  if (!stripe) return null;

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: params.currency || 'usd',
          unit_amount: params.amountCents,
          product_data: {
            name: `Invoice ${params.invoiceNumber}`,
            description: `Payment for invoice ${params.invoiceNumber}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: params.invoiceId,
      workspaceOwnerId: params.workspaceOwnerId,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: params.successUrl || getPublicPaymentSuccessUrl(),
      },
    },
  });

  if (!paymentLink.url) return null;
  return { url: paymentLink.url, id: paymentLink.id };
}
