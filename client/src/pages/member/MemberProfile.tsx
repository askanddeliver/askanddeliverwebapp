import { useState, useEffect, useMemo } from 'react';
import { useUserRole } from '../../contexts/UserContext';
import { memberApi, usersApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import {
  disciplineTaskKey,
  isOperationalDiscipline,
} from '../../lib/disciplines';
import type { AvailabilityDay, DisciplineDefinition, UserAvailability } from '../../types';

const WEEKDAYS: { id: AvailabilityDay; label: string }[] = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

function MemberProfile() {
  const { user, refetch } = useUserRole();
  const [disciplines, setDisciplines] = useState<DisciplineDefinition[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState<UserAvailability>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?._id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await memberApi.getDisciplines();
      setDisciplines(res.data || []);
      setSelectedDisciplines(user?.disciplines || []);
      setSelectedTasks(user?.disciplineTasks || []);
      setBio(user?.bio || '');
      setAvailability(user?.availability || {});
      setError(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile options');
    } finally {
      setLoading(false);
    }
  };

  const { coreDisciplines, operationalDisciplines } = useMemo(() => {
    const core: DisciplineDefinition[] = [];
    const operational: DisciplineDefinition[] = [];
    for (const d of disciplines) {
      if (isOperationalDiscipline(d.id)) operational.push(d);
      else core.push(d);
    }
    return { coreDisciplines: core, operationalDisciplines: operational };
  }, [disciplines]);

  const toggleDiscipline = (id: string) => {
    setSelectedDisciplines((prev) => {
      if (prev.includes(id)) {
        setSelectedTasks((tasks) =>
          tasks.filter((key) => !key.startsWith(`${id}:`))
        );
        return prev.filter((d) => d !== id);
      }
      return [...prev, id];
    });
    setSaved(false);
  };

  const toggleTask = (disciplineId: string, taskId: string) => {
    const key = disciplineTaskKey(disciplineId, taskId);
    setSelectedTasks((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (!selectedDisciplines.includes(disciplineId)) {
        setSelectedDisciplines((d) => [...d, disciplineId]);
      }
      return [...prev, key];
    });
    setSaved(false);
  };

  const toggleDay = (day: AvailabilityDay) => {
    setAvailability((prev) => {
      const days = prev.preferredDays || [];
      const next = days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day];
      return { ...prev, preferredDays: next };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await usersApi.updateMe({
        disciplines: selectedDisciplines,
        disciplineTasks: selectedTasks,
        bio: bio.trim() || undefined,
        availability,
      });
      await refetch();
      setSaved(true);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderDisciplineGroup = (
    title: string,
    subtitle: string,
    items: DisciplineDefinition[]
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mb-3 text-sm text-gray-500">{subtitle}</p>
        <div className="space-y-4">
          {items.map((d) => (
            <div key={d.id} className="rounded-lg border border-gray-200 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedDisciplines.includes(d.id)}
                  onChange={() => toggleDiscipline(d.id)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-gray-900">{d.name}</span>
                  {d.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{d.description}</p>
                  )}
                </div>
              </label>
              {d.tasks.length > 0 && selectedDisciplines.includes(d.id) && (
                <div className="ml-7 mt-3 flex flex-wrap gap-2">
                  {d.tasks.map((t) => {
                    const key = disciplineTaskKey(d.id, t.id);
                    return (
                      <label
                        key={key}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(key)}
                          onChange={() => toggleTask(d.id, t.id)}
                        />
                        {t.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <AdminPageHeader
        title="Profile"
        subtitle="Your disciplines, skills, and availability for the team."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">About you</h2>
        <p className="mb-4 text-sm text-gray-500">
          A short bio visible to admins when staffing projects.
        </p>
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSaved(false);
          }}
          rows={4}
          className="input w-full"
          placeholder="What you do, what you're great at…"
        />
      </div>

      <div className="card mb-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Disciplines</h2>
        <p className="mb-4 text-sm text-gray-500">
          Select the areas you work in. Optionally narrow to specific task skills.
        </p>

        {renderDisciplineGroup(
          'Core disciplines',
          'Client-facing work — design, development, strategy, and more.',
          coreDisciplines
        )}
        {renderDisciplineGroup(
          'Operational',
          'Internal time — admin, meetings, and similar.',
          operationalDisciplines
        )}
      </div>

      <div className="card mb-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Availability</h2>
        <p className="mb-4 text-sm text-gray-500">
          Help admins understand your capacity and preferred schedule.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Hours per week
          </label>
          <input
            type="number"
            min={0}
            max={168}
            value={availability.hoursPerWeek ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : Number(e.target.value);
              setAvailability((prev) => ({ ...prev, hoursPerWeek: val }));
              setSaved(false);
            }}
            className="input max-w-xs"
            placeholder="e.g. 32"
          />
        </div>

        <div className="mb-4">
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Preferred days
          </span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleDay(id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  availability.preferredDays?.includes(id)
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Timezone
          </label>
          <input
            type="text"
            value={availability.timezone ?? ''}
            onChange={(e) => {
              setAvailability((prev) => ({
                ...prev,
                timezone: e.target.value || undefined,
              }));
              setSaved(false);
            }}
            className="input max-w-md"
            placeholder="America/Chicago"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={availability.notes ?? ''}
            onChange={(e) => {
              setAvailability((prev) => ({
                ...prev,
                notes: e.target.value || undefined,
              }));
              setSaved(false);
            }}
            rows={2}
            className="input w-full"
            placeholder="School pickup Wed afternoons, etc."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && (
          <span className="text-sm text-green-700">Profile saved.</span>
        )}
      </div>
    </div>
  );
}

export default MemberProfile;
