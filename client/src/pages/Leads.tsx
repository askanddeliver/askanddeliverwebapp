import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Search,
  Trash2,
  Eye,
  ChevronDown,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { leadsApi } from '../services/api';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { ConvertLeadModal } from '../components/leads/ConvertLeadModal';
import type { Lead, LeadStatus, LeadPriority, LeadStats } from '../types';

const STATUS_TABS: { value: LeadStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  PROPOSAL: 'bg-indigo-100 text-indigo-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<LeadPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-orange-100 text-orange-700',
  HIGH: 'bg-red-100 text-red-700',
};

const ALL_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
];

const ALL_PRIORITIES: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<LeadStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // Dropdown state for quick actions
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(
    null
  );
  const [openPriorityDropdown, setOpenPriorityDropdown] = useState<
    string | null
  >(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes] = await Promise.all([
        leadsApi.getAll({
          status: activeTab,
          search: searchQuery || undefined,
        }),
        leadsApi.getStats(),
      ]);
      setLeads(leadsRes.data || []);
      setStats(statsRes.data || null);
      setError(null);
    } catch (err) {
      console.error('Failed to load leads:', err);
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setOpenStatusDropdown(null);
      setOpenPriorityDropdown(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await leadsApi.update(leadId, { status: newStatus });
      setLeads(leads.map((l) => (l._id === leadId ? res.data : l)));
      setOpenStatusDropdown(null);
      // Refresh stats
      const statsRes = await leadsApi.getStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update lead status');
    }
  };

  const handlePriorityChange = async (
    leadId: string,
    newPriority: LeadPriority
  ) => {
    try {
      const res = await leadsApi.update(leadId, { priority: newPriority });
      setLeads(leads.map((l) => (l._id === leadId ? res.data : l)));
      setOpenPriorityDropdown(null);
    } catch (err) {
      console.error('Failed to update priority:', err);
      setError('Failed to update lead priority');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadsApi.delete(leadId);
      setLeads(leads.filter((l) => l._id !== leadId));
      const statsRes = await leadsApi.getStats();
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to delete lead:', err);
      setError('Failed to delete lead');
    }
  };

  const handleViewDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleConvert = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertOpen(true);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(leads.map((l) => (l._id === updatedLead._id ? updatedLead : l)));
    setSelectedLead(updatedLead);
  };

  const handleConvertComplete = () => {
    setConvertOpen(false);
    setSelectedLead(null);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(dateStr);
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">
            Manage inquiries from your intake form
          </p>
        </div>
        {stats && stats.NEW > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-700">
              {stats.NEW} new {stats.NEW === 1 ? 'lead' : 'leads'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'ALL'
              ? stats?.TOTAL ?? 0
              : stats?.[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or company..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {searchQuery || activeTab !== 'ALL'
              ? 'No leads match your filters'
              : 'No leads yet'}
          </h3>
          <p className="text-gray-400">
            {searchQuery || activeTab !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Leads will appear here when someone submits the contact form.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="overflow-x-visible">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Project
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Budget
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Priority
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr
                    key={lead._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetail(lead)}
                        className="text-left hover:underline"
                      >
                        <div className="font-medium text-gray-900 text-sm">
                          {lead.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lead.email}
                        </div>
                        {lead.company && (
                          <div className="text-xs text-gray-400">
                            {lead.company}
                          </div>
                        )}
                      </button>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {lead.projectType || '—'}
                      </div>
                      {lead.description && (
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {lead.description}
                        </div>
                      )}
                    </td>

                    {/* Budget */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {lead.budget || '—'}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStatusDropdown(
                              openStatusDropdown === lead._id
                                ? null
                                : lead._id
                            );
                            setOpenPriorityDropdown(null);
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            STATUS_COLORS[lead.status]
                          }`}
                        >
                          {lead.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openStatusDropdown === lead._id && (
                          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                            {ALL_STATUSES.map((s) => (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(lead._id, s);
                                }}
                                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                                  lead.status === s
                                    ? 'font-medium text-primary-600'
                                    : 'text-gray-700'
                                }`}
                              >
                                <span
                                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    STATUS_COLORS[s].split(' ')[0]
                                  }`}
                                />
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Priority Dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPriorityDropdown(
                              openPriorityDropdown === lead._id
                                ? null
                                : lead._id
                            );
                            setOpenStatusDropdown(null);
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            PRIORITY_COLORS[lead.priority]
                          }`}
                        >
                          {lead.priority}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {openPriorityDropdown === lead._id && (
                          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                            {ALL_PRIORITIES.map((p) => (
                              <button
                                key={p}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePriorityChange(lead._id, p);
                                }}
                                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                                  lead.priority === p
                                    ? 'font-medium text-primary-600'
                                    : 'text-gray-700'
                                }`}
                              >
                                <span
                                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    PRIORITY_COLORS[p].split(' ')[0]
                                  }`}
                                />
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {formatTimeAgo(lead.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetail(lead)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!lead.convertedClientId &&
                          lead.status !== 'LOST' && (
                            <button
                              onClick={() => handleConvert(lead)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Convert to client"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          )}
                        <button
                          onClick={() => handleDelete(lead._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedLead(null);
          }}
          onLeadUpdated={handleLeadUpdated}
          onConvert={() => {
            setDetailOpen(false);
            setConvertOpen(true);
          }}
        />
      )}

      {/* Convert Lead Modal */}
      {selectedLead && (
        <ConvertLeadModal
          lead={selectedLead}
          isOpen={convertOpen}
          onClose={() => {
            setConvertOpen(false);
            setSelectedLead(null);
          }}
          onConverted={handleConvertComplete}
        />
      )}
    </div>
  );
}

export default Leads;
