import { useState, useEffect, useCallback } from 'react';
import { Download, FileStack, Plus } from 'lucide-react';
import { ProposalStatusBadge } from '../components/proposals/ProposalStatusBadge';
import { ProposalDetail } from '../components/proposals/ProposalDetail';
import { CreateProposalModal } from '../components/proposals/CreateProposalModal';
import { proposalsApi, clientsApi } from '../services/api';
import { formatDate } from '../utils/calculations';
import type { SavedProposal, Client } from '../types';

type TabFilter = 'ALL' | 'DRAFT' | 'FINALIZED';

function Proposals() {
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<{ draft: { count: number }; finalized: { count: number } } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TabFilter>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<SavedProposal | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (clientFilter) params.clientId = clientFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [listRes, statsRes] = await Promise.all([
        proposalsApi.getAll(params as Parameters<typeof proposalsApi.getAll>[0]),
        proposalsApi.getStats(),
      ]);
      setProposals(listRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, searchQuery]);

  useEffect(() => {
    clientsApi.getAll().then((res) => setClients(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleUpdated = (p: SavedProposal) => {
    setProposals((prev) => prev.map((x) => (x._id === p._id ? p : x)));
    setSelected(p);
    proposalsApi.getStats().then((res) => setStats(res.data)).catch(() => {});
  };

  const handleDeleted = (id: string) => {
    setProposals((prev) => prev.filter((x) => x._id !== id));
    setSelected(null);
    proposalsApi.getStats().then((res) => setStats(res.data)).catch(() => {});
  };

  const handleCreate = async (payload: { clientId: string; title: string }) => {
    const res = await proposalsApi.create(payload);
    setProposals((prev) => [res.data, ...prev]);
    setSelected(res.data);
    setShowCreate(false);
    proposalsApi.getStats().then((r) => setStats(r.data)).catch(() => {});
  };

  const tabs: { id: TabFilter; label: string; count?: number }[] = [
    { id: 'ALL', label: 'All', count: proposals.length },
    { id: 'DRAFT', label: 'Draft', count: stats?.draft.count },
    { id: 'FINALIZED', label: 'Finalized', count: stats?.finalized.count },
  ];

  return (
    <>
      <div className="w-full print:hidden">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
            <p className="text-gray-500 mt-1">
              Branded proposals with markdown, palettes, and print-to-PDF
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New proposal
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileStack className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Drafts</p>
                <p className="text-xl font-bold text-gray-700">{stats.draft.count}</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileStack className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Finalized</p>
                <p className="text-xl font-bold text-emerald-800">{stats.finalized.count}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="input text-sm py-1.5 max-w-[200px]"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or #…"
            className="input text-sm py-1.5 max-w-[200px]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="card text-center py-12">
            <FileStack className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No proposals yet.</p>
            <p className="text-gray-400 text-sm mt-1">Create one to get started.</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {proposals.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setSelected(p)}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-500">{p.proposalNumber}</span>
                    <ProposalStatusBadge status={p.status} />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.title}</p>
                  <p className="text-sm text-gray-600 truncate">{p.clientInfo.name}</p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                  {formatDate(p.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProposalModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {selected && (
        <ProposalDetail
          proposal={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

export default Proposals;
