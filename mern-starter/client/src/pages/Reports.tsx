import { useState, useEffect } from 'react';
import { ReportFilters } from '../components/reports/ReportFilters';
import { InvoicePreview } from '../components/reports/InvoicePreview';
import { ExportButtons } from '../components/reports/ExportButtons';
import {
  clientsApi,
  projectsApi,
  reportsApi,
} from '../services/api';
import { getDaysAgoString, getTodayString } from '../utils/calculations';
import type { Client, Project, Invoice } from '../types';

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

  // Invoice data
  const [invoice, setInvoice] = useState<Invoice | null>(null);

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

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);

      const res = await reportsApi.generateInvoice({
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        startDate,
        endDate,
      });

      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      setError('Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
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

      <div className="mb-6">
        <ReportFilters
          clients={clients}
          projects={projects}
          clientId={clientId}
          projectId={projectId}
          startDate={startDate}
          endDate={endDate}
          onClientChange={setClientId}
          onProjectChange={setProjectId}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onGenerate={handleGenerate}
          loading={generating}
        />
      </div>

      {invoice && (
        <>
          <div className="flex justify-end mb-4 print:hidden">
            <ExportButtons
              clientId={clientId || undefined}
              projectId={projectId || undefined}
              startDate={startDate}
              endDate={endDate}
              disabled={!invoice}
            />
          </div>

          {invoice.items.length > 0 ? (
            <InvoicePreview invoice={invoice} />
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-500">
                No time entries found for the selected filters.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your date range or filters.
              </p>
            </div>
          )}
        </>
      )}

      {!invoice && (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-lg mb-2">
            Select a date range and generate an invoice
          </p>
          <p className="text-gray-400 text-sm">
            Filter by client to see their discounted rates applied
          </p>
        </div>
      )}
    </div>
  );
}

export default Reports;
