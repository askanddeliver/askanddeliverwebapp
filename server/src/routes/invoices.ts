import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Invoice, TimeEntry, LineItem, Client, Project, SiteConfig } from '../models';
import type { InvoiceStatus } from '../models';
import { parseDateStart, parseDateEnd } from '../utils/calculations';

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

    const { status, clientId, startDate, endDate, search } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: workspaceOwnerId };

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
      query.$or = [
        { invoiceNumber: { $regex: search as string, $options: 'i' } },
        { 'clientInfo.name': { $regex: search as string, $options: 'i' } },
      ];
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

    const [draft, sent, paid] = await Promise.all([
      Invoice.countDocuments({ userId: workspaceOwnerId, status: 'DRAFT' }),
      Invoice.aggregate([
        { $match: { userId: workspaceOwnerId, status: 'SENT' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
      Invoice.aggregate([
        { $match: { userId: workspaceOwnerId, status: 'PAID' } },
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
    } = req.body;

    if (!clientId) throw createError('Client is required for invoices', 400);
    if (!dateRange?.start || !dateRange?.end) throw createError('Date range is required', 400);
    if (!items || items.length === 0) throw createError('Invoice must have at least one item', 400);

    const client = await Client.findOne({ _id: clientId, userId: workspaceOwnerId });
    if (!client) throw createError('Client not found', 404);

    const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('companyName companyAddress companyPhone companyEmail')
      .lean();

    const finalNumber = invoiceNumber || await getNextInvoiceNumber(workspaceOwnerId);

    const existing = await Invoice.findOne({ userId: workspaceOwnerId, invoiceNumber: finalNumber });
    if (existing) throw createError(`Invoice number ${finalNumber} already exists`, 400);

    // Verify all referenced projects belong to workspace
    if (projectIds?.length > 0) {
      const validProjects = await Project.countDocuments({
        _id: { $in: projectIds },
        userId: workspaceOwnerId,
      });
      if (validProjects !== projectIds.length) {
        throw createError('One or more projects not found', 400);
      }
    }

    const invoice = await Invoice.create({
      userId: workspaceOwnerId,
      invoiceNumber: finalNumber,
      clientId,
      projectIds: projectIds || [],
      status: 'DRAFT',
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
        name: client.name,
        company: client.company,
        email: client.email,
        businessEntity: (client as typeof client & { businessEntity?: string }).businessEntity,
        address: (client as typeof client & { address?: string }).address,
        paymentPreference: (client as typeof client & { paymentPreference?: string }).paymentPreference,
      },
      items,
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
