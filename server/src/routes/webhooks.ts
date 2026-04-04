import { Router, Request, Response } from 'express';
import StripeImport from 'stripe';
import mongoose from 'mongoose';
import { Invoice } from '../models';

const router = Router();

/** Shapes used from Stripe `checkout.session.completed` payloads (avoids stripe-node export=/namespace typing friction). */
interface StripeCheckoutSessionPayload {
  id: string;
  payment_status: string | null;
  metadata?: Record<string, string> | null;
  payment_link?: string | { id: string } | null;
}

interface StripeWebhookEventPayload {
  type: string;
  data: { object: unknown };
}

type StripeClient = StripeImport.Stripe;

const StripeCtor = StripeImport as unknown as new (
  key: string,
  config?: Record<string, unknown>
) => StripeClient;

async function handleCheckoutSessionCompleted(session: StripeCheckoutSessionPayload): Promise<void> {
  if (session.payment_status !== 'paid') return;

  const meta = session.metadata || {};
  let invoice = null;

  if (meta.invoiceId && mongoose.Types.ObjectId.isValid(meta.invoiceId) && meta.workspaceOwnerId) {
    invoice = await Invoice.findOne({
      _id: meta.invoiceId,
      userId: meta.workspaceOwnerId,
    });
  }

  const paymentLinkId =
    typeof session.payment_link === 'string'
      ? session.payment_link
      : session.payment_link && typeof session.payment_link === 'object'
        ? session.payment_link.id
        : undefined;

  if (!invoice && paymentLinkId) {
    invoice = await Invoice.findOne({
      stripePaymentLinkId: paymentLinkId,
    });
  }

  if (!invoice) {
    console.warn('[Stripe webhook] Invoice not found for session', session.id);
    return;
  }

  if (meta.workspaceOwnerId && invoice.userId !== meta.workspaceOwnerId) {
    console.error('[Stripe webhook] workspaceOwnerId mismatch for session', session.id);
    return;
  }

  if (invoice.status === 'PAID') return;

  if (invoice.status !== 'SENT') {
    console.warn('[Stripe webhook] Invoice is not SENT; skipping', invoice._id, invoice.status);
    return;
  }

  invoice.status = 'PAID';
  invoice.paidAt = new Date();
  await invoice.save();
}

router.post('/', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    return res.status(503).send('Webhook not configured');
  }

  const stripeClient = new StripeCtor(secretKey);
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing stripe-signature');
  }

  let event: StripeWebhookEventPayload;
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      webhookSecret
    ) as StripeWebhookEventPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe webhook] Signature verification failed:', message);
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSessionPayload;
      await handleCheckoutSessionCompleted(session);
    }
  } catch (e) {
    console.error('[Stripe webhook] Handler error:', e);
    return res.status(500).send('Webhook handler failed');
  }

  return res.status(200).json({ received: true });
});

export default router;
