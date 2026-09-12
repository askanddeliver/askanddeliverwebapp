import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Invoice, TimeEntry, LineItem, Client, Project, SiteConfig } from '../models';
import type { InvoiceDocumentKind, InvoiceStatus, IInvoiceRetainerSummary } from '../models';
import { parseDateStart, parseDateEnd } from '../utils/calculations';
import {
  isPayableDocumentKind,
  libraryDocumentKindMatch,
  parseDocumentKind,
  payableDocumentKindMatch,
  payrollDocumentKindMatch,
} from '../utils/invoiceKinds';
import { createPaymentLink, isStripeEnabled } from '../lib/stripeClient';
import { notifyInvoiceSentToClient } from '../lib/email';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['PAID', 'DRAFT'],
  PAID: ['SENT'],
};

async function getNextInvoiceNumber(userId: string): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yy}${mm}${dd}-`;

  const todaysInvoices = await Invoice.find({
    userId,
    invoiceNumber: { $regex: `^${datePrefix}` },
  })
    .sort({ invoiceNumber: -1 })
    .lean();

  if (todaysInvoices.length === 0) return `${datePrefix}1`;

  const maxSeq = todaysInvoices.reduce((max, inv) => {
    const seq = parseInt(inv.invoiceNumber.replace(datePrefix, ''), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return `${datePrefix}${maxSeq + 1}`;
}

// GET /api/invoices/next-number — Get next auto-generated invoice number
router.get(
  '/next-number',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const invoiceNumber = await getNextInvoiceNumber(workspaceOwnerId);
    res.json({ invoiceNumber });
  })
);

// GET /api/invoices — List invoices with optional filters
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { status, clientId, startDate, endDate, search, documentKind } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: workspaceOwnerId };

    const kindParam = typeof documentKind === 'string' ? documentKind : 'INVOICE';
    if (kindParam === 'library') {
      Object.assign(query, libraryDocumentKindMatch);
    } else if (kindParam === 'payroll' || kindParam === 'PAY_STUB') {
      Object.assign(query, payrollDocumentKindMatch);
    } else if (
      kindParam === 'RETAINER_REPORT' ||
      kindParam === 'DATA_REPORT' ||
      kindParam === 'BUDGET_REPORT'
    ) {
      query.documentKind = kindParam;
    } else {
      Object.assign(query, payableDocumentKindMatch);
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (clientId) {
      query.clientId = clientId;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = parseDateStart(startDate as string);
      if (endDate) query.createdAt.$lte = parseDateEnd(endDate as string);
    }
    if (search) {
      const searchMatch = {
        $or: [
          { invoiceNumber: { $regex: search as string, $options: 'i' } },
          { 'clientInfo.name': { $regex: search as string, $options: 'i' } },
        ],
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchMatch];
        delete query.$or;
      } else {
        Object.assign(query, searchMatch);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name company')
      .sort({ createdAt: -1 })
      .lean();

    res.json(invoices);
  })
);

// GET /api/invoices/stats — Invoice summary stats
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const payable = { userId: workspaceOwnerId, ...payableDocumentKindMatch };

    const [draft, sent, paid] = await Promise.all([
      Invoice.countDocuments({ ...payable, status: 'DRAFT' }),
      Invoice.aggregate([
        { $match: { ...payable, status: 'SENT' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
      Invoice.aggregate([
        { $match: { ...payable, status: 'PAID' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      draft: { count: draft, total: 0 },
      sent: { count: sent[0]?.count || 0, total: sent[0]?.total || 0 },
      paid: { count: paid[0]?.count || 0, total: paid[0]?.total || 0 },
    });
  })
);

// GET /api/invoices/payment-link-config — whether Stripe payment links are available
router.get(
  '/payment-link-config',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);
    res.json({ enabled: isStripeEnabled() });
  })
);

// POST /api/invoices/:id/create-payment-link — Stripe Payment Link for a SENT invoice
router.post(
  '/:id/create-payment-link',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    if (!isStripeEnabled()) {
      throw createError('Payment links are not configured', 503);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!invoice) throw createError('Invoice not found', 404);
    if (invoice.status !== 'SENT') {
      throw createError('Payment links can only be created for sent invoices', 400);
    }
    if (!isPayableDocumentKind(invoice.documentKind)) {
      throw createError('Payment links are only available for invoices', 400);
    }
    if (invoice.paymentLinkUrl) {
      res.json(invoice);
      return;
    }

    const amountCents = Math.round(invoice.total * 100);
    if (amountCents < 50) {
      throw createError('Invoice total is below the minimum for card payment ($0.50)', 400);
    }

    const result = await createPaymentLink({
      amountCents,
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      workspaceOwnerId,
    });
    if (!result) {
      throw createError('Failed to create payment link', 500);
    }

    invoice.paymentLinkUrl = result.url;
    invoice.stripePaymentLinkId = result.id;
    await invoice.save();
    res.json(invoice);
  })
);

// GET /api/invoices/:id — Get single invoice with full detail
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    })
      .populate('clientId', 'name company email')
      .populate('projectIds', 'title')
      .lean();

    if (!invoice) throw createError('Invoice not found', 404);

    res.json(invoice);
  })
);

// POST /api/invoices — Create a new invoice from preview data
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const {
      invoiceNumber,
      clientId,
      projectIds,
      dateRange,
      items,
      subtotal,
      total,
      totalHours,
      totalEarned,
      totalMargin,
      timeEntryIds,
      lineItemIds,
      notes,
      documentKind: rawDocumentKind,
      retainerSummary: bodyRetainerSummary,
      payeeName,
      payeeEmail,
    } = req.body as {
      invoiceNumber?: string;
      clientId?: string;
      projectIds?: string[];
      dateRange: { start: string; end: string };
      items: unknown[];
      subtotal?: number;
      total: number;
      totalHours?: number;
      totalEarned?: number;
      totalMargin?: number;
      timeEntryIds?: string[];
      lineItemIds?: string[];
      notes?: string;
      documentKind?: InvoiceDocumentKind;
      retainerSummary?: IInvoiceRetainerSummary;
      payeeName?: string;
      payeeEmail?: string;
    };

    const documentKind = parseDocumentKind(rawDocumentKind);
    const payable = isPayableDocumentKind(documentKind);

    if (payable && !clientId) throw createError('Client is required for invoices', 400);
    if (documentKind === 'RETAINER_REPORT' && !clientId) {
      throw createError('A client is required to save a retainer report', 400);
    }
    if (documentKind === 'PAY_STUB' && !(typeof payeeName === 'string' && payeeName.trim())) {
      throw createError('A team member is required to save a pay stub', 400);
    }
    if (!dateRange?.start || !dateRange?.end) throw createError('Date range is required', 400);
    if (
      documentKind !== 'DATA_REPORT' &&
      (!items || (items as unknown[]).length === 0)
    ) {
      throw createError(
        documentKind === 'PAY_STUB'
          ? 'Pay stub must have at least one earned-hours line'
          : 'Invoice must have at least one item',
        400
      );
    }

    const client = clientId
      ? await Client.findOne({ _id: clientId, userId: workspaceOwnerId })
      : null;
    if (clientId && !client) throw createError('Client not found', 404);

    const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('companyName companyAddress companyPhone companyEmail')
      .lean();

    const finalNumber = invoiceNumber || await getNextInvoiceNumber(workspaceOwnerId);

    const existing = await Invoice.findOne({ userId: workspaceOwnerId, invoiceNumber: finalNumber });
    if (existing) throw createError(`Invoice number ${finalNumber} already exists`, 400);

    const retainerSummary: IInvoiceRetainerSummary | undefined =
      documentKind === 'RETAINER_REPORT' &&
      bodyRetainerSummary?.projects &&
      bodyRetainerSummary.projects.length > 0
        ? { projects: bodyRetainerSummary.projects }
        : undefined;

    if (documentKind === 'RETAINER_REPORT' && !retainerSummary) {
      throw createError(
        'Retainer utilization reports require a pool summary. Regenerate the preview, then save again.',
        400
      );
    }

    // Verify all referenced projects belong to workspace
    const projectIdsList = projectIds ?? [];
    if (projectIdsList.length > 0) {
      const validProjects = await Project.countDocuments({
        _id: { $in: projectIdsList },
        userId: workspaceOwnerId,
      });
      if (validProjects !== projectIdsList.length) {
        throw createError('One or more projects not found', 400);
      }
    }

    const invoice = await Invoice.create({
      userId: workspaceOwnerId,
      invoiceNumber: finalNumber,
      clientId: client?._id,
      projectIds: projectIdsList,
      status: 'DRAFT',
      documentKind,
      retainerSummary,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      companyInfo: siteConfig
        ? {
            name: siteConfig.companyName,
            address: siteConfig.companyAddress,
            phone: siteConfig.companyPhone,
            email: siteConfig.companyEmail,
          }
        : {},
      clientInfo: {
        name: client?.name || (typeof payeeName === 'string' && payeeName.trim()) || 'Multiple clients',
        company: client?.company,
        email: client?.email || (typeof payeeEmail === 'string' ? payeeEmail : undefined),
        businessEntity: client
          ? (client as typeof client & { businessEntity?: string }).businessEntity
          : undefined,
        address: client ? (client as typeof client & { address?: string }).address : undefined,
        paymentPreference: client
          ? (client as typeof client & { paymentPreference?: string }).paymentPreference
          : undefined,
      },
      items: Array.isArray(items) ? items : [],
      subtotal: subtotal ?? total,
      total,
      totalHours: totalHours ?? 0,
      totalEarned: totalEarned ?? 0,
      totalMargin: totalMargin ?? 0,
      timeEntryIds: timeEntryIds || [],
      lineItemIds: lineItemIds || [],
      notes,
    });

    res.status(201).json(invoice);
  })
);

// PATCH /api/invoices/:id/status — Update invoice status with transition logic
router.patch(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { status } = req.body as { status: InvoiceStatus };
    if (!status || !['DRAFT', 'SENT', 'PAID'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!invoice) throw createError('Invoice not found', 404);

    const currentStatus = invoice.status as InvoiceStatus;
    if (!VALID_TRANSITIONS[currentStatus].includes(status)) {
      throw createError(
        `Cannot transition from ${currentStatus} to ${status}`,
        400
      );
    }

    // Forward transitions: link entries
    if (currentStatus === 'DRAFT' && status === 'SENT') {
      if (!isPayableDocumentKind(invoice.documentKind)) {
        throw createError('Library reports cannot be sent as invoices', 400);
      }
      invoice.sentAt = new Date();
      // Link time entries and line items to this invoice
      if (invoice.timeEntryIds.length > 0) {
        await TimeEntry.updateMany(
          { _id: { $in: invoice.timeEntryIds } },
          { $set: { invoiceId: invoice._id } }
        );
      }
      if (invoice.lineItemIds.length > 0) {
        await LineItem.updateMany(
          { _id: { $in: invoice.lineItemIds } },
          { $set: { invoiceId: invoice._id } }
        );
      }
    }

    if (currentStatus === 'SENT' && status === 'PAID') {
      invoice.paidAt = new Date();
    }

    // Backward transitions: unlink entries
    if (currentStatus === 'SENT' && status === 'DRAFT') {
      invoice.sentAt = undefined;
      invoice.paymentLinkUrl = undefined;
      invoice.stripePaymentLinkId = undefined;
      if (invoice.timeEntryIds.length > 0) {
        await TimeEntry.updateMany(
          { _id: { $in: invoice.timeEntryIds } },
          { $set: { invoiceId: null } }
        );
      }
      if (invoice.lineItemIds.length > 0) {
        await LineItem.updateMany(
          { _id: { $in: invoice.lineItemIds } },
          { $set: { invoiceId: null } }
        );
      }
    }

    if (currentStatus === 'PAID' && status === 'SENT') {
      invoice.paidAt = undefined;
    }

    invoice.status = status;
    await invoice.save();

    if (currentStatus === 'DRAFT' && status === 'SENT') {
      const documentKind = (invoice.documentKind || 'INVOICE') as InvoiceDocumentKind;
      if (documentKind === 'INVOICE') {
        notifyInvoiceSentToClient({
          workspaceOwnerId,
          clientId: String(invoice.clientId),
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientInfo?.name || 'there',
          total: invoice.total ?? 0,
          paymentLinkUrl: invoice.paymentLinkUrl,
        });
      }
    }

    res.json(invoice);
  })
);

// PUT /api/invoices/:id — Update a DRAFT invoice
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!invoice) throw createError('Invoice not found', 404);
    if (invoice.status !== 'DRAFT') {
      throw createError('Only DRAFT invoices can be edited', 400);
    }

    const { invoiceNumber, notes } = req.body;

    if (invoiceNumber !== undefined && invoiceNumber !== invoice.invoiceNumber) {
      const existing = await Invoice.findOne({
        userId: workspaceOwnerId,
        invoiceNumber,
        _id: { $ne: invoice._id },
      });
      if (existing) throw createError(`Invoice number ${invoiceNumber} already exists`, 400);
      invoice.invoiceNumber = invoiceNumber;
    }
    if (notes !== undefined) invoice.notes = notes;

    await invoice.save();
    res.json(invoice);
  })
);

// DELETE /api/invoices/:id — Delete a DRAFT invoice and unlink entries
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!invoice) throw createError('Invoice not found', 404);
    if (invoice.status !== 'DRAFT') {
      throw createError('Only DRAFT invoices can be deleted', 400);
    }

    // Unlink any entries that were temporarily associated
    if (invoice.timeEntryIds.length > 0) {
      await TimeEntry.updateMany(
        { _id: { $in: invoice.timeEntryIds } },
        { $set: { invoiceId: null } }
      );
    }
    if (invoice.lineItemIds.length > 0) {
      await LineItem.updateMany(
        { _id: { $in: invoice.lineItemIds } },
        { $set: { invoiceId: null } }
      );
    }

    await Invoice.deleteOne({ _id: invoice._id });
    res.json({ message: 'Invoice deleted' });
  })
);

export default router;
