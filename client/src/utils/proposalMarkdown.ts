import type { ProposalInvestment, ProposalInvestmentLine, ProposalPhase } from '../types';

export interface ParsedProposalMarkdown {
  title?: string;
  proposalNumber?: string;
  client?: string;
  project?: string;
  date?: string;
  introduction?: string;
  challenge?: string;
  solution?: string;
  terms?: string;
  assumptions?: string;
  phases?: ProposalPhase[];
  investment?: Partial<ProposalInvestment>;
  /** When true, line items should mirror phase estimates (numeric import path) */
  investmentSyncPhases?: boolean;
  errors: string[];
}

function coerceNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/** Extract a single monetary value from strings like "$11,180" or "11180"; ignores trailing text. */
function parseMoneyAmount(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  const m = s.match(/-?\$?\s*([\d,]+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function parseSimpleFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---\n') && !trimmed.startsWith('---\r\n')) {
    return { fm: {}, body: raw };
  }
  const nl = trimmed.indexOf('\n');
  const rest = trimmed.slice(nl + 1);
  const end = rest.search(/\n---\s*(\n|$)/);
  if (end === -1) {
    return { fm: {}, body: raw };
  }
  const block = rest.slice(0, end);
  const body = rest.slice(end).replace(/^\n---\s*\n?/, '');
  const fm: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (m) fm[m[1].toLowerCase()] = m[2].trim();
  }
  return { fm, body };
}

function splitMarkdownSections(md: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /^##\s+(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  const matches: { title: string; index: number }[] = [];
  while ((m = re.exec(md)) !== null) {
    matches.push({ title: m[1].trim().toLowerCase(), index: m.index });
  }
  if (matches.length === 0) {
    map.set('introduction', md.trim());
    return map;
  }
  const preamble = md.slice(0, matches[0].index).trim();
  for (let i = 0; i < matches.length; i++) {
    const lineMatch = md.slice(matches[i].index).match(/^##[^\n]+\r?\n?/);
    const start = matches[i].index + (lineMatch?.[0]?.length ?? 0);
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    map.set(matches[i].title, md.slice(start, end).trim());
  }
  if (preamble) {
    const intro = map.get('introduction');
    map.set('introduction', intro ? `${preamble}\n\n${intro}` : preamble);
  }
  return map;
}

function extractProposalDataFence(md: string): { body: string; data: unknown | null; error?: string } {
  const fence = /```proposal-data\s*\n([\s\S]*?)```/i.exec(md);
  if (!fence) return { body: md, data: null };
  const body = md.replace(fence[0], '').trim();
  try {
    const data = JSON.parse(fence[1].trim()) as unknown;
    return { body, data };
  } catch {
    return { body: md, data: null, error: 'Invalid JSON in ```proposal-data``` block' };
  }
}

function normalizeProposalPhase(raw: unknown): ProposalPhase | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : 'Phase';
  const bullets = Array.isArray(o.bullets)
    ? o.bullets.filter((x): x is string => typeof x === 'string')
    : [];
  const summary = typeof o.summary === 'string' ? o.summary : '';
  const estimatedCost = coerceNumber(o.estimatedCost);
  const estimatedHours = coerceNumber(o.estimatedHours);
  const duration = typeof o.duration === 'string' ? o.duration.trim() : undefined;
  const startDate = typeof o.startDate === 'string' ? o.startDate : undefined;
  const endDate = typeof o.endDate === 'string' ? o.endDate : undefined;
  return {
    name,
    summary: summary || undefined,
    bullets,
    estimatedCost,
    estimatedHours,
    duration: duration || undefined,
    startDate,
    endDate,
  };
}

function normalizeInvestmentLineRaw(raw: unknown): ProposalInvestmentLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label =
    typeof o.label === 'string'
      ? o.label.trim()
      : typeof o.item === 'string'
        ? o.item.trim()
        : '';
  if (!label) return null;
  const amount = parseMoneyAmount(o.amount);
  if (amount === undefined) return null;
  const hours = coerceNumber(o.hours);
  const duration = typeof o.duration === 'string' ? o.duration.trim() : undefined;
  return {
    label,
    amount,
    hours,
    duration: duration || undefined,
  };
}

function lineItemsFromPhases(phases: ProposalPhase[]): ProposalInvestmentLine[] {
  return phases.map((p) => ({
    label: p.name,
    amount: Number(p.estimatedCost) || 0,
    hours: p.estimatedHours,
    duration: p.duration,
  }));
}

function mergeNotesParts(...parts: (string | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join('\n\n');
}

/**
 * Split **Assumptions** (and following content before **Not included** or a fence) out of ## Terms body.
 */
function splitAssumptionsFromTerms(termsBody: string): { terms: string; assumptions?: string } {
  const marker = /\n\*\*Assumptions\*\*\s*\n/i.exec(termsBody);
  if (!marker) return { terms: termsBody };

  const mainTerms = termsBody.slice(0, marker.index).trimEnd();
  let rest = termsBody.slice(marker.index + marker[0].length).trimStart();

  const notInc = /\n\*\*Not included/i.exec(rest);
  let assumptions = notInc ? rest.slice(0, notInc.index).trim() : rest;
  const notIncludedBlock = notInc ? rest.slice(notInc.index).trim() : '';

  if (notIncludedBlock) {
    assumptions = [assumptions, notIncludedBlock].filter(Boolean).join('\n\n');
  }

  return {
    terms: mainTerms,
    assumptions: assumptions || undefined,
  };
}

function parsePhasesSection(text: string): ProposalPhase[] {
  if (!text.trim()) return [];
  const parts = text
    .split(/(?=^###\s+)/m)
    .map((p) => p.trim())
    .filter(Boolean);
  const phases: ProposalPhase[] = [];

  for (const part of parts) {
    const h = /^###\s+(.+?)\s*$/m.exec(part);
    const name = h ? h[1].trim() : 'Phase';
    const afterHeading = h ? part.slice(h.index + h[0].length).trim() : part;
    const lines = afterHeading.split(/\r?\n/);
    const bullets: string[] = [];
    const summaryLines: string[] = [];
    for (const line of lines) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) bullets.push(bullet[1].trim());
      else if (line.trim()) summaryLines.push(line.trim());
    }
    phases.push({
      name,
      summary: summaryLines.join('\n') || undefined,
      bullets,
    });
  }

  if (phases.length === 0 && text.trim()) {
    const bullets: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) bullets.push(bullet[1].trim());
    }
    phases.push({
      name: 'Phases',
      summary: text.trim(),
      bullets,
    });
  }

  return phases;
}

function applyProposalDataJson(
  data: Record<string, unknown>,
  _errors: string[]
): Pick<
  ParsedProposalMarkdown,
  'phases' | 'investment' | 'investmentSyncPhases'
> {
  void _errors;
  const narrativeLines: string[] = [];

  const phases: ProposalPhase[] = [];
  if (Array.isArray(data.phases)) {
    for (const raw of data.phases) {
      const p = normalizeProposalPhase(raw);
      if (p) phases.push(p);
    }
  }

  const invRaw =
    data.investment && typeof data.investment === 'object'
      ? (data.investment as Record<string, unknown>)
      : null;
  const parsedExtra: ProposalInvestmentLine[] = [];
  if (invRaw && Array.isArray(invRaw.lineItems)) {
    for (const row of invRaw.lineItems as unknown[]) {
      const line = normalizeInvestmentLineRaw(row);
      if (line) parsedExtra.push(line);
      else if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        const label =
          typeof o.label === 'string'
            ? o.label
            : typeof o.item === 'string'
              ? o.item
              : 'Line item';
        const amt = o.amount;
        if (typeof amt === 'string' && amt.trim()) {
          narrativeLines.push(`- **${label}:** ${amt.trim()}`);
        } else if (amt != null && typeof amt !== 'object') {
          narrativeLines.push(`- **${label}:** ${String(amt)}`);
        }
      }
    }
  }

  const phaseRollup = lineItemsFromPhases(phases);
  const hasNumericPhaseCosts = phaseRollup.some((l) => l.amount > 0);
  const usePhaseSync = hasNumericPhaseCosts;

  const lineItems = usePhaseSync ? phaseRollup : parsedExtra.length ? parsedExtra : phaseRollup;

  let notes = typeof invRaw?.notes === 'string' ? invRaw.notes : '';
  if (narrativeLines.length) {
    notes = mergeNotesParts(notes, narrativeLines.join('\n'));
  }

  const fees = coerceNumber(invRaw?.fees) ?? 0;
  const subtotal = lineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const total = subtotal + fees;

  return {
    phases,
    investment: {
      lineItems,
      fees,
      notes,
      subtotal,
      total,
    },
    investmentSyncPhases: usePhaseSync,
  };
}

/**
 * Parse imported markdown into proposal fields (hybrid: frontmatter + ## sections + optional proposal-data fence).
 */
export function parseProposalMarkdown(source: string): ParsedProposalMarkdown {
  const errors: string[] = [];
  const { fm, body: afterFm } = parseSimpleFrontmatter(source);
  const { body, data, error } = extractProposalDataFence(afterFm);
  if (error) errors.push(error);

  const sections = splitMarkdownSections(body);
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = sections.get(k.toLowerCase());
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const introduction =
    get('introduction', 'intro', 'cover / introduction') ??
    (sections.size === 1 && !sections.has('introduction') ? [...sections.values()][0] : undefined);

  let termsRaw = get('terms');
  let assumptionsFromSection = get(
    'assumptions',
    'assumptions & exclusions',
    'assumptions and exclusions'
  );

  let terms = termsRaw;
  let assumptions = assumptionsFromSection;
  if (termsRaw && !assumptionsFromSection) {
    const split = splitAssumptionsFromTerms(termsRaw);
    terms = split.terms;
    assumptions = split.assumptions ?? assumptions;
  }

  const result: ParsedProposalMarkdown = {
    title: fm.title || fm.project,
    proposalNumber: fm.proposalnumber || fm.proposal_number,
    client: fm.client,
    project: fm.project,
    date: fm.date,
    introduction,
    challenge: get('challenge'),
    solution: get('solution'),
    terms,
    assumptions,
    phases: parsePhasesSection(get('phases', 'phase breakdown', 'costing & timeline') ?? ''),
    errors,
  };

  if (data && typeof data === 'object' && data !== null) {
    const applied = applyProposalDataJson(data as Record<string, unknown>, errors);
    if (applied.phases?.length) result.phases = applied.phases;
    result.investment = applied.investment;
    result.investmentSyncPhases = applied.investmentSyncPhases;
  }

  return result;
}
