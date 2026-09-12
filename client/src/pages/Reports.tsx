import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, TrendingUp, Wallet, FileText, List, Users, ChevronDown, ChevronUp, Plus, Hourglass } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';
import { InvoicePreview } from '../components/reports/InvoicePreview';
import { PayStubPreview } from '../components/reports/PayStubPreview';
import { ExportButtons } from '../components/reports/ExportButtons';
import { LineItemsPanel } from '../components/reports/LineItemsPanel';
import { MemberContributionsPanel } from '../components/reports/MemberContributionsPanel';
import { ReportFilterRail } from '../components/reports/ReportFilterRail';
import { ReportEntriesTable } from '../components/reports/ReportEntriesTable';
import { CreateInvoiceModal } from '../components/invoices/CreateInvoiceModal';
import { EntryModal } from '../components/entries/EntryModal';
import {
  clientsApi,
  projectsApi,
  reportsApi,
  timeEntriesApi,
  timeBlocksApi,
  lineItemsApi,
  usersApi,
  taskTypesApi,
  projectTasksApi,
  filterPresetsApi,
} from '../services/api';
import {
  getDaysAgoString,
  getTodayString,
  formatDurationHuman,
  formatCurrency,
  getEffectiveRate,
  toUTCStartOfDay,
  toUTCEndOfDay,
  getReportDateRange,
  matchReportDatePreset,
} from '../utils/calculations';
import { projectClientId } from '../utils/projectClient';
import {
  DEFAULT_REPORT_COLUMN_IDS,
  sanitizeReportColumnIds,
  visibleReportColumns,
  type ReportColumnId,
} from '../utils/reportColumns';
import {
  payStubHours,
  payStubItemsFromCostBreakdown,
  payStubTotal,
} from '../utils/payStub';
import type {
  Client,
  Project,
  ProjectBillingMode,
  Invoice,
  TimeEntry,
  LineItem,
  User,
  TaskType,
  ProjectTask,
  ExpandedTimeBlock,
  FilterPreset,
  FilterPresetPayload,
  InvoiceDocumentKind,
} from '../types';

type TabId = 'invoice' | 'entries' | 'members';

type EntrySortKey = 'date' | 'client' | 'amount' | 'member';

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
}

function asBillingModes(modes: string[]): ProjectBillingMode[] {
  return modes.filter(
    (m): m is ProjectBillingMode =>
      m === 'HOURLY' || m === 'FIXED_PRICE' || m === 'HOUR_RETAINER'
  );
}

function Reports() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saveKind, setSaveKind] = useState<InvoiceDocumentKind>('INVOICE');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('invoice');
  const [plannedBlocks, setPlannedBlocks] = useState<ExpandedTimeBlock[]>([]);
  const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
  const [entrySort, setEntrySort] = useState<EntrySortKey>('date');
  const [entrySortDesc, setEntrySortDesc] = useState(true);
  const [memberFilter, setMemberFilter] = useState('');

  // Filter state
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [billingModes, setBillingModes] = useState<ProjectBillingMode[]>([]);
  const [memberAuth0Ids, setMemberAuth0Ids] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(getDaysAgoString(30));
  const [endDate, setEndDate] = useState(getTodayString());

  // Invoice PDF display options
  const [includeTimeEntries, setIncludeTimeEntries] = useState(true);
  const [includeEntryDescriptions, setIncludeEntryDescriptions] = useState(false);
  const [columnIds, setColumnIds] = useState<ReportColumnId[]>([...DEFAULT_REPORT_COLUMN_IDS]);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetBusy, setPresetBusy] = useState(false);

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
      const [clientsRes, projectsRes, usersRes, taskTypesRes, projectTasksRes, presetsRes] = await Promise.all([
        clientsApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll().catch(() => ({ data: [] })),
        taskTypesApi.getAll().catch(() => ({ data: [] })),
        projectTasksApi.getAll().catch(() => ({ data: [] })),
        filterPresetsApi.getAll({ kind: 'REPORT' }).catch(() => ({ data: [] })),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
      setUsers(usersRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasks(projectTasksRes.data || []);
      setFilterPresets(presetsRes.data || []);
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

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  };

  const handleSaveEntry = async (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    if (!editingEntry) return;
    try {
      await timeEntriesApi.update(editingEntry._id, data);
      setEditModalOpen(false);
      setEditingEntry(null);
      handleGenerate();
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError('Failed to save entry');
    }
  };

  const handleGenerate = useCallback(async (overrides?: {
    clientIds?: string[];
    projectIds?: string[];
    billingModes?: ProjectBillingMode[];
    memberAuth0Ids?: string[];
    startDate?: string;
    endDate?: string;
  }) => {
    const nextClientIds = overrides?.clientIds ?? clientIds;
    const nextProjectIds = overrides?.projectIds ?? projectIds;
    const nextBillingModes = overrides?.billingModes ?? billingModes;
    const nextMemberIds = overrides?.memberAuth0Ids ?? memberAuth0Ids;
    const nextStart = overrides?.startDate ?? startDate;
    const nextEnd = overrides?.endDate ?? endDate;
    const allTime = !nextStart && !nextEnd;
    if (!allTime && (!nextStart || !nextEnd)) return;

    try {
      setGenerating(true);
      setError(null);

      const utcStart = allTime ? undefined : toUTCStartOfDay(nextStart);
      const utcEnd = allTime ? undefined : toUTCEndOfDay(nextEnd);

      const [invoiceRes, entriesRes, lineItemsRes, blocksRes] = await Promise.all([
        reportsApi.generateInvoice({
          clientIds: nextClientIds.length > 0 ? nextClientIds : undefined,
          projectIds: nextProjectIds.length > 0 ? nextProjectIds : undefined,
          billingModes: nextBillingModes.length > 0 ? nextBillingModes : undefined,
          memberAuth0Ids: nextMemberIds.length > 0 ? nextMemberIds : undefined,
          startDate: utcStart,
          endDate: utcEnd,
        }),
        timeEntriesApi.getAll({
          startDate: utcStart,
          endDate: utcEnd,
          projectIds: nextProjectIds.length > 0 ? nextProjectIds : undefined,
          userIds: nextMemberIds.length > 0 ? nextMemberIds : undefined,
        }),
        lineItemsApi.getAll({
          clientIds: nextClientIds.length > 0 ? nextClientIds : undefined,
          projectIds: nextProjectIds.length > 0 ? nextProjectIds : undefined,
          startDate: utcStart,
          endDate: utcEnd,
        }),
        utcStart && utcEnd
          ? timeBlocksApi.getAll({ start: utcStart, end: utcEnd }).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] as ExpandedTimeBlock[] }),
      ]);

      setInvoice(invoiceRes.data);
      setLineItems(lineItemsRes.data || []);

      let entries = (entriesRes.data || []).filter(
        (e: TimeEntry) => !e.isRunning
      );
      if (nextClientIds.length > 0) {
        const allowed = new Set(nextClientIds);
        entries = entries.filter((e: TimeEntry) => {
          const project = typeof e.projectId === 'object' ? e.projectId : null;
          const entryClient =
            project && typeof project.clientId === 'object'
              ? project.clientId
              : null;
          return entryClient && allowed.has(entryClient._id);
        });
      }
      if (nextBillingModes.length > 0) {
        const allowedModes = new Set(nextBillingModes);
        entries = entries.filter((e: TimeEntry) => {
          const project = typeof e.projectId === 'object' ? e.projectId : null;
          const mode = (project?.billingMode ?? 'HOURLY') as ProjectBillingMode;
          return allowedModes.has(mode);
        });
      }
      setFilteredEntries(entries);
      setPlannedBlocks(blocksRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to generate report:', err);
      setInvoice(null);
      setFilteredEntries([]);
      setLineItems([]);
      setPlannedBlocks([]);
      const serverMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(serverMsg ? `Failed to generate report: ${serverMsg}` : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }, [clientIds, projectIds, billingModes, memberAuth0Ids, startDate, endDate]);

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

  const blockTimeStats = useMemo(() => {
    const plannedSeconds = plannedBlocks.reduce((sum, b) => {
      const a = new Date(b.startTime).getTime();
      const z = new Date(b.endTime).getTime();
      return sum + Math.max(0, (z - a) / 1000);
    }, 0);
    let linkedSeconds = 0;
    let unlinkedSeconds = 0;
    for (const e of filteredEntries) {
      if (e.blockId) linkedSeconds += e.duration;
      else unlinkedSeconds += e.duration;
    }
    return { plannedSeconds, linkedSeconds, unlinkedSeconds };
  }, [plannedBlocks, filteredEntries]);

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

  const handleClientIdsChange = (ids: string[]) => {
    setClientIds(ids);
    if (ids.length === 0) return;
    const allowed = new Set(
      projects.filter((p) => ids.includes(projectClientId(p))).map((p) => p._id)
    );
    setProjectIds((prev) => prev.filter((id) => allowed.has(id)));
  };

  const handleBillingModesChange = (modes: ProjectBillingMode[]) => {
    setBillingModes(modes);
    if (modes.length === 0) return;
    const allowed = new Set(
      projects
        .filter((p) => modes.includes(p.billingMode ?? 'HOURLY'))
        .map((p) => p._id)
    );
    setProjectIds((prev) => prev.filter((id) => allowed.has(id)));
  };

  const handleClearFilters = () => {
    setClientIds([]);
    setProjectIds([]);
    setBillingModes([]);
    setMemberAuth0Ids([]);
    setSelectedPresetId('');
  };

  const buildPresetPayload = (name: string): FilterPresetPayload => ({
    name,
    kind: 'REPORT',
    clientIds,
    projectIds,
    billingModes,
    memberAuth0Ids,
    datePreset: matchReportDatePreset(startDate, endDate),
    startDate,
    endDate,
    columnIds,
    includeTimeEntries,
    includeEntryDescriptions,
  });

  const applyPreset = (id: string) => {
    if (!id) {
      setSelectedPresetId('');
      return;
    }
    const preset = filterPresets.find((p) => p._id === id);
    if (!preset) return;
    setError(null);

    const nextClientIds = preset.clientIds.filter((cid) => clients.some((c) => c._id === cid));
    const nextBillingModes = asBillingModes(preset.billingModes);
    const memberIds = new Set(
      users.filter((u) => u.role === 'admin' || u.role === 'member').map((u) => u.auth0Id)
    );
    const nextMemberIds = preset.memberAuth0Ids.filter((mid) => memberIds.has(mid));
    let nextProjectIds = preset.projectIds.filter((pid) => projects.some((p) => p._id === pid));
    if (nextClientIds.length > 0) {
      const allowed = new Set(
        projects.filter((p) => nextClientIds.includes(projectClientId(p))).map((p) => p._id)
      );
      nextProjectIds = nextProjectIds.filter((pid) => allowed.has(pid));
    }
    if (nextBillingModes.length > 0) {
      const allowed = new Set(
        projects
          .filter((p) => nextBillingModes.includes(p.billingMode ?? 'HOURLY'))
          .map((p) => p._id)
      );
      nextProjectIds = nextProjectIds.filter((pid) => allowed.has(pid));
    }

    let nextStart = preset.startDate || '';
    let nextEnd = preset.endDate || '';
    if (preset.datePreset) {
      const range = getReportDateRange(preset.datePreset);
      nextStart = range.startDate;
      nextEnd = range.endDate;
    }

    const nextColumns = sanitizeReportColumnIds(preset.columnIds);

    setSelectedPresetId(preset._id);
    setClientIds(nextClientIds);
    setProjectIds(nextProjectIds);
    setBillingModes(nextBillingModes);
    setMemberAuth0Ids(nextMemberIds);
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setIncludeTimeEntries(preset.includeTimeEntries);
    setIncludeEntryDescriptions(preset.includeEntryDescriptions);
    setColumnIds(nextColumns);

    if (preset.clientIds.length > 0 && nextClientIds.length === 0) {
      setError('This preset’s clients are no longer in the workspace.');
      setInvoice(null);
      setFilteredEntries([]);
      setLineItems([]);
      return;
    }
    if (preset.projectIds.length > 0 && nextProjectIds.length === 0) {
      setError('This preset’s projects are no longer in the workspace.');
      setInvoice(null);
      setFilteredEntries([]);
      setLineItems([]);
      return;
    }

    void handleGenerate({
      clientIds: nextClientIds,
      projectIds: nextProjectIds,
      billingModes: nextBillingModes,
      memberAuth0Ids: nextMemberIds,
      startDate: nextStart,
      endDate: nextEnd,
    });
  };

  const handleSavePresetAs = async (name: string) => {
    try {
      setPresetBusy(true);
      setError(null);
      const res = await filterPresetsApi.create(buildPresetPayload(name));
      setFilterPresets((prev) =>
        [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedPresetId(res.data._id);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save preset'));
      throw err;
    } finally {
      setPresetBusy(false);
    }
  };

  const handleUpdatePreset = async () => {
    const current = filterPresets.find((p) => p._id === selectedPresetId);
    if (!current) return;
    try {
      setPresetBusy(true);
      setError(null);
      const res = await filterPresetsApi.update(
        current._id,
        buildPresetPayload(current.name)
      );
      setFilterPresets((prev) =>
        prev.map((p) => (p._id === res.data._id ? res.data : p))
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update preset'));
    } finally {
      setPresetBusy(false);
    }
  };

  const handleDeletePreset = async () => {
    const current = filterPresets.find((p) => p._id === selectedPresetId);
    if (!current) return;
    if (!window.confirm(`Delete preset “${current.name}”?`)) return;
    try {
      setPresetBusy(true);
      setError(null);
      await filterPresetsApi.delete(current._id);
      setFilterPresets((prev) => prev.filter((p) => p._id !== current._id));
      setSelectedPresetId('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete preset'));
    } finally {
      setPresetBusy(false);
    }
  };

  const teamMembers = useMemo(
    () =>
      users
        .filter((u) => u.role === 'admin' || u.role === 'member')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const isMixedPreview =
    invoice?.mixedBillingModes === true || invoice?.invoiceKind === 'MIXED';
  const hasInvoiceDocument = Boolean(invoice && invoice.items.length > 0 && !isMixedPreview);
  const canSavePayableInvoice =
    hasInvoiceDocument &&
    invoice?.invoiceKind !== 'RETAINER_REPORT' &&
    (clientIds.length === 1 || Boolean(invoice?.client?._id));
  const canSaveRetainerReport =
    hasInvoiceDocument &&
    invoice?.invoiceKind === 'RETAINER_REPORT' &&
    (clientIds.length === 1 || Boolean(invoice?.client?._id));
  const canSaveDataReport = Boolean(invoice);
  const payStubItems = useMemo(
    () => payStubItemsFromCostBreakdown(invoice?.costBreakdown),
    [invoice?.costBreakdown]
  );
  const payStubMember = useMemo(
    () => users.find((u) => u.auth0Id === memberAuth0Ids[0]),
    [users, memberAuth0Ids]
  );
  const payStubBlockedReason = !invoice
    ? 'Preview a slice first.'
    : memberAuth0Ids.length === 0
      ? 'Select exactly one person in People (empty means everyone).'
      : memberAuth0Ids.length > 1
        ? 'Pay stubs are one person at a time — leave only one checked in People.'
        : !startDate || !endDate
          ? 'Pick a date range other than All Time (This month, Last month, or custom dates).'
          : !payStubMember
            ? 'That person is not on the team list.'
            : payStubItems.length === 0
              ? 'No earned hours for that person in this slice.'
              : null;
  const canSavePayStub = payStubBlockedReason === null;

  const openSaveModal = (kind: InvoiceDocumentKind) => {
    setSaveKind(kind);
    setCreateModalOpen(true);
  };

  const scopedProjects = useMemo(() => {
    return projects.filter((p) => {
      if (clientIds.length > 0 && !clientIds.includes(projectClientId(p))) return false;
      if (billingModes.length > 0 && !billingModes.includes(p.billingMode ?? 'HOURLY')) return false;
      return true;
    });
  }, [projects, clientIds, billingModes]);

  const exportProjectIds = useMemo(() => {
    if (projectIds.length > 0) return projectIds;
    if (clientIds.length > 0 || billingModes.length > 0) {
      return scopedProjects.map((p) => p._id);
    }
    return undefined;
  }, [projectIds, clientIds, billingModes, scopedProjects]);

  const entryColumns = useMemo(
    () => visibleReportColumns(columnIds, { includeDescriptions: includeEntryDescriptions }),
    [columnIds, includeEntryDescriptions]
  );
  const pdfEntryColumns = useMemo(
    () =>
      visibleReportColumns(columnIds, {
        includeDescriptions: includeEntryDescriptions,
        forClientPdf: true,
      }),
    [columnIds, includeEntryDescriptions]
  );

  const splitModes = useMemo(() => {
    const byMode = invoice?.projectsByMode;
    if (!byMode) return [];
    return (
      [
        { id: 'HOURLY' as const, label: 'Hourly', projects: byMode.HOURLY },
        { id: 'FIXED_PRICE' as const, label: 'Fixed price', projects: byMode.FIXED_PRICE },
        { id: 'HOUR_RETAINER' as const, label: 'Hour retainer', projects: byMode.HOUR_RETAINER },
      ] as const
    ).filter((row) => row.projects.length > 0);
  }, [invoice?.projectsByMode]);

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
    <div className="w-full">
      <div className="mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Invoicing
        </h1>
        <p className="text-gray-500 mt-1">
          Filter a slice of workspace data, then preview an invoice or utilization report
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 print:hidden">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <ReportFilterRail
          clients={clients}
          projects={projects}
          members={teamMembers}
          clientIds={clientIds}
          projectIds={projectIds}
          billingModes={billingModes}
          memberAuth0Ids={memberAuth0Ids}
          startDate={startDate}
          endDate={endDate}
          includeTimeEntries={includeTimeEntries}
          includeEntryDescriptions={includeEntryDescriptions}
          columnIds={columnIds}
          onClientIdsChange={handleClientIdsChange}
          onProjectIdsChange={setProjectIds}
          onBillingModesChange={handleBillingModesChange}
          onMemberAuth0IdsChange={setMemberAuth0Ids}
          onDateRangeChange={(nextStart, nextEnd) => {
            setStartDate(nextStart);
            setEndDate(nextEnd);
            handleGenerate({ startDate: nextStart, endDate: nextEnd });
          }}
          onIncludeTimeEntriesChange={setIncludeTimeEntries}
          onIncludeEntryDescriptionsChange={setIncludeEntryDescriptions}
          onColumnIdsChange={(ids) => setColumnIds(sanitizeReportColumnIds(ids))}
          onClearFilters={handleClearFilters}
          presets={filterPresets}
          selectedPresetId={selectedPresetId}
          presetBusy={presetBusy}
          onApplyPreset={applyPreset}
          onSavePresetAs={handleSavePresetAs}
          onUpdatePreset={handleUpdatePreset}
          onDeletePreset={handleDeletePreset}
        />

        <div className="min-w-0 flex-1 w-full">
      <div className="card space-y-4 mb-6 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons
            clientIds={clientIds.length > 0 ? clientIds : undefined}
            projectIds={exportProjectIds}
            startDate={startDate || undefined}
            endDate={endDate || undefined}
            billingModes={billingModes.length > 0 ? billingModes : undefined}
            memberAuth0Ids={memberAuth0Ids.length > 0 ? memberAuth0Ids : undefined}
            columns={columnIds}
            includeEntryDescriptions={includeEntryDescriptions}
            csvDisabled={generating}
            printDisabled={!hasInvoiceDocument}
          />

          <button
            onClick={() => handleGenerate()}
            disabled={generating || (!!startDate !== !!endDate)}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? 'Loading...' : 'Preview'}
          </button>

          {canSaveDataReport && (
            <button
              type="button"
              onClick={() => openSaveModal('DATA_REPORT')}
              className="btn-secondary"
            >
              Save data report
            </button>
          )}
          {invoice && (
            <button
              type="button"
              onClick={() => openSaveModal('PAY_STUB')}
              disabled={!canSavePayStub}
              title={payStubBlockedReason || 'Save an earned-only stub to Payroll'}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save pay stub
            </button>
          )}
        </div>

        {invoice && payStubBlockedReason && (
          <p className="text-sm text-gray-600">
            {payStubBlockedReason} Filed stubs live on{' '}
            <button
              type="button"
              onClick={() => navigate('/payroll')}
              className="text-primary-700 underline underline-offset-2"
            >
              Payroll
            </button>
            .
          </p>
        )}

        {hasInvoiceDocument && invoice?.invoiceKind === 'FIXED_PRICE' && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-950">
            <p className="font-medium">Fixed-price preview</p>
            <p className="mt-1 text-teal-900/90">
              The client-facing total is the agreed project fee (plus any additional charges in this period),
              not the sum of hours × rates.
            </p>
          </div>
        )}

        {hasInvoiceDocument && invoice?.invoiceKind === 'RETAINER_REPORT' && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/90 px-4 py-3 text-sm text-violet-950">
            <p className="font-medium">Hour retainer preview</p>
            <p className="mt-1 text-violet-900/90">
              Utilization report: hours in this period by task type, remaining hours as of the period end,
              and optional pass-through line items only.
            </p>
          </div>
        )}

        {isMixedPreview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Mixed billing types in this slice</p>
            <p className="mt-1 text-amber-900/90">
              CSV still exports the combined time entries. Save a data report of this slice, or split into
              one billing type to preview a payable invoice or retainer report.
            </p>
            {splitModes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {splitModes.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setBillingModes([row.id]);
                      handleGenerate({ billingModes: [row.id] });
                    }}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Preview {row.label.toLowerCase()} ({row.projects.length})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
              selectedClientId={clientIds.length === 1 ? clientIds[0] : ''}
              onChanged={() => { void handleGenerate(); }}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {hasInvoiceDocument && invoice && (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:hidden ${
            invoice.invoiceKind === 'RETAINER_REPORT' && invoice.retainerSummary?.projects?.length
              ? 'xl:grid-cols-5'
              : 'lg:grid-cols-4'
          }`}
        >
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hours in period</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDurationHuman(invoice.totalHours * 3600)}
              </p>
            </div>
          </div>
          {invoice.invoiceKind === 'RETAINER_REPORT' && invoice.retainerSummary && invoice.retainerSummary.projects.length > 0 && (
            <div className="card flex items-start gap-4">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Hourglass className="w-5 h-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Remaining (as of period end)</p>
                {invoice.retainerSummary.projects.length === 1 ? (
                  <p className="text-2xl font-bold text-violet-900 tabular-nums">
                    {(
                      invoice.retainerSummary.projects[0].remainingHoursAsOfEnd ??
                      invoice.retainerSummary.projects[0].remainingHours
                    ).toFixed(2)}{' '}
                    h
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {invoice.retainerSummary.projects.map((p) => (
                      <li key={p.projectId} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-700 truncate">{p.title}</span>
                        <span className="font-bold text-violet-900 tabular-nums flex-shrink-0">
                          {(p.remainingHoursAsOfEnd ?? p.remainingHours).toFixed(2)} h
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {invoice.retainerSummary.projects.some((p) => {
                  const asOfEnd = p.remainingHoursAsOfEnd ?? p.remainingHours;
                  return p.remainingHoursLive != null && Math.abs(p.remainingHoursLive - asOfEnd) >= 0.005;
                }) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Live remaining:{' '}
                    {invoice.retainerSummary.projects.length === 1
                      ? `${invoice.retainerSummary.projects[0].remainingHoursLive?.toFixed(2)} h`
                      : invoice.retainerSummary.projects
                          .map(
                            (p) =>
                              `${p.title}: ${(p.remainingHoursLive ?? p.remainingHours).toFixed(2)} h`
                          )
                          .join(' · ')}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {invoice.invoiceKind === 'RETAINER_REPORT' ? 'Pass-through charges' : 'Total Billed'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {invoice.invoiceKind === 'RETAINER_REPORT' && invoice.total === 0
                  ? '—'
                  : formatCurrency(invoice.total)}
              </p>
            </div>
          </div>
          {invoice.totalEarned != null && (
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  {invoice.invoiceKind === 'RETAINER_REPORT' ? 'Earned (cost, internal)' : 'Total Earned (Cost)'}
                </p>
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
      {activeTab === 'invoice' && hasInvoiceDocument && invoice && (
        <div className="mb-6 print:hidden">
          {(canSavePayableInvoice || canSaveRetainerReport) && (
            <div className="flex justify-end mb-3">
              <button
                onClick={() =>
                  openSaveModal(canSaveRetainerReport ? 'RETAINER_REPORT' : 'INVOICE')
                }
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {canSaveRetainerReport ? 'Save retainer report' : 'Create Invoice'}
              </button>
            </div>
          )}
          {clientIds.length > 1 && !canSavePayableInvoice && !canSaveRetainerReport && (
            <p className="text-sm text-gray-500 mb-3">
              Previewing multiple clients. Select a single client to create an invoice, or save a data report of this slice.
            </p>
          )}
          <InvoicePreview invoice={invoice} />
        </div>
      )}

      {activeTab === 'entries' && (
        <div className="mb-6 print:hidden">
          {isAdmin &&
            invoice?.invoiceKind !== 'RETAINER_REPORT' &&
            (blockTimeStats.plannedSeconds > 0 ||
              blockTimeStats.linkedSeconds > 0 ||
              blockTimeStats.unlinkedSeconds > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="card !p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Planned (blocks)
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                    {formatDurationHuman(blockTimeStats.plannedSeconds)}
                  </p>
                </div>
                <div className="card !p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actual (linked to block)
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                    {formatDurationHuman(blockTimeStats.linkedSeconds)}
                  </p>
                </div>
                <div className="card !p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Unlinked entries
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                    {formatDurationHuman(blockTimeStats.unlinkedSeconds)}
                  </p>
                </div>
              </div>
            )}
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
              <ReportEntriesTable
                entries={sortedEntries}
                columns={entryColumns}
                users={users}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && invoice?.costBreakdown && (
        <div className="mb-6 print:hidden space-y-4">
          {canSavePayStub && payStubMember && (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => openSaveModal('PAY_STUB')}
                  className="btn-primary"
                >
                  Save pay stub
                </button>
              </div>
              <PayStubPreview
                invoice={{
                  ...invoice,
                  items: payStubItems,
                  total: payStubTotal(payStubItems),
                  totalHours: payStubHours(payStubItems),
                  client: {
                    _id: payStubMember._id,
                    name: payStubMember.name,
                    email: payStubMember.email,
                    taskDiscounts: {},
                    createdAt: payStubMember.createdAt,
                    updatedAt: payStubMember.updatedAt,
                  },
                }}
              />
            </div>
          )}
          <MemberContributionsPanel
            costBreakdown={invoice.costBreakdown}
            totalBilled={invoice.total}
            totalEarned={invoice.totalEarned}
            totalMargin={invoice.totalMargin}
          />
        </div>
      )}

      {invoice && invoice.items.length === 0 && !isMixedPreview && (
        <div className="card text-center py-12 mb-6 print:hidden">
          <p className="text-gray-500">No time entries found for the selected filters.</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your date range or filters.</p>
        </div>
      )}
        </div>
      </div>

      {/* Invoice print view: summary + entries on page 2 (when includeTimeEntries) */}
      {hasInvoiceDocument && invoice && (
        <div className="hidden print:block print:overflow-visible print:bg-white">
          <InvoicePreview invoice={invoice} />
          {includeTimeEntries && filteredEntries.length > 0 && (
            <div className="mt-6 break-before-page">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Time Entries ({filteredEntries.length})
              </h3>
              <ReportEntriesTable
                entries={filteredEntries}
                columns={pdfEntryColumns}
                users={users}
                printMode
              />
            </div>
          )}
        </div>
      )}

      {/* Create Invoice Modal */}
      {invoice && (
        <CreateInvoiceModal
          isOpen={createModalOpen}
          invoice={invoice}
          filteredEntries={filteredEntries}
          lineItems={lineItems}
          reportProjectIds={projectIds}
          saveKind={saveKind}
          payeeName={payStubMember?.name}
          payeeEmail={payStubMember?.email}
          payeeAuth0Id={payStubMember?.auth0Id}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(id) => {
            setCreateModalOpen(false);
            const dest =
              saveKind === 'INVOICE'
                ? `/invoices?created=${id}`
                : saveKind === 'PAY_STUB'
                  ? `/payroll?created=${id}`
                  : `/reports/saved?created=${id}`;
            navigate(dest);
          }}
        />
      )}

      {/* Edit Entry Modal */}
      <EntryModal
        entry={editingEntry}
        projects={projects}
        taskTypes={taskTypes}
        projectTasks={projectTasks}
        isOpen={editModalOpen}
        showRate={true}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
      />
    </div>
  );
}

export default Reports;
