import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml } from '../layout';

export interface InvoiceSentToClientTemplateParams {
  brand: WorkspaceEmailBrand;
  invoiceNumber: string;
  clientName: string;
  totalFormatted: string;
  invoiceUrl: string;
  paymentLinkUrl?: string;
}

export function buildInvoiceSentToClientEmail(
  params: InvoiceSentToClientTemplateParams
): { subject: string; html: string; text: string } {
  const { brand, invoiceNumber, clientName, totalFormatted, invoiceUrl, paymentLinkUrl } =
    params;
  const subject = `${brand.companyName} sent invoice ${invoiceNumber}`;

  const payLine = paymentLinkUrl
    ? `<p style="margin: 16px 0 0;">You can pay online using the button below.</p>`
    : '';

  const bodyHtml = `
    <p style="margin: 0 0 12px;">Hi${clientName ? ` ${escapeHtml(clientName)}` : ''},</p>
    <p style="margin: 0;">Invoice <strong>${escapeHtml(invoiceNumber)}</strong> is ready — total <strong>${escapeHtml(totalFormatted)}</strong>.</p>
    ${payLine}
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'Invoice ready',
    bodyHtml,
    ctaLabel: paymentLinkUrl ? 'View & pay invoice' : 'View invoice',
    ctaUrl: paymentLinkUrl || invoiceUrl,
  });

  const textLines = [
    `Invoice ${invoiceNumber} is ready — total ${totalFormatted}.`,
    '',
    paymentLinkUrl
      ? `View & pay: ${paymentLinkUrl}`
      : `View invoice: ${invoiceUrl}`,
  ];

  return { subject, html, text: textLines.join('\n') };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
