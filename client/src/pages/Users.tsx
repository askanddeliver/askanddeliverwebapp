import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import { usersApi, taskTypesApi, siteConfigApi } from '../services/api';
import type { User, TaskType, DisciplineDefinition } from '../types';
import { useUserRole } from '../contexts/UserContext';
import { UserEditModal } from '../components/users/UserEditModal';
import { AddByEmailModal } from '../components/users/AddByEmailModal';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  client: 'Client portal',
  pending: 'Pending',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  disabled: 'Disabled',
};

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

function formatDisciplines(ids: string[] | undefined, catalog: DisciplineDefinition[]) {
  if (!ids?.length) return '—';
  const byId = new Map(catalog.map((d) => [d.id, d.name]));
  return ids.map((id) => byId.get(id) || id).join(', ');
}

function formatAvailability(user: User) {
  const avail = user.availability;
  if (!avail) return '—';
  const parts: string[] = [];
  if (avail.hoursPerWeek != null) parts.push(`${avail.hoursPerWeek} hrs/wk`);
  if (avail.preferredDays?.length) {
    parts.push(avail.preferredDays.map((d) => DAY_LABELS[d] || d).join(', '));
  }
  if (avail.outOfOffice) parts.push('OOO');
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function Users() {
  const { user: currentUser } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineDefinition[]>([]);
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
      const [usersRes, taskTypesRes, configRes] = await Promise.all([
        usersApi.getAll(),
        taskTypesApi.getAll(),
        siteConfigApi.get().catch(() => ({ data: { disciplines: [] } })),
      ]);
      setUsers(usersRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setDisciplines(configRes.data.disciplines ?? []);
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
            Manage team members, roles, and workspace access
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Disciplines</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {user.picture && (
                          <img
                            src={user.picture}
                            alt={user.name}
                            className="h-10 w-10 shrink-0 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-primary-100 text-primary-800'
                              : user.role === 'member'
                                ? 'bg-blue-100 text-blue-800'
                                : user.role === 'client'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
                    </td>
                    <td className="max-w-[200px] px-4 py-4 text-gray-600">
                      {user.role === 'member'
                        ? formatDisciplines(user.disciplines, disciplines)
                        : '—'}
                    </td>
                    <td className="max-w-[180px] px-4 py-4 text-gray-600">
                      {user.role === 'member' ? formatAvailability(user) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {currentUser?._id !== user._id && (
                          <button
                            onClick={() => handleRemove(user)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Remove from team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
