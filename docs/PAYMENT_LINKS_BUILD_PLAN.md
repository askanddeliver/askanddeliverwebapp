# Online Invoice Payment Links — Build Plan

This document provides a complete build plan for adding credit card payment links to invoices in Ask And Deliver. Clients can pay invoices online via a shareable link instead of mailing a check or arranging ACH transfer.

---

## Table of Contents

1. [Overview](#overview)
2. [Approach: Stripe Payment Links](#approach-stripe-payment-links)
3. [Prerequisites & Accounts](#prerequisites--accounts)
4. [Environment Variables](#environment-variables)
5. [Data Model Changes](#data-model-changes)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Security Considerations](#security-considerations)
9. [Testing Checklist](#testing-checklist)
10. [Deployment Notes](#deployment-notes)
11. [Optional Enhancements](#optional-enhancements)

---

## Overview

### Current State

- Invoices have status flow: `DRAFT` → `SENT` → `PAID`
- Client `paymentPreference` is `MAILED` or `ACH` — instructions appear on invoice PDF
- No online payment capability exists

### Target State

- When an invoice is marked `SENT`, admin can generate a Stripe Payment Link
- Payment link URL is stored on the invoice and displayed to the client
- Client clicks link → Stripe-hosted checkout → pays by card
- Webhook receives payment confirmation → invoice auto-updated to `PAID`

### Key Files to Modify

| Layer | Files |
|-------|-------|
| Server | `server/src/models/Invoice.ts`, `server/src/routes/invoices.ts`, new `server/src/routes/webhooks.ts` |
| Server index | `server/src/index.ts` (mount webhook route *before* JSON body parser for raw body) |
| Client | `client/src/components/invoices/InvoiceDetail.tsx`, `client/src/components/reports/InvoicePreview.tsx`, `client/src/services/api.ts`, `client/src/types/index.ts` |
| Config | `server/.env.example`, `askanddeliverwebapp/SETUP.md` |

---

## Approach: Stripe Payment Links

**Why Payment Links (not Stripe Invoicing):**

- Your invoices already exist with full line-item detail
- Payment Links = one URL per invoice, fixed amount, Stripe-hosted checkout
- Minimal integration; no need to sync invoice data to Stripe
- Webhook updates your invoice status when payment completes

**Flow:**

1. Admin sends invoice (status → SENT)
2. Admin clicks "Create payment link" (or link auto-created on SENT)
3. Backend calls Stripe API → creates Payment Link with invoice total
4. URL stored on invoice, shown in UI and on PDF
5. Client pays via link → Stripe webhook fires → invoice → PAID

---

## Prerequisites & Accounts

### Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete account verification (required for live payments)
3. Use **Test mode** during development (toggle in Stripe Dashboard)

### Stripe Dashboard Setup

1. **API Keys** (Developers → API keys):
   - Copy **Secret key** (`sk_test_...` or `sk_live_...`) for server

2. **Webhooks** (Developers → Webhooks):
   - Add endpoint: `https://your-api-domain.com/api/webhooks/stripe`
   - Events to listen for: `checkout.session.completed`
   - Copy **Signing secret** (`whsec_...`) for `STRIPE_WEBHOOK_SECRET`

3. **Local testing** (optional):
   - Use Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
   - CLI provides a temporary webhook signing secret for localhost

---

## Environment Variables

### Add to `server/.env`

```env
# Stripe (online invoice payments)
STRIPE_SECRET_KEY=sk_test_...        # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...     # from Stripe Dashboard webhook config
```

### Add to `server/.env.example`

```env
# Stripe - for invoice payment links (optional; omit to disable)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Graceful Degradation

If `STRIPE_SECRET_KEY` is not set, the payment link feature should be disabled: hide "Pay now" / "Create payment link" UI and return a clear error if the endpoint is called.

---

## Data Model Changes

### Invoice Model (`server/src/models/Invoice.ts`)

Add optional fields:

```typescript
// In IInvoice interface
paymentLinkUrl?: string;      // Stripe Payment Link URL (shareable)
stripePaymentLinkId?: string; // Stripe plink_xxx ID (for idempotency / lookup)
```

### Invoice Schema

```typescript
paymentLinkUrl: { type: String, trim: true },
stripePaymentLinkId: { type: String, trim: true },
```

### Client Types (`client/src/types/index.ts`)

Add to `SavedInvoice`:

```typescript
paymentLinkUrl?: string;
stripePaymentLinkId?: string;
```

### Payment Preference (Optional)

Consider adding `CC` or `LINK` to `PaymentPreference` in `Client` model and `ClientModal` if you want to indicate "this client prefers online payment" and show the link more prominently. Not required for MVP.

---

## Backend Implementation

### 1. Install Stripe SDK

```bash
cd server && npm install stripe
```

### 2. Stripe Service (`server/src/lib/stripe.ts`)

Create a small module to initialize Stripe and create payment links:

```typescript
import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = secretKey ? new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' }) : null;

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function createPaymentLink(params: {
  amountCents: number;
  currency?: string;
  invoiceId: string;
  invoiceNumber: string;
  workspaceOwnerId: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ url: string; id: string } | null> {
  if (!stripe) return null;
  const session = await stripe.paymentLinks.create({
    line_items: [{
      price_data: {
        currency: params.currency || 'usd',
        unit_amount: params.amountCents,
        product_data: {
          name: `Invoice ${params.invoiceNumber}`,
          description: `Payment for invoice ${params.invoiceNumber}`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      invoiceId: params.invoiceId,
      workspaceOwnerId: params.workspaceOwnerId,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: params.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices/paid`,
      },
    },
  });
  return { url: session.url!, id: session.id };
}
```

**Note:** Stripe copies Payment Link `metadata` to the Checkout Session automatically, so the webhook will receive `invoiceId` and `workspaceOwnerId` in `session.metadata`. Use the Stripe SDK's default API version or specify one from [Stripe API changelog](https://docs.stripe.com/upgrades#api-versions).

### 3. Payment Link Route (`server/src/routes/invoices.ts`)

Add new route **before** the `/:id` param route (to avoid "next-number" style conflicts):

```typescript
// POST /api/invoices/:id/create-payment-link
// Creates a Stripe Payment Link for a SENT invoice, stores URL on invoice
```

**Logic:**

1. Resolve `workspaceOwnerId` via `getWorkspaceOwnerId(req)`
2. Load invoice by `req.params.id` and `userId: workspaceOwnerId`
3. If invoice not found → 404
4. If invoice status !== `SENT` → 400 "Payment links only for SENT invoices"
5. If `STRIPE_SECRET_KEY` not set → 503 "Payment links not configured"
6. If invoice already has `paymentLinkUrl` → return existing (idempotent)
7. Call `createPaymentLink` with:
   - `amountCents: Math.round(invoice.total * 100)`
   - `invoiceId: invoice._id.toString()`
   - `invoiceNumber: invoice.invoiceNumber`
   - `workspaceOwnerId`
8. Update invoice: `paymentLinkUrl`, `stripePaymentLinkId`
9. Return updated invoice

### 4. Webhook Route (`server/src/routes/webhooks.ts`)

**Critical:** The webhook must receive the **raw request body** for signature verification. Express normally parses JSON and alters the body. Configure this route to use `express.raw()` for the webhook path only.

**Mount order in `server/src/index.ts`:**

```typescript
// Webhook route MUST use raw body — mount before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);
// ... other routes use app.use(express.json()) which is already there
```

**Webhook handler logic:**

1. Get raw body from `req.body` (Buffer)
2. Get `Stripe-Signature` header
3. Verify: `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`
4. If verification fails → 400
5. Handle `checkout.session.completed`:
   - Read `metadata.invoiceId`, `metadata.workspaceOwnerId`
   - Find invoice by `_id` and `userId`
   - If not found → log and 200 (idempotent, avoid retries)
   - If already `PAID` → 200 (idempotent)
   - Update: `status: 'PAID'`, `paidAt: new Date()`
   - Link entries (same as manual SENT→PAID transition) if not already done
6. Return 200 for all handled events

**Idempotency:** Stripe may retry webhooks. Always check if invoice is already PAID before updating.

### 5. Server Index (`server/src/index.ts`)

The webhook **must** receive the raw request body (Buffer) for Stripe signature verification. Mount the webhook route **before** `express.json()` so the body is not parsed:

```typescript
// After morgan, urlencoded — BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
// ... rest of routes (health, users, invoices, etc.)
```

- Requests to `/api/webhooks/stripe` get `req.body` as a Buffer; they never hit `express.json()`
- All other routes use `express.json()` as before

---

## Frontend Implementation

### 1. API Service (`client/src/services/api.ts`)

Add to `invoicesApi`:

```typescript
createPaymentLink: (id: string) =>
  api.post<SavedInvoice>(`/invoices/${id}/create-payment-link`),
```

### 2. Invoice Detail (`client/src/components/invoices/InvoiceDetail.tsx`)

- When `invoice.status === 'SENT'`:
  - If `invoice.paymentLinkUrl` exists: show "Copy payment link" button and/or "Pay now" (opens in new tab)
  - If not: show "Create payment link" button → calls API → updates invoice in parent → shows link
- Display the link clearly so the admin can copy it into an email to the client
- Optional: "Copy to clipboard" with toast/feedback

### 3. Invoice Preview / PDF (`client/src/components/reports/InvoicePreview.tsx`)

When `invoice.paymentLinkUrl` is present (and invoice is for client view):

- In the Payment section, add: "Pay online: [payment link]" or a "Pay now" button
- Ensure this appears in the print/PDF view so it can be included when sending the invoice to the client

**Note:** `InvoicePreview` receives `Invoice` type which may not have `paymentLinkUrl`. You may need to extend the preview props when rendering from `InvoiceDetail` (which has the full `SavedInvoice`).

### 4. Public Thank-You Page (Optional)

Create a simple public page at `/invoices/paid` (or similar) that the client sees after paying:

- "Thank you for your payment. We've received it and will update your records."
- No auth required
- Add route in `client/src/App.tsx` (or router config) under the public layout
- Referenced in `after_completion.redirect.url` when creating the payment link — use `FRONTEND_URL` or `VITE_APP_URL` env var for production

---

## Security Considerations

| Concern | Mitigation |
|--------|------------|
| Webhook forgery | Always verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` |
| Duplicate processing | Check `invoice.status === 'PAID'` before updating; return 200 to avoid retries |
| Cross-workspace access | Verify `metadata.workspaceOwnerId` matches `invoice.userId` |
| Amount tampering | Amount comes from your DB (invoice.total), not from webhook payload |
| PCI compliance | Stripe hosts checkout; no card data touches your server |

---

## Testing Checklist

### Development (Stripe Test Mode)

- [ ] Create invoice, mark SENT
- [ ] Create payment link → URL stored, displayed in UI
- [ ] Copy link, open in incognito → Stripe Checkout loads
- [ ] Pay with test card `4242 4242 4242 4242` → success
- [ ] Webhook received (use Stripe CLI or ngrok for localhost)
- [ ] Invoice status updates to PAID
- [ ] Re-create payment link on same invoice → returns existing URL (idempotent)
- [ ] Try creating payment link for DRAFT invoice → 400
- [ ] Try creating payment link when Stripe not configured → 503 or graceful hide

### Production

- [ ] Switch to live Stripe keys
- [ ] Configure production webhook URL in Stripe Dashboard
- [ ] Verify webhook endpoint is HTTPS
- [ ] Test full flow with real (small) payment

---

## Deployment Notes

### Railway / Render / Fly.io

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to environment variables
2. Webhook URL must be your production API base, e.g. `https://your-api.railway.app/api/webhooks/stripe`
3. Ensure the route is reachable (no extra path prefix)

### Stripe Webhook in Production

- Add endpoint in Stripe Dashboard → Webhooks
- Select event: `checkout.session.completed`
- Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### Frontend URL for Redirect

Set `FRONTEND_URL` (or equivalent) in server env so `after_completion.redirect.url` points to your production frontend thank-you page.

---

## Optional Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Auto-create on SENT** | When status changes DRAFT→SENT, automatically create payment link (reduces one click) |
| **Payment preference: CC** | Add `CC` to `PaymentPreference`; show "Pay online" more prominently for those clients |
| **Email integration** | When "sending" invoice, include payment link in email body (requires email sending setup) |
| **Partial payments** | Allow paying less than full amount (requires Stripe Checkout with adjustable quantity or custom flow) |
| **Payment history** | Store `stripePaymentIntentId` or similar for audit trail |
| **Receipt** | Stripe sends receipt by default; optionally add "View receipt" link in thank-you page |

---

## Reference Links

- [Stripe Payment Links API](https://docs.stripe.com/api/payment-links/payment-links/create)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)
- [Testing Stripe](https://docs.stripe.com/testing)
- [Stripe CLI for local webhooks](https://docs.stripe.com/stripe-cli)

---

*Document created for Ask And Deliver. Update this plan as the implementation evolves.*
