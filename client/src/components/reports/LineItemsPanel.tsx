import { useState } from 'react';
import { Plus, Trash2, Package, X } from 'lucide-react';
import { lineItemsApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/calculations';
import type { LineItem, Client, Project } from '../../types';

interface LineItemsPanelProps {
  lineItems: LineItem[];
  clients: Client[];
  projects: Project[];
  selectedClientId: string;
  onChanged: () => void;
}

const CATEGORIES = [
  'Software / Plugin',
  'Hosting',
  'Domain',
  'Stock Assets',
  'Subcontractor',
  'Printing',
  'Shipping',
  'Other',
];

export function LineItemsPanel({
  lineItems,
  clients,
  projects,
  selectedClientId,
  onChanged,
}: LineItemsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [clientId, setClientId] = useState(selectedClientId || '');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setClientId(selectedClientId || '');
    setProjectId('');
    setDescription('');
    setAmount('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !description || !amount || !date) return;

    try {
      setSaving(true);
      await lineItemsApi.create({
        clientId,
        projectId: projectId || undefined,
        description,
        amount: parseFloat(amount),
        category: category || undefined,
        date,
      });
      resetForm();
      onChanged();
    } catch (err) {
      console.error('Failed to create line item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this line item?')) return;
    try {
      setDeleting(id);
      await lineItemsApi.delete(id);
      onChanged();
    } catch (err) {
      console.error('Failed to delete line item:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredProjects = clientId
    ? projects.filter((p) => {
        const pClientId = typeof p.clientId === 'object' ? p.clientId._id : p.clientId;
        return pClientId === clientId;
      })
    : projects;

  return (
    <div className="card print:hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">
            Fixed-Cost Line Items
          </h3>
          {lineItems.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {lineItems.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Add third-party costs, plugin fees, or other fixed charges to include on invoices.
      </p>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">New Line Item</span>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId('');
                }}
                required
                className="input text-sm"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Project (optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input text-sm"
                disabled={!clientId}
              >
                <option value="">None</option>
                {filteredProjects.map((p) => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Elementor Pro Plugin License"
              required
              className="input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="59.00"
                min="0"
                step="0.01"
                required
                className="input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-sm"
              >
                <option value="">None</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !clientId || !description || !amount || !date}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Line Item'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Items */}
      {lineItems.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">
          No fixed-cost items for this period.
        </p>
      )}

      {lineItems.length > 0 && (
        <div className="divide-y divide-gray-100">
          {lineItems.map((item) => {
            const client = typeof item.clientId === 'object' ? item.clientId : null;
            const project = typeof item.projectId === 'object' ? item.projectId : null;

            return (
              <div key={item._id} className="flex items-center justify-between py-2.5 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {item.description}
                    </span>
                    {item.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    {client && <span>{client.name}</span>}
                    {project && (
                      <>
                        <span>&middot;</span>
                        <span>{project.title}</span>
                      </>
                    )}
                    <span>&middot;</span>
                    <span>{formatDate(item.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-sm">
                    {formatCurrency(item.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(item._id)}
                    disabled={deleting === item._id}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
