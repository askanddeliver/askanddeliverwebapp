import { getFrontendBaseUrl } from '../../frontendUrl';
import { formatCurrency } from '../../../utils/calculations';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getInvoiceClientEmails } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildInvoiceSentToClientEmail } from '../templates/invoiceSentToClient';

export interface NotifyInvoiceSentToClientParams {
  workspaceOwnerId: string;
  clientId: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  paymentLinkUrl?: string;
}

export function notifyInvoiceSentToClient(params: NotifyInvoiceSentToClientParams): void {
  enqueueEmailNotification(async () => {
    const recipients = await getInvoiceClientEmails(
      params.workspaceOwnerId,
      params.clientId
    );

    if (recipients.length === 0) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const invoiceUrl = `${getFrontendBaseUrl()}/portal/invoices/${params.invoiceId}`;
    const { subject, html, text } = buildInvoiceSentToClientEmail({
      brand,
      invoiceNumber: params.invoiceNumber,
      clientName: params.clientName,
      totalFormatted: formatCurrency(params.total),
      invoiceUrl,
      paymentLinkUrl: params.paymentLinkUrl,
    });

    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      fromName: brand.companyName,
      replyTo: brand.companyEmail,
    });
  });
}
