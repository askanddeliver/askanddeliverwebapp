import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import { usersApi, taskTypesApi } from '../services/api';
import type { User, TaskType } from '../types';
import { useUserRole } from '../contexts/UserContext';
import { UserEditModal } from '../components/users/UserEditModal';
import { AddByEmailModal } from '../components/users/AddByEmailModal';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  pending: 'Pending',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  disabled: 'Disabled',
};

function Users() {
  const { user: currentUser } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, taskTypesRes] = await Promise.all([
        usersApi.getAll(),
        taskTypesApi.getAll(),
      ]);
      setUsers(usersRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddByEmail = async (email: string) => {
    const res = await usersApi.addByEmail(email);
    setUsers([res.data, ...users]);
    setAddModalOpen(false);
    setError(null);
  };

  const handleUpdate = async (data: {
    role?: User['role'];
    status?: User['status'];
    earnedRates?: Record<string, number>;
  }) => {
    if (!editingUser) return;
    try {
      const res = await usersApi.update(editingUser._id, data);
      setUsers(users.map((u) => (u._id === editingUser._id ? res.data : u)));
      setEditModalOpen(false);
      setEditingUser(null);
      setError(null);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleRemove = async (user: User) => {
    if (!window.confirm(`Remove ${user.name || user.email} from the team? This cannot be undone.`)) return;
    try {
      await usersApi.delete(user._id);
      setUsers(users.filter((u) => u._id !== user._id));
      setError(null);
    } catch (err) {
      console.error('Failed to remove user:', err);
      setError('Failed to remove user');
    }
  };

  const copySignupLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 mt-1">
            Manage team members and their access
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add by Email
          </button>
        </div>
      </div>

      {/* Signup link card */}
      <div className="card bg-blue-50 border-blue-200 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">Invite link</h3>
        <p className="text-blue-700 text-sm mb-3">
          Share this link with new team members. After they sign up, use &quot;Add by Email&quot; to add them to your workspace.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-sm text-gray-800 truncate">
            {appUrl}
          </code>
          <button
            onClick={copySignupLink}
            className="btn-secondary flex items-center gap-2 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No team members yet.</p>
            <p className="text-gray-400 text-sm">
              Share the invite link above, then add members by email after they sign up.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-4 py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-primary-100 text-primary-800'
                        : user.role === 'member'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'disabled'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {STATUS_LABELS[user.status] || user.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {currentUser?._id !== user._id && (
                    <button
                      onClick={() => handleRemove(user)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UserEditModal
        user={editingUser}
        taskTypes={taskTypes}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleUpdate}
      />

      <AddByEmailModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddByEmail}
      />
    </div>
  );
}

export default Users;
