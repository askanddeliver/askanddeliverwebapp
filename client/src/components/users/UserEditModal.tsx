import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { User, TaskType } from '../../types';

interface UserEditModalProps {
  user: User | null;
  taskTypes: TaskType[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    role?: User['role'];
    status?: User['status'];
    earnedRates?: Record<string, number>;
  }) => void;
}

export function UserEditModal({
  user,
  taskTypes,
  isOpen,
  onClose,
  onSave,
}: UserEditModalProps) {
  const [role, setRole] = useState<User['role']>('member');
  const [status, setStatus] = useState<User['status']>('active');
  const [earnedRates, setEarnedRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setStatus(user.status);
      setEarnedRates(user.earnedRates || {});
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ role, status, earnedRates });
  };

  const handleRateChange = (taskTypeId: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    setEarnedRates((prev) => ({
      ...prev,
      [taskTypeId]: isNaN(num) ? 0 : num,
    }));
  };

  if (!isOpen) return null;
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="font-bold text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User['role'])}
                className="input"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="pending">Pending</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Admins have full access. Members can log time and view projects.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as User['status'])}
                className="input"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {role === 'member' && taskTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Earned rates (cost accounting)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Set hourly rates for each discipline to track costs vs. billed amounts.
                </p>
                <div className="space-y-2">
                  {taskTypes.map((tt) => (
                    <div key={tt._id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tt.color }}
                      />
                      <span className="text-sm font-medium w-28">{tt.name}</span>
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={earnedRates[tt._id] ?? ''}
                        onChange={(e) => handleRateChange(tt._id, e.target.value)}
                        className="input w-24 py-1.5 text-sm"
                        placeholder="0"
                      />
                      <span className="text-gray-500 text-sm">/hr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Save Changes
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
    </div>
  );
}
