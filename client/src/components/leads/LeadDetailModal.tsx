import { useState } from 'react';
import {
  X,
  Mail,
  Building2,
  Calendar,
  Target,
  Compass,
  HelpCircle,
  Clock,
  MessageSquare,
  Send,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { leadsApi } from '../../services/api';
import type { Lead, LeadStatus, LeadPriority, Client, Project } from '../../types';

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (lead: Lead) => void;
  onConvert: () => void;
}

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
];

const PRIORITY_OPTIONS: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

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

const CONFIDENCE_ICONS = {
  YES: Target,
  MAYBE: Compass,
  UNSURE: HelpCircle,
};

const CONFIDENCE_LABELS = {
  YES: 'Knows exactly what they need',
  MAYBE: 'Has a general idea',
  UNSURE: 'Still figuring it out',
};

export function LeadDetailModal({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onConvert,
}: LeadDetailModalProps) {
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  if (!isOpen) return null;

  const ConfidenceIcon = CONFIDENCE_ICONS[lead.confidence];
  const isConverted = !!lead.convertedClientId;

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await leadsApi.update(lead._id, { status: newStatus });
      onLeadUpdated(res.data);
      setStatusOpen(false);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handlePriorityChange = async (newPriority: LeadPriority) => {
    try {
      const res = await leadsApi.update(lead._id, { priority: newPriority });
      onLeadUpdated(res.data);
      setPriorityOpen(false);
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await leadsApi.addNote(lead._id, newNote.trim());
      onLeadUpdated(res.data);
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Extract converted client/project names if populated
  const convertedClient =
    lead.convertedClientId && typeof lead.convertedClientId === 'object'
      ? (lead.convertedClientId as Client)
      : null;
  const convertedProject =
    lead.convertedProjectId && typeof lead.convertedProjectId === 'object'
      ? (lead.convertedProjectId as Project)
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lead.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {lead.email}
              </span>
              {lead.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Priority Row */}
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <button
                onClick={() => {
                  setStatusOpen(!statusOpen);
                  setPriorityOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${
                  STATUS_COLORS[lead.status]
                }`}
              >
                {lead.status}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {statusOpen && (
                <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
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

            {/* Priority */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Priority
              </label>
              <button
                onClick={() => {
                  setPriorityOpen(!priorityOpen);
                  setStatusOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${
                  PRIORITY_COLORS[lead.priority]
                }`}
              >
                {lead.priority}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {priorityOpen && (
                <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePriorityChange(p)}
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

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Submitted
              </label>
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(lead.createdAt)}
              </span>
            </div>
          </div>

          {/* Conversion Banner */}
          {isConverted && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-800 mb-2">
                Converted to Client & Project
              </p>
              <div className="flex gap-4 text-sm">
                {convertedClient && (
                  <a
                    href="/clients"
                    className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {convertedClient.name}
                  </a>
                )}
                {convertedProject && (
                  <a
                    href="/projects"
                    className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {(convertedProject as Project).title}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Confidence */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <ConfidenceIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {CONFIDENCE_LABELS[lead.confidence]}
              </span>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Project Details
            </h3>

            {lead.projectType && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">
                  Project Type
                </label>
                <p className="text-sm text-gray-800">{lead.projectType}</p>
              </div>
            )}

            {lead.description && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">
                  Description
                </label>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {lead.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {lead.budget && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">
                    Budget
                  </label>
                  <p className="text-sm text-gray-800">{lead.budget}</p>
                </div>
              )}
              {lead.timeline && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">
                    Timeline
                  </label>
                  <p className="text-sm text-gray-800">{lead.timeline}</p>
                </div>
              )}
            </div>

            {lead.message && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-0.5">
                  Additional Message
                </label>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {lead.message}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes ({lead.notes?.length || 0})
            </h3>

            {/* Existing Notes */}
            {lead.notes && lead.notes.length > 0 && (
              <div className="space-y-2">
                {lead.notes.map((note) => (
                  <div
                    key={note._id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <p className="text-sm text-gray-800">{note.text}</p>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Note */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary text-sm">
            Close
          </button>
          {!isConverted && lead.status !== 'LOST' && (
            <button
              onClick={onConvert}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Convert to Client & Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
