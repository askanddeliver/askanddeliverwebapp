import { useState, useEffect } from 'react';
import { X, ArrowUpRight, Loader2, User, FolderOpen } from 'lucide-react';
import { leadsApi } from '../../services/api';
import type { Lead } from '../../types';

interface ConvertLeadModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConverted: () => void;
}

/**
 * Parse a budget range string like "$5,000 – $15,000" into a numeric value.
 * Uses the lower bound of the range. Returns undefined for non-parseable values.
 */
function parseBudgetToNumber(budgetStr: string): number | undefined {
  if (!budgetStr) return undefined;

  // Extract all numbers from the string
  const numbers = budgetStr.match(/[\d,]+/g);
  if (!numbers || numbers.length === 0) return undefined;

  // Use the first number (lower bound) and remove commas
  const parsed = parseInt(numbers[0].replace(/,/g, ''), 10);
  return isNaN(parsed) ? undefined : parsed;
}

export function ConvertLeadModal({
  lead,
  isOpen,
  onClose,
  onConverted,
}: ConvertLeadModalProps) {
  // Client fields
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Project fields
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectBudget, setProjectBudget] = useState('');

  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate from lead data when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      setClientName(lead.name || '');
      setClientCompany(lead.company || '');
      setClientEmail(lead.email || '');

      // Build a sensible project title
      const title = lead.projectType
        ? `${lead.projectType} - ${lead.name}`
        : lead.description
        ? lead.description.substring(0, 60) +
          (lead.description.length > 60 ? '...' : '')
        : `Project for ${lead.name}`;
      setProjectTitle(title);

      setProjectDescription(lead.description || '');

      // Parse budget string to number for display
      const budgetNum = parseBudgetToNumber(lead.budget);
      setProjectBudget(budgetNum ? budgetNum.toString() : '');

      setError(null);
    }
  }, [isOpen, lead]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      setError('Client name is required');
      return;
    }
    if (!projectTitle.trim()) {
      setError('Project title is required');
      return;
    }

    setConverting(true);
    setError(null);

    try {
      await leadsApi.convert(lead._id, {
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        projectTitle: projectTitle.trim(),
        projectDescription: projectDescription.trim() || undefined,
        projectBudget: projectBudget ? parseFloat(projectBudget) : undefined,
      });
      onConverted();
    } catch (err) {
      console.error('Failed to convert lead:', err);
      setError('Failed to convert lead. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Convert Lead</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a Client and Project from this lead
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleConvert} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Client Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Client
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input"
                  placeholder="Client name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className="input"
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="input"
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Project Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Project
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="input"
                  placeholder="Project title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="input resize-none"
                  rows={3}
                  placeholder="Project description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget ($)
                </label>
                <input
                  type="number"
                  value={projectBudget}
                  onChange={(e) => setProjectBudget(e.target.value)}
                  className="input"
                  placeholder="0"
                  min="0"
                  step="100"
                />
                {lead.budget && (
                  <p className="text-xs text-gray-400 mt-1">
                    Lead indicated: {lead.budget}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={converting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {converting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Convert Lead
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={converting}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
