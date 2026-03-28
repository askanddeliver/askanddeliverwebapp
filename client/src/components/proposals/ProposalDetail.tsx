import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Printer,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle,
  Upload,
  Check,
  Download,
} from 'lucide-react';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { ProposalPreview, type ProposalPreviewModel } from './ProposalPreview';
import { proposalsApi, projectsApi, siteConfigApi, clientsApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { parseProposalMarkdown } from '../../utils/proposalMarkdown';
import type {
  SavedProposal,
  ProposalStatus,
  ProposalPhase,
  ProposalInvestmentLine,
  SiteConfig,
  ThemeColors,
  Client,
} from '../../types';

interface ProposalDetailProps {
  proposal: SavedProposal;
  onClose: () => void;
  onUpdated: (p: SavedProposal) => void;
  onDeleted: (id: string) => void;
}

function clientIdOf(p: SavedProposal): string {
  return typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
}

function projectIdOf(p: SavedProposal): string {
  if (!p.projectId) return '';
  return typeof p.projectId === 'object' ? p.projectId._id : p.projectId;
}

function emptyPhase(i: number): ProposalPhase {
  return { name: `Phase ${i}`, summary: '', bullets: [] };
}

function lineItemsFromPhasesList(phases: ProposalPhase[]) {
  return phases.map((p) => ({
    label: p.name,
    amount: Number(p.estimatedCost) || 0,
    hours: p.estimatedHours,
    duration: p.duration,
  }));
}

export function ProposalDetail({ proposal, onClose, onUpdated, onDeleted }: ProposalDetailProps) {
  const [record, setRecord] = useState(proposal);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [paletteChoice, setPaletteChoice] = useState<string>('workspace');

  const [title, setTitle] = useState(proposal.title);
  const [proposalNumber, setProposalNumber] = useState(proposal.proposalNumber);
  const [proposalDate, setProposalDate] = useState(proposal.proposalDate?.slice(0, 10) ?? '');
  const [clientId, setClientId] = useState(clientIdOf(proposal));
  const [projectId, setProjectId] = useState(projectIdOf(proposal));
  const [introduction, setIntroduction] = useState(proposal.introduction);
  const [challenge, setChallenge] = useState(proposal.challenge);
  const [solution, setSolution] = useState(proposal.solution);
  const [terms, setTerms] = useState(proposal.terms);
  const [assumptions, setAssumptions] = useState(proposal.assumptions ?? '');
  const [phases, setPhases] = useState<ProposalPhase[]>(proposal.phases || []);
  const [lineItems, setLineItems] = useState<ProposalInvestmentLine[]>(
    proposal.investment?.lineItems ?? []
  );
  const [investmentSyncPhases, setInvestmentSyncPhases] = useState(
    proposal.investmentSyncPhases === true
  );
  const [fees, setFees] = useState(proposal.investment?.fees ?? 0);
  const [investmentNotes, setInvestmentNotes] = useState(proposal.investment?.notes ?? '');
  const [accentSnapshot, setAccentSnapshot] = useState<ThemeColors>(proposal.accentSnapshot);
  const [sourceMarkdown, setSourceMarkdown] = useState(proposal.sourceMarkdown ?? '');

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projects, setProjects] = useState<{ _id: string; title: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const syncFormFromRecord = useCallback((p: SavedProposal) => {
    setTitle(p.title);
    setProposalNumber(p.proposalNumber);
    setProposalDate(p.proposalDate?.slice(0, 10) ?? '');
    setClientId(clientIdOf(p));
    setProjectId(projectIdOf(p));
    setIntroduction(p.introduction ?? '');
    setChallenge(p.challenge ?? '');
    setSolution(p.solution ?? '');
    setTerms(p.terms ?? '');
    setAssumptions(p.assumptions ?? '');
    setPhases(p.phases?.length ? p.phases : []);
    setLineItems(p.investment?.lineItems ?? []);
    setInvestmentSyncPhases(p.investmentSyncPhases === true);
    setFees(p.investment?.fees ?? 0);
    setInvestmentNotes(p.investment?.notes ?? '');
    setAccentSnapshot(p.accentSnapshot);
    setSourceMarkdown(p.sourceMarkdown ?? '');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([proposalsApi.getOne(proposal._id), siteConfigApi.get()])
      .then(([propRes, cfgRes]) => {
        if (cancelled) return;
        setRecord(propRes.data);
        syncFormFromRecord(propRes.data);
        setSiteConfig(cfgRes.data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Failed to load proposal');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposal._id, syncFormFromRecord]);

  useEffect(() => {
    clientsApi.getAll().then((res) => setClients(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    projectsApi.getByClient(clientId).then((res) => {
      setProjects((res.data || []).map((pr) => ({ _id: pr._id, title: pr.title })));
    }).catch(() => setProjects([]));
  }, [clientId]);

  const effectiveLineItems = useMemo(() => {
    if (!investmentSyncPhases) return lineItems;
    return lineItemsFromPhasesList(phases);
  }, [investmentSyncPhases, lineItems, phases]);

  const computedInvestment = useMemo(() => {
    const subtotal = effectiveLineItems.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const f = Number(fees) || 0;
    return { subtotal, total: subtotal + f, lineItems: effectiveLineItems, fees: f, notes: investmentNotes };
  }, [effectiveLineItems, fees, investmentNotes]);

  const previewModel: ProposalPreviewModel = useMemo(
    () => ({
      proposalNumber,
      title,
      proposalDate: proposalDate ? `${proposalDate}T12:00:00.000Z` : record.proposalDate,
      companyInfo: record.companyInfo,
      clientInfo: record.clientInfo,
      projectTitle: record.projectTitle,
      introduction,
      challenge,
      solution,
      phases,
      assumptions,
      investment: {
        lineItems: computedInvestment.lineItems,
        fees: computedInvestment.fees,
        notes: investmentNotes,
        subtotal: computedInvestment.subtotal,
        total: computedInvestment.total,
      },
      terms,
      accentSnapshot,
    }),
    [
      proposalNumber,
      title,
      proposalDate,
      record,
      introduction,
      challenge,
      solution,
      phases,
      assumptions,
      computedInvestment,
      investmentNotes,
      terms,
      accentSnapshot,
    ]
  );

  const applyPaletteChoice = (value: string, cfg: SiteConfig | null) => {
    setPaletteChoice(value);
    if (!cfg) return;
    if (value === 'workspace') {
      setAccentSnapshot({ ...cfg.colors });
      return;
    }
    const id = value.replace(/^palette:/, '');
    const pal = cfg.palettes?.find((p) => p._id === id);
    if (pal) setAccentSnapshot({ ...pal.colors });
  };

  const handleSave = async (opts?: { refreshCompanyInfo?: boolean }) => {
    try {
      setSaving(true);
      setError(null);
      const res = await proposalsApi.update(record._id, {
        title,
        proposalNumber,
        proposalDate: proposalDate ? `${proposalDate}T12:00:00.000Z` : undefined,
        clientId,
        projectId: projectId || null,
        introduction,
        challenge,
        solution,
        assumptions,
        terms,
        phases,
        investmentSyncPhases,
        investment: {
          lineItems: investmentSyncPhases ? lineItemsFromPhasesList(phases) : lineItems,
          fees: computedInvestment.fees,
          notes: investmentNotes,
        },
        accentSnapshot,
        sourceMarkdown: sourceMarkdown || undefined,
        refreshCompanyInfo: opts?.refreshCompanyInfo,
      });
      setRecord(res.data);
      syncFormFromRecord(res.data);
      onUpdated(res.data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: ProposalStatus) => {
    try {
      setSaving(true);
      setError(null);
      const res = await proposalsApi.updateStatus(record._id, status);
      setRecord(res.data);
      syncFormFromRecord(res.data);
      onUpdated(res.data);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setError(null);
      await proposalsApi.delete(record._id);
      onDeleted(record._id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const applyImport = () => {
    setImportErrors([]);
    const parsed = parseProposalMarkdown(importText);
    const errs = [...parsed.errors];
    if (parsed.title?.trim()) setTitle(parsed.title.trim());
    if (parsed.proposalNumber?.trim()) setProposalNumber(parsed.proposalNumber.trim());
    if (parsed.introduction !== undefined) setIntroduction(parsed.introduction);
    if (parsed.challenge !== undefined) setChallenge(parsed.challenge);
    if (parsed.solution !== undefined) setSolution(parsed.solution);
    if (parsed.terms !== undefined) setTerms(parsed.terms);
    if (parsed.assumptions !== undefined) setAssumptions(parsed.assumptions);
    if (parsed.phases?.length) setPhases(parsed.phases);

    const nextSync =
      parsed.investmentSyncPhases !== undefined
        ? parsed.investmentSyncPhases
        : investmentSyncPhases;
    setInvestmentSyncPhases(nextSync);

    if (parsed.investment) {
      if (parsed.investment.fees != null) setFees(parsed.investment.fees);
      if (parsed.investment.notes !== undefined) setInvestmentNotes(parsed.investment.notes ?? '');
    }
    if (parsed.phases?.length && nextSync) {
      setLineItems(lineItemsFromPhasesList(parsed.phases));
    } else if (!nextSync && parsed.investment?.lineItems?.length) {
      setLineItems(parsed.investment.lineItems);
    }

    setSourceMarkdown(importText.trim());
    if (errs.length) setImportErrors(errs);
    setImportOpen(false);
    setImportText('');
  };

  const draft = record.status === 'DRAFT';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto print:hidden">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl my-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 truncate max-w-md">{title}</h2>
                <ProposalStatusBadge status={record.status} />
              </div>
              <p className="text-sm text-gray-500">
                {record.clientInfo.name}
                {record.projectTitle ? ` · ${record.projectTitle}` : ''} · Updated{' '}
                {formatDate(record.updatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="px-6 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Download PDF / Print
            </button>
            {draft && (
              <>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving || loading}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleStatus('FINALIZED')}
                  disabled={saving || loading}
                  className="btn-primary flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark finalized
                </button>
                <a
                  href="/ask-deliver-proposal-template.md"
                  download="ask-deliver-proposal-template.md"
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Markdown template
                </a>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import markdown
                </button>
                <button
                  type="button"
                  onClick={() => handleSave({ refreshCompanyInfo: true })}
                  disabled={saving || loading}
                  className="btn-secondary text-sm"
                >
                  Sync company info
                </button>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="btn-secondary text-red-600 text-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="text-red-600">Delete draft?</span>
                    <button type="button" className="text-red-600 font-medium" onClick={handleDelete}>
                      Yes
                    </button>
                    <button type="button" className="text-gray-500" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </span>
                )}
              </>
            )}
            {!draft && (
              <button
                type="button"
                onClick={() => handleStatus('DRAFT')}
                disabled={saving || loading}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Revert to draft
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-5 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input
                      className="input text-sm w-full"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!draft}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Proposal #</label>
                    <input
                      className="input text-sm w-full font-mono"
                      value={proposalNumber}
                      onChange={(e) => setProposalNumber(e.target.value)}
                      disabled={!draft}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      className="input text-sm w-full"
                      value={proposalDate}
                      onChange={(e) => setProposalDate(e.target.value)}
                      disabled={!draft}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accent palette</label>
                    <select
                      className="input text-sm w-full"
                      value={paletteChoice}
                      onChange={(e) => applyPaletteChoice(e.target.value, siteConfig)}
                      disabled={!draft}
                    >
                      <option value="workspace">Workspace default</option>
                      {(siteConfig?.palettes ?? []).map((p) => (
                        <option key={p._id} value={`palette:${p._id}`}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Client and project snapshots are stored on the saved proposal. Change client below to refresh
                  the client block; use &quot;Sync company info&quot; to pull the latest address from Site Config.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                    <select
                      className="input text-sm w-full"
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        setProjectId('');
                      }}
                      disabled={!draft}
                    >
                      {clientId && !clients.some((c) => c._id === clientId) && (
                        <option value={clientId}>{record.clientInfo.name} (unavailable)</option>
                      )}
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                    <select
                      className="input text-sm w-full"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      disabled={!draft}
                    >
                      <option value="">None</option>
                      {projects.map((pr) => (
                        <option key={pr._id} value={pr._id}>
                          {pr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {['Introduction', 'Challenge', 'Solution', 'Terms'].map((label) => {
                  const key = label.toLowerCase() as 'introduction' | 'challenge' | 'solution' | 'terms';
                  const val =
                    key === 'introduction'
                      ? introduction
                      : key === 'challenge'
                        ? challenge
                        : key === 'solution'
                          ? solution
                          : terms;
                  const setter =
                    key === 'introduction'
                      ? setIntroduction
                      : key === 'challenge'
                        ? setChallenge
                        : key === 'solution'
                          ? setSolution
                          : setTerms;
                  return (
                    <div key={label}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label} (markdown)</label>
                      <textarea
                        className="input text-sm w-full font-mono min-h-[100px] resize-y"
                        value={val}
                        onChange={(e) => setter(e.target.value)}
                        disabled={!draft}
                      />
                    </div>
                  );
                })}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Assumptions & exclusions (markdown)
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Optional. Import maps <code className="bg-gray-100 px-1 rounded">## Assumptions</code> or a{' '}
                    <strong>Assumptions</strong> block under Terms.
                  </p>
                  <textarea
                    className="input text-sm w-full font-mono min-h-[100px] resize-y"
                    value={assumptions}
                    onChange={(e) => setAssumptions(e.target.value)}
                    disabled={!draft}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Phases</label>
                    {draft && (
                      <button
                        type="button"
                        className="text-xs text-primary-600 font-medium"
                        onClick={() => setPhases((prev) => [...prev, emptyPhase(prev.length + 1)])}
                      >
                        + Add phase
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {phases.map((ph, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <input
                          className="input text-sm w-full font-semibold"
                          value={ph.name}
                          onChange={(e) => {
                            const next = [...phases];
                            next[idx] = { ...ph, name: e.target.value };
                            setPhases(next);
                          }}
                          disabled={!draft}
                          placeholder="Phase name"
                        />
                        <textarea
                          className="input text-sm w-full min-h-[60px]"
                          value={ph.summary ?? ''}
                          onChange={(e) => {
                            const next = [...phases];
                            next[idx] = { ...ph, summary: e.target.value };
                            setPhases(next);
                          }}
                          disabled={!draft}
                          placeholder="Summary (markdown)"
                        />
                        <textarea
                          className="input text-sm w-full min-h-[56px] font-mono"
                          value={ph.bullets.join('\n')}
                          onChange={(e) => {
                            const next = [...phases];
                            next[idx] = {
                              ...ph,
                              bullets: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                            };
                            setPhases(next);
                          }}
                          disabled={!draft}
                          placeholder="One bullet per line"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Hours</span>
                            <input
                              type="number"
                              className="input text-xs w-full"
                              placeholder="—"
                              value={ph.estimatedHours ?? ''}
                              onChange={(e) => {
                                const next = [...phases];
                                const v = e.target.value;
                                next[idx] = {
                                  ...ph,
                                  estimatedHours: v === '' ? undefined : Number(v),
                                };
                                setPhases(next);
                              }}
                              disabled={!draft}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Timeline</span>
                            <input
                              className="input text-xs w-full"
                              placeholder="e.g. 2–3 weeks"
                              value={ph.duration ?? ''}
                              onChange={(e) => {
                                const next = [...phases];
                                next[idx] = { ...ph, duration: e.target.value };
                                setPhases(next);
                              }}
                              disabled={!draft}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Est. cost</span>
                            <input
                              type="number"
                              className="input text-xs w-full"
                              placeholder="—"
                              value={ph.estimatedCost ?? ''}
                              onChange={(e) => {
                                const next = [...phases];
                                const v = e.target.value;
                                next[idx] = {
                                  ...ph,
                                  estimatedCost: v === '' ? undefined : Number(v),
                                };
                                setPhases(next);
                              }}
                              disabled={!draft}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block mb-0.5">Start</span>
                            <input
                              className="input text-xs w-full"
                              placeholder="Optional"
                              value={ph.startDate ?? ''}
                              onChange={(e) => {
                                const next = [...phases];
                                next[idx] = { ...ph, startDate: e.target.value };
                                setPhases(next);
                              }}
                              disabled={!draft}
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase text-gray-500 block mb-0.5">End</span>
                            <input
                              className="input text-xs w-full"
                              placeholder="Optional"
                              value={ph.endDate ?? ''}
                              onChange={(e) => {
                                const next = [...phases];
                                next[idx] = { ...ph, endDate: e.target.value };
                                setPhases(next);
                              }}
                              disabled={!draft}
                            />
                          </div>
                        </div>
                        {draft && (
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => setPhases((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Remove phase
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="text-xs font-medium text-gray-600">Investment</label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={investmentSyncPhases}
                        disabled={!draft}
                        onChange={(e) => {
                          const on = e.target.checked;
                          if (!on) setLineItems(lineItemsFromPhasesList(phases));
                          setInvestmentSyncPhases(on);
                        }}
                      />
                      Mirror phases in line items
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {investmentSyncPhases
                      ? 'Each phase with an est. cost becomes one row (with hours & timeline when set). Turn off to edit rows manually.'
                      : 'Manual rows — amounts must be numbers for PDF totals.'}
                  </p>
                  {investmentSyncPhases ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 text-sm text-gray-600 space-y-1">
                      {effectiveLineItems.length === 0 ? (
                        <p className="text-gray-400 italic">Add phases with est. cost to populate the table.</p>
                      ) : (
                        effectiveLineItems.map((row, idx) => (
                          <div key={idx} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 last:border-0 py-1.5">
                            <span className="font-medium text-gray-800">{row.label}</span>
                            <span className="text-gray-600 text-xs">
                              {row.hours != null ? `${row.hours} h` : ''}
                              {row.duration ? ` · ${row.duration}` : ''}
                              <span className="font-semibold text-gray-900 ml-2">
                                {formatCurrency(row.amount)}
                              </span>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draft && (
                        <button
                          type="button"
                          className="text-xs text-primary-600 font-medium"
                          onClick={() =>
                            setLineItems((prev) => [
                              ...prev,
                              { label: 'Line item', amount: 0 },
                            ])
                          }
                        >
                          + Add line
                        </button>
                      )}
                      {lineItems.map((row, idx) => (
                        <div key={idx} className="flex flex-wrap gap-2 items-end">
                          <input
                            className="input text-sm flex-1 min-w-[120px]"
                            value={row.label}
                            onChange={(e) => {
                              const next = [...lineItems];
                              next[idx] = { ...row, label: e.target.value };
                              setLineItems(next);
                            }}
                            disabled={!draft}
                            placeholder="Label"
                          />
                          <input
                            type="number"
                            className="input text-sm w-16"
                            placeholder="Hrs"
                            value={row.hours ?? ''}
                            onChange={(e) => {
                              const next = [...lineItems];
                              const v = e.target.value;
                              next[idx] = {
                                ...row,
                                hours: v === '' ? undefined : Number(v),
                              };
                              setLineItems(next);
                            }}
                            disabled={!draft}
                          />
                          <input
                            className="input text-sm w-24"
                            placeholder="Timeline"
                            value={row.duration ?? ''}
                            onChange={(e) => {
                              const next = [...lineItems];
                              next[idx] = { ...row, duration: e.target.value };
                              setLineItems(next);
                            }}
                            disabled={!draft}
                          />
                          <input
                            type="number"
                            className="input text-sm w-28"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...lineItems];
                              next[idx] = { ...row, amount: Number(e.target.value) || 0 };
                              setLineItems(next);
                            }}
                            disabled={!draft}
                          />
                          {draft && (
                            <button
                              type="button"
                              className="text-xs text-red-600 px-1 pb-2"
                              onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Fees</label>
                      <input
                        type="number"
                        className="input text-sm w-full"
                        value={fees}
                        onChange={(e) => setFees(Number(e.target.value) || 0)}
                        disabled={!draft}
                      />
                    </div>
                    <div className="text-sm text-gray-600 flex flex-col justify-end">
                      <span>Subtotal: {formatCurrency(computedInvestment.subtotal)}</span>
                      <span className="font-semibold text-gray-900">
                        Total: {formatCurrency(computedInvestment.total)}
                      </span>
                    </div>
                  </div>
                  <label className="block text-xs font-medium text-gray-600 mt-2">Investment notes (markdown)</label>
                  <textarea
                    className="input text-sm w-full min-h-[56px] font-mono"
                    value={investmentNotes}
                    onChange={(e) => setInvestmentNotes(e.target.value)}
                    disabled={!draft}
                  />
                </div>
              </div>

              <div className="lg:sticky lg:top-4 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Live preview</p>
                <ProposalPreview model={previewModel} />
              </div>
            </div>
          )}
        </div>
      </div>

      {importOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Import markdown</h3>
              <button type="button" onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <p className="text-sm text-gray-600">
                Optional YAML frontmatter; <code className="text-xs bg-gray-100 px-1 rounded">##</code> sections
                (Introduction, Challenge, Solution, Terms, Assumptions, …); and a{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">proposal-data</code> JSON block for phases &
                investment. Non-numeric line items (e.g. hourly rate text) are appended to investment notes.
              </p>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Or choose a file</span>
                <input
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  className="text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    f.text().then(setImportText).catch(() => setImportErrors(['Could not read file']));
                  }}
                />
              </label>
              <textarea
                className="input text-sm w-full min-h-[200px] font-mono"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="---&#10;client: Acme&#10;---&#10;&#10;## Introduction&#10;..."
              />
              {importErrors.length > 0 && (
                <ul className="text-sm text-amber-700 list-disc pl-5">
                  {importErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm flex items-center gap-2"
                onClick={applyImport}
                disabled={!importText.trim()}
              >
                <Check className="w-4 h-4" />
                Apply to form
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block print:overflow-visible print:bg-white">
        <ProposalPreview model={previewModel} />
      </div>
    </>
  );
}
