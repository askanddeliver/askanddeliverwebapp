import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, DollarSign, TrendingUp, Wallet, FileText, List, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { InvoicePreview } from '../components/reports/InvoicePreview';
import { ExportButtons } from '../components/reports/ExportButtons';
import { LineItemsPanel } from '../components/reports/LineItemsPanel';
import { MemberContributionsPanel } from '../components/reports/MemberContributionsPanel';
import { EntryRow } from '../components/entries/EntryRow';
import {
  clientsApi,
  projectsApi,
  reportsApi,
  timeEntriesApi,
  lineItemsApi,
  usersApi,
} from '../services/api';
import {
  getDaysAgoString,
  getTodayString,
  formatDurationHuman,
  formatCurrency,
  getEffectiveRate,
} from '../utils/calculations';
import type { Client, Project, Invoice, TimeEntry, LineItem, User } from '../types';

type TabId = 'invoice' | 'entries' | 'members';
type EntrySortKey = 'date' | 'client' | 'amount' | 'member';

function Reports() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('invoice');
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [entrySort, setEntrySort] = useState<EntrySortKey>('date');
  const [entrySortDesc, setEntrySortDesc] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');

  // Filter state
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState(getDaysAgoString(30));
  const [endDate, setEndDate] = useState(getTodayString());

  // Invoice + entries + line items data
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, projectsRes, usersRes] = await Promise.all([
        clientsApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll().catch(() => ({ data: [] })),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on initial load once data is ready
  useEffect(() => {
    if (!loading && startDate && endDate) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleDeleteEntry = async (id: string) => {
    try {
      await timeEntriesApi.delete(id);
      setFilteredEntries((prev) => prev.filter((e) => e._id !== id));
      handleGenerate();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      setGenerating(true);
      setError(null);

      const [invoiceRes, entriesRes, lineItemsRes] = await Promise.all([
        reportsApi.generateInvoice({
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          startDate,
          endDate,
        }),
        timeEntriesApi.getAll({
          startDate,
          endDate,
          projectId: projectId || undefined,
        }),
        lineItemsApi.getAll({
          clientId: clientId || undefined,
          projectId: projectId || undefined,
          startDate,
          endDate,
        }),
      ]);

      setInvoice(invoiceRes.data);
      setLineItems(lineItemsRes.data || []);

      let entries = (entriesRes.data || []).filter(
        (e: TimeEntry) => !e.isRunning
      );
      if (clientId) {
        entries = entries.filter((e: TimeEntry) => {
          const project = typeof e.projectId === 'object' ? e.projectId : null;
          const entryClient =
            project && typeof project.clientId === 'object'
              ? project.clientId
              : null;
          return entryClient && entryClient._id === clientId;
        });
      }
      setFilteredEntries(entries);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }, [clientId, projectId, startDate, endDate]);

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.auth0Id, u.name));
    return m;
  }, [users]);

  const sortedEntries = useMemo(() => {
    let arr = [...filteredEntries];
    if (memberFilter) {
      arr = arr.filter((e) => (e.userId ? userMap.get(e.userId) : '') === memberFilter);
    }
    arr.sort((a, b) => {
      let cmp = 0;
      switch (entrySort) {
        case 'date':
          cmp = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case 'client': {
          const getClientName = (e: TimeEntry) => {
            const proj = typeof e.projectId === 'object' ? e.projectId : null;
            const c = proj?.clientId;
            return c && typeof c === 'object' ? c.name : '';
          };
          cmp = getClientName(a).localeCompare(getClientName(b));
          break;
        }
        case 'member': {
          const aName = a.userId ? userMap.get(a.userId) || '' : '';
          const bName = b.userId ? userMap.get(b.userId) || '' : '';
          cmp = aName.localeCompare(bName);
          break;
        }
        case 'amount': {
          const getAmount = (e: TimeEntry) => {
            const taskType = typeof e.taskTypeId === 'object' ? e.taskTypeId : null;
            const project = typeof e.projectId === 'object' ? e.projectId : null;
            const client = project && typeof project.clientId === 'object' ? project.clientId : null;
            if (!taskType) return 0;
            const rate = client ? getEffectiveRate(taskType, client) : taskType.rate;
            return (e.duration / 3600) * rate;
          };
          cmp = getAmount(a) - getAmount(b);
          break;
        }
        default:
          cmp = 0;
      }
      return entrySortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filteredEntries, memberFilter, entrySort, entrySortDesc, userMap]);

  const uniqueMembersInEntries = useMemo(() => {
    const names = new Set<string>();
    filteredEntries.forEach((e) => {
      if (e.userId) {
        const name = userMap.get(e.userId);
        if (name) names.add(name);
      }
    });
    return Array.from(names).sort();
  }, [filteredEntries, userMap]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'entries', label: 'Time Entries', icon: List },
    { id: 'members', label: 'Member Contributions', icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Invoicing
        </h1>
        <p className="text-gray-500 mt-1">
          Generate invoices, filter by client, and view member contributions
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters & Export */}
      <div className="card space-y-4 mb-6 print:hidden">
        <h3 className="text-lg font-bold text-gray-900">Filter & Export</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId('');
              }}
              className="input"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
            >
              <option value="">All Projects</option>
              {(clientId
                ? projects.filter((p) => {
                    const pClientId = typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
                    return pClientId === clientId;
                  })
                : projects
              ).map((p) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons
            clientId={clientId || undefined}
            projectId={projectId || undefined}
            startDate={startDate}
            endDate={endDate}
            disabled={!invoice || invoice.items.length === 0}
          />

          <button
            onClick={handleGenerate}
            disabled={generating || !startDate || !endDate}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Invoice'}
          </button>

          <div className="flex gap-2 text-xs">
            <button
              onClick={() => { setStartDate(getDaysAgoString(7)); setEndDate(getTodayString()); }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => { setStartDate(getDaysAgoString(30)); setEndDate(getTodayString()); }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(getTodayString());
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              This month
            </button>
            {(clientId || projectId) && (
              <button
                onClick={() => { setClientId(''); setProjectId(''); }}
                className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Fixed-Cost Line Items */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors text-left"
        >
          <span className="font-medium text-gray-900">
            Fixed-Cost Line Items {lineItems.length > 0 && `(${lineItems.length})`}
          </span>
          {lineItemsExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {lineItemsExpanded && (
          <div className="mt-2">
            <LineItemsPanel
              lineItems={lineItems}
              clients={clients}
              projects={projects}
              selectedClientId={clientId}
              onChanged={handleGenerate}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {invoice && invoice.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDurationHuman(invoice.totalHours * 3600)}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(invoice.total)}
              </p>
            </div>
          </div>
          {invoice.totalEarned != null && (
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Earned (Cost)</p>
                <p className="text-2xl font-bold text-gray-700">
                  {formatCurrency(invoice.totalEarned)}
                </p>
              </div>
            </div>
          )}
          {invoice.totalMargin != null && (
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Margin</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(invoice.totalMargin)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 print:hidden">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content (hidden when printing - use print block below) */}
      {activeTab === 'invoice' && invoice && invoice.items.length > 0 && (
        <div className="mb-6 print:hidden">
          <InvoicePreview invoice={invoice} />
        </div>
      )}

      {activeTab === 'entries' && (
        <div className="mb-6 print:hidden">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Time Entries ({sortedEntries.length})
              </h3>
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Member</label>
                  <select
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="input text-sm max-w-[180px]"
                  >
                    <option value="">All members</option>
                    {uniqueMembersInEntries.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sort by</label>
                  <select
                    value={entrySort}
                    onChange={(e) => setEntrySort(e.target.value as EntrySortKey)}
                    className="input text-sm max-w-[140px]"
                  >
                    <option value="date">Date</option>
                    <option value="client">Client</option>
                    <option value="member">Member</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
                <button
                  onClick={() => setEntrySortDesc((d) => !d)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                  title={entrySortDesc ? 'Newest first' : 'Oldest first'}
                >
                  {entrySortDesc ? '↓ Desc' : '↑ Asc'}
                </button>
              </div>
            </div>
            {sortedEntries.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">
                No entries match the selected filters.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedEntries.map((entry) => (
                  <EntryRow
                    key={entry._id}
                    entry={entry}
                    onEdit={() => {}}
                    onDelete={handleDeleteEntry}
                    showAmount={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && invoice?.costBreakdown && (
        <div className="mb-6 print:hidden">
          <MemberContributionsPanel
            costBreakdown={invoice.costBreakdown}
            totalBilled={invoice.total}
            totalEarned={invoice.totalEarned}
            totalMargin={invoice.totalMargin}
          />
        </div>
      )}

      {invoice && invoice.items.length === 0 && (
        <div className="card text-center py-12 mb-6 print:hidden">
          <p className="text-gray-500">No time entries found for the selected filters.</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your date range or filters.</p>
        </div>
      )}

      {/* Invoice print view: summary + entries on page 2 */}
      {invoice && invoice.items.length > 0 && (
        <div className="hidden print:block print:overflow-visible">
          <InvoicePreview invoice={invoice} />
          {filteredEntries.length > 0 && (
            <div className="mt-6 break-before-page">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Time Entries ({filteredEntries.length})
              </h3>
              <div className="divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <EntryRow
                    key={entry._id}
                    entry={entry}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    showAmount={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
