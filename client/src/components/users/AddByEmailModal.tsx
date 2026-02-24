import { useState } from 'react';
import { X } from 'lucide-react';

interface AddByEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export function AddByEmailModal({
  isOpen,
  onClose,
  onSubmit,
}: AddByEmailModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(email.trim());
      setEmail('');
      onClose();
    } catch (err: unknown) {
      let msg: string = 'Failed to add user';
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (typeof data?.message === 'string') msg = data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 text-sm">
            Enter the email of someone who has already signed up. They will be added to your workspace as a member.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="input"
              autoFocus
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
            <button
              type="button"
              onClick={handleClose}
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
