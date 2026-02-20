import { useState, useEffect, useCallback } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { ReportFilters } from '../components/reports/ReportFilters';
import { InvoicePreview } from '../components/reports/InvoicePreview';
import { ExportButtons } from '../components/reports/ExportButtons';
import { LineItemsPanel } from '../components/reports/LineItemsPanel';
import { EntryRow } from '../components/entries/EntryRow';
import {
  clientsApi,
  projectsApi,
  reportsApi,
  timeEntriesApi,
  lineItemsApi,
} from '../services/api';
import {
  getDaysAgoString,
  getTodayString,
  formatDurationHuman,
  formatCurrency,
} from '../utils/calculations';
import type { Client, Project, Invoice, TimeEntry, LineItem } from '../types';

function Reports() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const [clientsRes, projectsRes] = await Promise.all([
        clientsApi.getAll(),
        projectsApi.getAll(),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
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

  const handleGenerate = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      setGenerating(true);
      setError(null);

      // Fetch invoice data, filtered entries, and line items in parallel
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

      // Filter entries by client on the frontend if needed
      let entries = (entriesRes.data || []).filter(
        (e: TimeEntry) => !e.isRunning
      );
      if (clientId) {
        entries = entries.filter((e: TimeEntry) => {
          const project =
            typeof e.projectId === 'object' ? e.projectId : null;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Invoicing
        </h1>
        <p className="text-gray-500 mt-1">
          Generate invoices with discounted rates and export reports
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
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
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
            >
              <option value="">All Projects</option>
              {(clientId
                ? projects.filter((p) => {
                    const pClientId =
                      typeof p.clientId === 'object'
                        ? p.clientId._id
                        : p.clientId;
                    return pClientId === clientId;
                  })
                : projects
              ).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
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
              onClick={() => {
                setStartDate(getDaysAgoString(7));
                setEndDate(getTodayString());
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Last 7 days
            </button>
            <button
              onClick={() => {
                setStartDate(getDaysAgoString(30));
                setEndDate(getTodayString());
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  1
                );
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(getTodayString());
              }}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              This month
            </button>
            {(clientId || projectId) && (
              <button
                onClick={() => {
                  setClientId('');
                  setProjectId('');
                }}
                className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fixed-Cost Line Items */}
      <div className="mb-6">
        <LineItemsPanel
          lineItems={lineItems}
          clients={clients}
          projects={projects}
          selectedClientId={clientId}
          onChanged={handleGenerate}
        />
      </div>

      {/* Summary Cards */}
      {invoice && invoice.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:hidden">
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
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(invoice.total)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {invoice && invoice.items.length > 0 && (
        <div className="mb-6">
          <InvoicePreview invoice={invoice} />
        </div>
      )}

      {invoice && invoice.items.length === 0 && (
        <div className="card text-center py-12 mb-6 print:hidden">
          <p className="text-gray-500">
            No time entries found for the selected filters.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your date range or filters.
          </p>
        </div>
      )}

      {/* Filtered Entries List */}
      {filteredEntries.length > 0 && (
        <div className="card print:mt-2 print:pt-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 print:text-sm print:mb-1">
            Entries ({filteredEntries.length})
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
  );
}

export default Reports;
