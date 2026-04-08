import { useState, useEffect, FormEvent } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Client, Project, ProjectBillingMode, ProjectStatus } from '../../types';
import { BriefEditor } from './BriefEditor';

interface ProjectModalProps {
  project?: Project | null;
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectModalSaveData) => void;
}

export interface ProjectModalSaveData {
  clientId: string;
  title: string;
  description?: string;
  brief?: string;
  excerpt?: string;
  year?: number;
  categories?: string[];
  disciplines?: string[];
  challenge?: string;
  solution?: string;
  results?: string[];
  status: ProjectStatus;
  budget?: number;
  billingMode: ProjectBillingMode;
  agreedAmount?: number;
  retainerHoursTotal?: number;
  retainerHoursAdjustment?: number;
  fixedPriceInvoiceLabel?: string;
}

const defaultCategories = [
  'Branding', 'Digital', 'Hospitality', 'Music', 'Event',
  'Environmental', 'Nonprofit', 'Retail', 'Research', 'Education',
  'Product Design', 'UX/UI', 'Experiential', 'Packaging',
  'Public', 'Transportation', 'Strategy',
];

export function ProjectModal({
  project,
  clients,
  isOpen,
  onClose,
  onSave,
}: ProjectModalProps) {
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brief, setBrief] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [disciplineInput, setDisciplineInput] = useState('');
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [resultInput, setResultInput] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [budget, setBudget] = useState('');
  const [billingMode, setBillingMode] = useState<ProjectBillingMode>('HOURLY');
  const [agreedAmount, setAgreedAmount] = useState('');
  const [retainerHoursTotal, setRetainerHoursTotal] = useState('');
  const [retainerHoursAdjustment, setRetainerHoursAdjustment] = useState('');
  const [fixedPriceInvoiceLabel, setFixedPriceInvoiceLabel] = useState('');
  const [billingError, setBillingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'brief'>('basic');

  useEffect(() => {
    if (project) {
      setClientId(
        typeof project.clientId === 'object'
          ? project.clientId._id
          : project.clientId
      );
      setTitle(project.title);
      setDescription(project.description || '');
      setBrief(project.brief || '');
      setExcerpt(project.excerpt || '');
      setYear(project.year ?? new Date().getFullYear());
      setCategories(project.categories || []);
      setDisciplines(project.disciplines || []);
      setChallenge(project.challenge || '');
      setSolution(project.solution || '');
      setResults(project.results || []);
      setStatus(project.status);
      setBudget(project.budget?.toString() || '');
      setBillingMode(project.billingMode ?? 'HOURLY');
      setAgreedAmount(
        project.agreedAmount !== undefined && project.agreedAmount !== null
          ? String(project.agreedAmount)
          : ''
      );
      setRetainerHoursTotal(
        project.retainerHoursTotal !== undefined && project.retainerHoursTotal !== null
          ? String(project.retainerHoursTotal)
          : ''
      );
      setRetainerHoursAdjustment(
        project.retainerHoursAdjustment !== undefined &&
          project.retainerHoursAdjustment !== null
          ? String(project.retainerHoursAdjustment)
          : ''
      );
      setFixedPriceInvoiceLabel(project.fixedPriceInvoiceLabel || '');
    } else {
      setClientId('');
      setTitle('');
      setDescription('');
      setBrief('');
      setExcerpt('');
      setYear(new Date().getFullYear());
      setCategories([]);
      setDisciplines([]);
      setChallenge('');
      setSolution('');
      setResults([]);
      setStatus('ACTIVE');
      setBudget('');
      setBillingMode('HOURLY');
      setAgreedAmount('');
      setRetainerHoursTotal('');
      setRetainerHoursAdjustment('');
      setFixedPriceInvoiceLabel('');
    }
    setBillingError(null);
    setActiveTab('basic');
  }, [project, isOpen]);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !categories.includes(customCategory.trim())) {
      setCategories([...categories, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const addDiscipline = () => {
    if (disciplineInput.trim() && !disciplines.includes(disciplineInput.trim())) {
      setDisciplines([...disciplines, disciplineInput.trim()]);
      setDisciplineInput('');
    }
  };

  const removeDiscipline = (d: string) => {
    setDisciplines(disciplines.filter((item) => item !== d));
  };

  const addResult = () => {
    if (resultInput.trim()) {
      setResults([...results, resultInput.trim()]);
      setResultInput('');
    }
  };

  const removeResult = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;

    const agreed = agreedAmount.trim() ? parseFloat(agreedAmount) : undefined;
    const retainerTotal = retainerHoursTotal.trim()
      ? parseFloat(retainerHoursTotal)
      : undefined;
    const retainerAdj = retainerHoursAdjustment.trim()
      ? parseFloat(retainerHoursAdjustment)
      : undefined;

    if (billingMode === 'FIXED_PRICE') {
      if (agreed === undefined || Number.isNaN(agreed) || agreed < 0) {
        setBillingError('Fixed price projects need a valid agreed amount.');
        return;
      }
    }
    if (billingMode === 'HOUR_RETAINER') {
      if (
        retainerTotal === undefined ||
        Number.isNaN(retainerTotal) ||
        retainerTotal <= 0
      ) {
        setBillingError('Hour retainer projects need retainer hours greater than zero.');
        return;
      }
    }
    setBillingError(null);

    onSave({
      clientId,
      title: title.trim(),
      description: description.trim() || undefined,
      brief: brief.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      year,
      categories: categories.length > 0 ? categories : undefined,
      disciplines: disciplines.length > 0 ? disciplines : undefined,
      challenge: challenge.trim() || undefined,
      solution: solution.trim() || undefined,
      results: results.length > 0 ? results : undefined,
      status,
      budget: budget ? parseFloat(budget) : undefined,
      billingMode,
      agreedAmount: billingMode === 'FIXED_PRICE' ? agreed : undefined,
      retainerHoursTotal: billingMode === 'HOUR_RETAINER' ? retainerTotal : undefined,
      retainerHoursAdjustment:
        billingMode === 'HOUR_RETAINER' && retainerAdj !== undefined && !Number.isNaN(retainerAdj)
          ? retainerAdj
          : undefined,
      fixedPriceInvoiceLabel:
        billingMode === 'FIXED_PRICE' && fixedPriceInvoiceLabel.trim()
          ? fixedPriceInvoiceLabel.trim()
          : undefined,
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'brief' as const, label: 'Brief & Details' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select client...</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                        {c.company ? ` (${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="e.g., Website Redesign"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input min-h-[80px]"
                    placeholder="Brief project description (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as ProjectStatus)
                      }
                      className="input"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  {billingMode === 'HOURLY' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget ($)
                      </label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="input"
                        placeholder="Optional"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing mode
                  </label>
                  <select
                    value={billingMode}
                    onChange={(e) => {
                      setBillingMode(e.target.value as ProjectBillingMode);
                      setBillingError(null);
                    }}
                    className="input"
                  >
                    <option value="HOURLY">Hourly</option>
                    <option value="FIXED_PRICE">Fixed price</option>
                    <option value="HOUR_RETAINER">Hour retainer</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Hourly uses task rates and optional budget. Fixed price and retainers are for tracking; invoicing rules come in a later step.
                  </p>
                </div>

                {billingMode === 'FIXED_PRICE' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agreed amount ($) *
                      </label>
                      <input
                        type="number"
                        value={agreedAmount}
                        onChange={(e) => setAgreedAmount(e.target.value)}
                        className="input"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice line label
                      </label>
                      <input
                        type="text"
                        value={fixedPriceInvoiceLabel}
                        onChange={(e) => setFixedPriceInvoiceLabel(e.target.value)}
                        className="input"
                        placeholder="Optional description on fixed-price invoices"
                      />
                    </div>
                  </div>
                )}

                {billingMode === 'HOUR_RETAINER' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Retainer hours (total) *
                      </label>
                      <input
                        type="number"
                        value={retainerHoursTotal}
                        onChange={(e) => setRetainerHoursTotal(e.target.value)}
                        className="input"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hours adjustment
                      </label>
                      <input
                        type="number"
                        value={retainerHoursAdjustment}
                        onChange={(e) => setRetainerHoursAdjustment(e.target.value)}
                        className="input"
                        step="0.01"
                        placeholder="Optional (+/− hours)"
                      />
                    </div>
                  </div>
                )}

                {billingError && (
                  <p className="text-sm text-red-600" role="alert">
                    {billingError}
                  </p>
                )}
              </div>
            )}

            {/* Brief & Details Tab — portfolio-aligned for easier conversion */}
            {activeTab === 'brief' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brief
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Rich notes for this project. Aligns with portfolio content for easier conversion.
                  </p>
                  <BriefEditor
                    value={brief}
                    onChange={setBrief}
                    placeholder="Add project brief, goals, context..."
                    minHeight="140px"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excerpt
                  </label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="Short summary (maps to portfolio excerpt)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="input w-24"
                    min={1900}
                    max={2100}
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {defaultCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          categories.includes(cat)
                            ? 'bg-primary-100 border-primary-300 text-primary-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
                      className="input text-sm flex-1"
                      placeholder="Add custom category..."
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="btn-secondary text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Disciplines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disciplines
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {disciplines.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => removeDiscipline(d)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={disciplineInput}
                      onChange={(e) => setDisciplineInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDiscipline())}
                      className="input text-sm flex-1"
                      placeholder="e.g. Brand Identity, Web Development..."
                    />
                    <button
                      type="button"
                      onClick={addDiscipline}
                      className="btn-secondary text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    The Challenge
                  </label>
                  <textarea
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="What problem did the client need solved?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    The Solution
                  </label>
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="How did you approach and solve the challenge?"
                  />
                </div>

                {/* Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Results
                  </label>
                  {results.length > 0 && (
                    <ul className="space-y-2 mb-2">
                      {results.map((result, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg"
                        >
                          <span className="flex-1">{result}</span>
                          <button
                            type="button"
                            onClick={() => removeResult(i)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resultInput}
                      onChange={(e) => setResultInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResult())}
                      className="input text-sm flex-1"
                      placeholder="e.g. Increased foot traffic by 40%"
                    />
                    <button
                      type="button"
                      onClick={addResult}
                      className="btn-secondary text-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
            <button type="submit" className="btn-primary flex-1">
              {project ? 'Update Project' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={onClose}
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
