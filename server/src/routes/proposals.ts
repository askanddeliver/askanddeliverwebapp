import { Router, Response } from 'express';
import { checkJwt, AuthRequest, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Proposal, Client, Project, SiteConfig } from '../models';
import type {
  ProposalStatus,
  IProposalInvestment,
  IProposalAccentSnapshot,
  IProposalPhase,
  IProposalInvestmentLine,
} from '../models/Proposal';
import { parseDateStart, parseDateEnd } from '../utils/calculations';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

function computeInvestmentTotals(investment: {
  lineItems?: { amount?: number }[];
  fees?: number;
}): Pick<IProposalInvestment, 'subtotal' | 'total'> {
  const lineItems = investment.lineItems || [];
  const subtotal = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const fees = Number(investment.fees) || 0;
  return { subtotal, total: subtotal + fees };
}

function deriveLineItemsFromPhases(phases: IProposalPhase[]): IProposalInvestmentLine[] {
  return phases.map((p) => ({
    label: p.name,
    amount: Number(p.estimatedCost) || 0,
    hours:
      p.estimatedHours != null && !Number.isNaN(Number(p.estimatedHours))
        ? Number(p.estimatedHours)
        : undefined,
    duration: p.duration?.trim() ? p.duration.trim() : undefined,
  }));
}

/** Apply phase→line-item sync and totals. When sync is on, line items always mirror phases. */
function applyInvestmentFromPhasesAndBody(
  proposal: {
    phases: IProposalPhase[];
    investmentSyncPhases?: boolean;
    investment: IProposalInvestment;
  },
  investmentPatch?: Partial<IProposalInvestment>
): IProposalInvestment {
  const fees =
    investmentPatch?.fees !== undefined
      ? Number(investmentPatch.fees) || 0
      : Number(proposal.investment.fees) || 0;
  const notes =
    investmentPatch?.notes !== undefined ? investmentPatch.notes ?? '' : proposal.investment.notes ?? '';

  /** `true` only when explicitly enabled so legacy proposals without the field keep manual line items. */
  const syncOn = proposal.investmentSyncPhases === true;
  let lineItems: IProposalInvestmentLine[];

  if (syncOn && proposal.phases?.length) {
    lineItems = deriveLineItemsFromPhases(proposal.phases);
  } else if (investmentPatch?.lineItems !== undefined) {
    lineItems = investmentPatch.lineItems as IProposalInvestmentLine[];
  } else {
    lineItems = proposal.investment.lineItems as IProposalInvestmentLine[];
  }

  const totals = computeInvestmentTotals({ lineItems, fees });
  return {
    lineItems,
    fees,
    notes,
    subtotal: totals.subtotal,
    total: totals.total,
  };
}

async function getNextProposalNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}-`;

  const latest = await Proposal.find({
    userId,
    proposalNumber: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
  })
    .sort({ proposalNumber: -1 })
    .limit(1)
    .lean();

  if (!latest.length) return `${prefix}001`;

  const last = latest[0].proposalNumber.replace(prefix, '');
  const n = parseInt(last, 10);
  const next = (isNaN(n) ? 0 : n) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function defaultAccent(workspaceOwnerId: string): Promise<IProposalAccentSnapshot> {
  const site = await SiteConfig.findOne({ userId: workspaceOwnerId }).select('colors').lean();
  const c = site?.colors;
  return {
    brandSage: c?.brandSage ?? '#5B7765',
    brandSageLight: c?.brandSageLight ?? '#7A9A87',
    brandSageDark: c?.brandSageDark ?? '#3D5446',
    brandCharcoal: c?.brandCharcoal ?? '#2A2A2A',
    brandCream: c?.brandCream ?? '#F7F5F2',
    brandCreamDark: c?.brandCreamDark ?? '#EDE9E3',
    accentWarm: c?.accentWarm ?? '#E8A87C',
    accentCool: c?.accentCool ?? '#6B9BAE',
  };
}

// GET /api/proposals/next-number
router.get(
  '/next-number',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);
    const proposalNumber = await getNextProposalNumber(workspaceOwnerId);
    res.json({ proposalNumber });
  })
);

// GET /api/proposals/stats
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const [draft, finalized] = await Promise.all([
      Proposal.countDocuments({ userId: workspaceOwnerId, status: 'DRAFT' }),
      Proposal.countDocuments({ userId: workspaceOwnerId, status: 'FINALIZED' }),
    ]);

    res.json({
      draft: { count: draft },
      finalized: { count: finalized },
    });
  })
);

// GET /api/proposals
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { status, clientId, startDate, endDate, search } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, unknown> = { userId: workspaceOwnerId };

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (clientId) {
      query.clientId = clientId;
    }
    if (startDate || endDate) {
      query.createdAt = {} as Record<string, Date>;
      if (startDate) (query.createdAt as Record<string, Date>).$gte = parseDateStart(startDate as string);
      if (endDate) (query.createdAt as Record<string, Date>).$lte = parseDateEnd(endDate as string);
    }
    if (search) {
      const q = search as string;
      query.$or = [
        { proposalNumber: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { 'clientInfo.name': { $regex: q, $options: 'i' } },
      ];
    }

    const proposals = await Proposal.find(query)
      .populate('clientId', 'name company')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    res.json(proposals);
  })
);

// POST /api/proposals
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { title, clientId, projectId, proposalDate, accentSnapshot } = req.body as {
      title?: string;
      clientId?: string;
      projectId?: string;
      proposalDate?: string;
      accentSnapshot?: Record<string, string>;
    };

    if (!clientId) throw createError('Client is required', 400);

    const client = await Client.findOne({ _id: clientId, userId: workspaceOwnerId });
    if (!client) throw createError('Client not found', 404);

    let projectTitle: string | undefined;
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
      if (!project) throw createError('Project not found', 404);
      projectTitle = project.title;
    }

    const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('companyName companyAddress companyPhone companyEmail colors')
      .lean();

    const proposalNumber = await getNextProposalNumber(workspaceOwnerId);
    const accent = { ...(await defaultAccent(workspaceOwnerId)), ...(accentSnapshot || {}) };

    const invRaw = (req.body.investment || {}) as Partial<IProposalInvestment>;
    const phasesArr = Array.isArray(req.body.phases) ? (req.body.phases as IProposalPhase[]) : [];
    const investmentSyncPhases = req.body.investmentSyncPhases !== false;
    const investment = applyInvestmentFromPhasesAndBody(
      {
        phases: phasesArr,
        investmentSyncPhases,
        investment: {
          lineItems: (invRaw.lineItems || []) as IProposalInvestmentLine[],
          fees: invRaw.fees ?? 0,
          notes: invRaw.notes || '',
          subtotal: 0,
          total: 0,
        },
      },
      invRaw
    );

    const proposal = await Proposal.create({
      userId: workspaceOwnerId,
      proposalNumber,
      title: (title || 'New proposal').trim(),
      clientId,
      projectId: projectId || undefined,
      projectTitle,
      status: 'DRAFT',
      proposalDate: proposalDate ? new Date(proposalDate) : new Date(),
      accentSnapshot: accent,
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
        businessEntity: client.businessEntity,
        address: client.address,
      },
      introduction: typeof req.body.introduction === 'string' ? req.body.introduction : '',
      challenge: typeof req.body.challenge === 'string' ? req.body.challenge : '',
      solution: typeof req.body.solution === 'string' ? req.body.solution : '',
      assumptions: typeof req.body.assumptions === 'string' ? req.body.assumptions : '',
      phases: phasesArr,
      investmentSyncPhases,
      investment,
      terms: typeof req.body.terms === 'string' ? req.body.terms : '',
      sourceMarkdown: typeof req.body.sourceMarkdown === 'string' ? req.body.sourceMarkdown : undefined,
    });

    const populated = await Proposal.findById(proposal._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'title')
      .lean();

    res.status(201).json(populated);
  })
);

// GET /api/proposals/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const proposal = await Proposal.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    })
      .populate('clientId', 'name company email businessEntity address')
      .populate('projectId', 'title')
      .lean();

    if (!proposal) throw createError('Proposal not found', 404);

    res.json(proposal);
  })
);

// PATCH /api/proposals/:id — update content (DRAFT only); refresh snapshots for client/project
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const proposal = await Proposal.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!proposal) throw createError('Proposal not found', 404);
    if (proposal.status !== 'DRAFT') {
      throw createError('Only draft proposals can be edited. Revert to draft first.', 400);
    }

    const {
      title,
      clientId,
      projectId,
      proposalDate,
      proposalNumber,
      introduction,
      challenge,
      solution,
      assumptions,
      phases,
      investment,
      terms,
      accentSnapshot,
      sourceMarkdown,
      refreshCompanyInfo,
      investmentSyncPhases: bodySyncPhases,
    } = req.body as {
      title?: string;
      clientId?: string;
      projectId?: string | null;
      proposalDate?: string;
      proposalNumber?: string;
      introduction?: string;
      challenge?: string;
      solution?: string;
      assumptions?: string;
      phases?: unknown;
      investment?: Partial<IProposalInvestment>;
      terms?: string;
      accentSnapshot?: Record<string, string>;
      sourceMarkdown?: string;
      refreshCompanyInfo?: boolean;
      investmentSyncPhases?: boolean;
    };

    if (proposalNumber !== undefined && proposalNumber !== proposal.proposalNumber) {
      const exists = await Proposal.findOne({
        userId: workspaceOwnerId,
        proposalNumber,
        _id: { $ne: proposal._id },
      });
      if (exists) throw createError(`Proposal number ${proposalNumber} already exists`, 400);
      proposal.proposalNumber = proposalNumber.trim();
    }

    if (title !== undefined) proposal.title = title.trim();
    if (introduction !== undefined) proposal.introduction = introduction;
    if (challenge !== undefined) proposal.challenge = challenge;
    if (solution !== undefined) proposal.solution = solution;
    if (assumptions !== undefined) proposal.assumptions = assumptions;
    if (terms !== undefined) proposal.terms = terms;
    if (sourceMarkdown !== undefined) proposal.sourceMarkdown = sourceMarkdown || undefined;
    if (bodySyncPhases !== undefined) proposal.investmentSyncPhases = !!bodySyncPhases;
    if (proposalDate !== undefined) proposal.proposalDate = new Date(proposalDate);

    if (accentSnapshot && typeof accentSnapshot === 'object') {
      Object.assign(proposal.accentSnapshot, accentSnapshot);
    }

    if (phases !== undefined) {
      if (!Array.isArray(phases)) throw createError('phases must be an array', 400);
      proposal.phases = phases as typeof proposal.phases;
    }

    proposal.investment = applyInvestmentFromPhasesAndBody(
      {
        phases: proposal.phases as unknown as IProposalPhase[],
        investmentSyncPhases: proposal.investmentSyncPhases,
        investment: proposal.investment,
      },
      investment !== undefined && typeof investment === 'object' ? investment : undefined
    );

    let effectiveClientId = proposal.clientId.toString();

    if (clientId !== undefined) {
      const client = await Client.findOne({ _id: clientId, userId: workspaceOwnerId });
      if (!client) throw createError('Client not found', 404);
      proposal.clientId = client._id;
      effectiveClientId = clientId;
      proposal.clientInfo = {
        name: client.name,
        company: client.company,
        email: client.email,
        businessEntity: client.businessEntity,
        address: client.address,
      };
      if (proposal.projectId) {
        const stillValid = await Project.exists({
          _id: proposal.projectId,
          clientId: proposal.clientId,
          userId: workspaceOwnerId,
        });
        if (!stillValid) {
          proposal.projectId = undefined;
          proposal.projectTitle = undefined;
        }
      }
    }

    if (projectId !== undefined) {
      if (projectId === null || projectId === '') {
        proposal.projectId = undefined;
        proposal.projectTitle = undefined;
      } else {
        const project = await Project.findOne({
          _id: projectId,
          userId: workspaceOwnerId,
          clientId: effectiveClientId,
        });
        if (!project) throw createError('Project not found for this client', 404);
        proposal.projectId = project._id;
        proposal.projectTitle = project.title;
      }
    }

    if (refreshCompanyInfo) {
      const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
        .select('companyName companyAddress companyPhone companyEmail')
        .lean();
      if (siteConfig) {
        proposal.companyInfo = {
          name: siteConfig.companyName,
          address: siteConfig.companyAddress,
          phone: siteConfig.companyPhone,
          email: siteConfig.companyEmail,
        };
      }
    }

    await proposal.save();

    const populated = await Proposal.findById(proposal._id)
      .populate('clientId', 'name company email businessEntity address')
      .populate('projectId', 'title')
      .lean();

    res.json(populated);
  })
);

// PATCH /api/proposals/:id/status
router.patch(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { status } = req.body as { status: ProposalStatus };
    if (!status || !['DRAFT', 'FINALIZED'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    const proposal = await Proposal.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!proposal) throw createError('Proposal not found', 404);

    proposal.status = status;
    if (status === 'FINALIZED') {
      proposal.finalizedAt = new Date();
    } else {
      proposal.finalizedAt = undefined;
    }

    await proposal.save();

    const populated = await Proposal.findById(proposal._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'title')
      .lean();

    res.json(populated);
  })
);

// DELETE /api/proposals/:id
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const proposal = await Proposal.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!proposal) throw createError('Proposal not found', 404);
    if (proposal.status !== 'DRAFT') {
      throw createError('Only draft proposals can be deleted', 400);
    }

    await Proposal.deleteOne({ _id: proposal._id });
    res.json({ message: 'Proposal deleted' });
  })
);

export default router;
