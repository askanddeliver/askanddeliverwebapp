import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Client, TaskType, PaymentPreference } from '../../types';
import { TaskDiscounts } from './TaskDiscounts';

interface ClientModalProps {
  client?: Client | null;
  taskTypes: TaskType[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    company?: string;
    email?: string;
    businessEntity?: string;
    address?: string;
    paymentPreference?: PaymentPreference;
    taskDiscounts: Record<string, number>;
  }) => void;
}

export function ClientModal({
  client,
  taskTypes,
  isOpen,
  onClose,
  onSave,
}: ClientModalProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [businessEntity, setBusinessEntity] = useState('');
  const [address, setAddress] = useState('');
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference>('MAILED');
  const [taskDiscounts, setTaskDiscounts] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (client) {
      setName(client.name);
      setCompany(client.company || '');
      setEmail(client.email || '');
      setBusinessEntity(client.businessEntity || '');
      setAddress(client.address || '');
      setPaymentPreference(client.paymentPreference || 'MAILED');
      setTaskDiscounts(client.taskDiscounts || {});
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setBusinessEntity('');
      setAddress('');
      setPaymentPreference('MAILED');
      setTaskDiscounts({});
    }
  }, [client, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      businessEntity: businessEntity.trim() || undefined,
      address: address.trim() || undefined,
      paymentPreference,
      taskDiscounts,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {client ? 'Edit Client' : 'New Client'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Acme Corp"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="contact@example.com (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Official Business Entity
            </label>
            <input
              type="text"
              value={businessEntity}
              onChange={(e) => setBusinessEntity(e.target.value)}
              className="input"
              placeholder="e.g., Acme Corp LLC (for invoices)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Street, City, State, ZIP"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment preference (for invoices)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentPreference"
                  value="MAILED"
                  checked={paymentPreference === 'MAILED'}
                  onChange={() => setPaymentPreference('MAILED')}
                  className="border-gray-300"
                />
                <span className="text-sm">Mailed payment</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentPreference"
                  value="ACH"
                  checked={paymentPreference === 'ACH'}
                  onChange={() => setPaymentPreference('ACH')}
                  className="border-gray-300"
                />
                <span className="text-sm">ACH transfer</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Determines payment instructions shown on invoices for this client.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Discounts
            </label>
            <TaskDiscounts
              taskTypes={taskTypes}
              discounts={taskDiscounts}
              onChange={setTaskDiscounts}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {client ? 'Update Client' : 'Create Client'}
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
