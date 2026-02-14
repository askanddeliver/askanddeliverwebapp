import type { Client, Project } from '../../types';
import { getDaysAgoString, getTodayString } from '../../utils/calculations';

interface ReportFiltersProps {
  clients: Client[];
  projects: Project[];
  clientId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  onClientChange: (id: string) => void;
  onProjectChange: (id: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onGenerate: () => void;
  loading?: boolean;
}

export function ReportFilters({
  clients,
  projects,
  clientId,
  projectId,
  startDate,
  endDate,
  onClientChange,
  onProjectChange,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  loading,
}: ReportFiltersProps) {
  const filteredProjects = clientId
    ? projects.filter((p) => {
        const pClientId =
          typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
        return pClientId === clientId;
      })
    : projects;

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            value={clientId}
            onChange={(e) => {
              onClientChange(e.target.value);
              onProjectChange('');
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
            onChange={(e) => onProjectChange(e.target.value)}
            className="input"
          >
            <option value="">All Projects</option>
            {filteredProjects.map((p) => (
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
            onChange={(e) => onStartDateChange(e.target.value)}
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
            onChange={(e) => onEndDateChange(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onGenerate}
          disabled={loading || !startDate || !endDate}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Invoice'}
        </button>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => {
              onStartDateChange(getDaysAgoString(7));
              onEndDateChange(getTodayString());
            }}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            Last 7 days
          </button>
          <button
            onClick={() => {
              onStartDateChange(getDaysAgoString(30));
              onEndDateChange(getTodayString());
            }}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            Last 30 days
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              onStartDateChange(firstDay.toISOString().split('T')[0]);
              onEndDateChange(getTodayString());
            }}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            This month
          </button>
        </div>
      </div>
    </div>
  );
}
