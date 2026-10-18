import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react';
import { portfolioApi, portfolioPitchApi } from '../services/api';
import type { PortfolioPitch, PortfolioProject } from '../types';

interface PitchDraft {
  title: string;
  slug: string;
  summary: string;
  projectIds: string[];
  published: boolean;
}

const emptyDraft: PitchDraft = {
  title: '',
  slug: '',
  summary: '',
  projectIds: [],
  published: false,
};

function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as { response?: { data?: { message?: string } } }).response?.data
      ?.message;
    if (message) return message;
  }
  return fallback;
}

function PortfolioPitches() {
  const [pitches, setPitches] = useState<PortfolioPitch[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PitchDraft>(emptyDraft);
  const [slugTouched, setSlugTouched] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const publishedProjects = useMemo(
    () => projects.filter((project) => project.published),
    [projects]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [pitchRes, projectRes] = await Promise.all([
        portfolioPitchApi.getAll(),
        portfolioApi.getAll(),
      ]);
      setPitches(pitchRes.data || []);
      setProjects(projectRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load pitch pages:', err);
      setError('Failed to load pitch pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setSlugTouched(false);
    setEditorOpen(true);
    setError(null);
  };

  const openEdit = (pitch: PortfolioPitch) => {
    setEditingId(pitch._id);
    setDraft({
      title: pitch.title,
      slug: pitch.slug,
      summary: pitch.summary || '',
      projectIds: pitch.projectIds.map(String),
      published: pitch.published,
    });
    setSlugTouched(true);
    setEditorOpen(true);
    setError(null);
  };

  const toggleProject = (id: string) => {
    setDraft((current) => {
      const selected = current.projectIds.includes(id);
      return {
        ...current,
        projectIds: selected
          ? current.projectIds.filter((projectId) => projectId !== id)
          : [...current.projectIds, id],
      };
    });
  };

  const moveProject = (id: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.projectIds.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.projectIds.length) return current;
      const projectIds = [...current.projectIds];
      const [item] = projectIds.splice(index, 1);
      projectIds.splice(next, 0, item);
      return { ...current, projectIds };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...draft,
        slug: draft.slug.trim() || slugFromTitle(draft.title),
      };
      if (editingId) {
        const res = await portfolioPitchApi.update(editingId, payload);
        setPitches((current) =>
          current.map((pitch) => (pitch._id === editingId ? res.data : pitch))
        );
      } else {
        const res = await portfolioPitchApi.create(payload);
        setPitches((current) => [res.data, ...current]);
      }
      setEditorOpen(false);
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (err) {
      setError(errorMessage(err, 'Failed to save pitch page'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pitch: PortfolioPitch) => {
    if (!window.confirm(`Delete “${pitch.title}”? The public link will stop working.`)) {
      return;
    }
    try {
      await portfolioPitchApi.delete(pitch._id);
      setPitches((current) => current.filter((item) => item._id !== pitch._id));
      if (editingId === pitch._id) {
        setEditorOpen(false);
        setEditingId(null);
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete pitch page'));
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/for/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 2000);
    } catch {
      setError('Could not copy the link');
    }
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
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pitch Pages</h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            Build a public landing page from published portfolio projects, with a custom
            link and a short note for a specific pitch.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New Pitch Page
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {editorOpen && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit pitch page' : 'New pitch page'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Title</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((current) => ({
                    ...current,
                    title,
                    slug: slugTouched ? current.slug : slugFromTitle(title),
                  }));
                }}
                className="input mt-1"
                placeholder="Work for Northwind"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">URL path</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">/for/</span>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft((current) => ({
                      ...current,
                      slug: slugFromTitle(e.target.value),
                    }));
                  }}
                  className="input"
                  placeholder="northwind"
                />
              </div>
            </label>
          </div>
          <label className="block mt-4">
            <span className="text-xs font-medium text-gray-600">Pitch note</span>
            <textarea
              value={draft.summary}
              onChange={(e) =>
                setDraft((current) => ({ ...current, summary: e.target.value }))
              }
              rows={5}
              className="input mt-1"
              placeholder="A short note about why these projects are relevant."
            />
          </label>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">On this page</p>
              {draft.projectIds.length === 0 ? (
                <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-4">
                  Add published projects. They appear in this order.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                  {draft.projectIds.map((id, index) => {
                    const project = publishedProjects.find((item) => item._id === id);
                    if (!project) return null;
                    return (
                      <li key={id} className="flex items-center gap-2 px-3 py-2">
                        <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{project.client}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => moveProject(id, -1)}
                          className="p-1 text-gray-400 hover:text-gray-700"
                          aria-label="Move earlier"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProject(id, 1)}
                          className="p-1 text-gray-400 hover:text-gray-700"
                          aria-label="Move later"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProject(id)}
                          className="text-xs text-gray-500 hover:text-gray-800 px-1"
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Published projects</p>
              {publishedProjects.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Publish at least one portfolio project before creating a pitch page.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                  {publishedProjects
                    .filter((project) => !draft.projectIds.includes(project._id))
                    .map((project) => (
                      <li key={project._id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {project.client} · {project.year}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleProject(project._id)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Add
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) =>
                setDraft((current) => ({ ...current, published: e.target.checked }))
              }
            />
            Published — anyone with the link can view this page
          </label>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save pitch page'}
            </button>
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pitches.length === 0 ? (
        <div className="card text-center text-gray-500">
          No pitch pages yet. Create one to share a curated set of work.
        </div>
      ) : (
        <div className="space-y-3">
          {pitches.map((pitch) => (
            <div key={pitch._id} className="card flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 truncate">{pitch.title}</h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      pitch.published
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {pitch.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">/for/{pitch.slug}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {pitch.projectIds.length} project{pitch.projectIds.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pitch.published && (
                  <a
                    href={`/for/${pitch.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => copyLink(pitch.slug)}
                  className="btn-secondary text-sm"
                >
                  {copiedSlug === pitch.slug ? 'Copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(pitch)}
                  className="btn-secondary text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pitch)}
                  className="text-sm text-red-600 hover:text-red-700 px-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PortfolioPitches;
