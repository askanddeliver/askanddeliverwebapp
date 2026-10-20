import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Plus } from 'lucide-react';
import { portalApi, projectDocumentsApi } from '../../services/api';
import { useUserRole } from '../../contexts/UserContext';
import type {
  ProjectDocument,
  ProjectDocumentsResponse,
  ProjectFolderGrant,
} from '../../types';

interface ProjectDocumentsPanelProps {
  projectId: string;
  variant: 'team' | 'portal';
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function docPreviewUrl(googleFileId: string, mode: 'preview' | 'edit'): string {
  return `https://docs.google.com/document/d/${googleFileId}/${mode}`;
}

function apiMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  return message || fallback;
}

function grantLabel(subject: ProjectFolderGrant['subject']): string {
  if (subject === 'admin') return 'Admin';
  if (subject === 'member') return 'Creator';
  return 'Client';
}

function statusClass(status: ProjectFolderGrant['status']): string {
  if (status === 'granted') return 'bg-primary-50 text-primary-800';
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  return 'bg-red-50 text-red-700';
}

function ProjectDocumentsPanel({ projectId, variant }: ProjectDocumentsPanelProps) {
  const { isAdmin } = useUserRole();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [grants, setGrants] = useState<ProjectFolderGrant[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<ProjectDocument | null>(null);
  const [frameMode, setFrameMode] = useState<'preview' | 'edit'>('preview');

  const applyResponse = (data: ProjectDocumentsResponse) => {
    setConfigured(data.configured);
    setDocuments(data.documents || []);
    setGrants(data.grants || []);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        variant === 'portal'
          ? await portalApi.getDocuments(projectId)
          : await projectDocumentsApi.list(projectId);
      applyResponse(res.data);
      setError(null);
    } catch {
      setDocuments([]);
      setGrants([]);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId, variant]);

  useEffect(() => {
    load();
  }, [load]);

  const openDocument = (doc: ProjectDocument, mode: 'preview' | 'edit') => {
    setOpenDoc(doc);
    setFrameMode(mode);
  };

  const handleCreate = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError('Enter a title');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res =
        variant === 'portal'
          ? await portalApi.createDocument(projectId, nextTitle)
          : await projectDocumentsApi.create(projectId, nextTitle);
      setDocuments((prev) => [res.data, ...prev]);
      setTitle('');
      setShowCreate(false);
      openDocument(res.data, 'edit');
      if (variant === 'team' && isAdmin) {
        const listed = await projectDocumentsApi.list(projectId);
        setGrants(listed.data.grants || []);
      }
    } catch (err) {
      setError(apiMessage(err, 'Could not create the document'));
    } finally {
      setCreating(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    try {
      const res = await projectDocumentsApi.retryAccess(projectId);
      setGrants(res.data.grants || []);
    } catch (err) {
      setError(apiMessage(err, 'Could not refresh access'));
    } finally {
      setRetrying(false);
    }
  };

  const showGrants = variant === 'team' && isAdmin;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {variant === 'portal'
            ? 'Google Docs shared with everyone on this project.'
            : 'Google Docs for this project. Everyone on the project can edit them.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setShowCreate((open) => !open);
            setError(null);
          }}
          disabled={!configured || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Doc
        </button>
      </div>

      {!configured && !loading && (
        <p className="mb-3 text-sm text-neutral-600">
          Google Docs is not set up for this workspace yet. Project files still work as usual.
        </p>
      )}

      {showCreate && configured && (
        <form
          className="mb-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            maxLength={200}
            className="min-w-[12rem] flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sage/30 border-t-brand-sage" />
        </div>
      ) : documents.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">No documents yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Created by</th>
                <th className="py-2 pr-3 font-medium">Created</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-3">
                    <button
                      type="button"
                      onClick={() => openDocument(doc, 'preview')}
                      className="inline-flex items-center gap-2 text-left font-medium text-neutral-800 hover:text-primary-700"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  </td>
                  <td className="py-2.5 pr-3 text-neutral-600">{doc.createdByName}</td>
                  <td className="py-2.5 pr-3 text-neutral-500">{formatWhen(doc.createdAt)}</td>
                  <td className="py-2.5 text-right">
                    <a
                      href={doc.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-700"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showGrants && (grants.length > 0 || documents.length > 0) && (
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Access
            </h3>
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying || !configured}
              className="text-xs text-neutral-500 hover:text-primary-700 disabled:opacity-50"
            >
              {retrying ? 'Refreshing…' : 'Retry failed'}
            </button>
          </div>
          {grants.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Access is granted the first time a document is created.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {grants.map((grant) => (
                <li key={grant._id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-neutral-800">{grant.email}</span>
                  <span className="text-xs text-neutral-400">{grantLabel(grant.subject)}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] capitalize ${statusClass(grant.status)}`}
                  >
                    {grant.status}
                  </span>
                  {grant.error && (
                    <span className="text-xs text-red-600">{grant.error}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {openDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[min(90vh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
              <h2 className="truncate text-sm font-semibold text-neutral-800">{openDoc.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFrameMode((mode) => (mode === 'edit' ? 'preview' : 'edit'))}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  {frameMode === 'edit' ? 'View' : 'Edit'}
                </button>
                <a
                  href={openDoc.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Open in Google Docs
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setOpenDoc(null)}
                  className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              title={openDoc.title}
              src={docPreviewUrl(openDoc.googleFileId, frameMode)}
              className="min-h-0 w-full flex-1 bg-neutral-50"
            />
            <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500">
              If the document is blank, you may need to be signed into Google. Use Open in Google
              Docs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDocumentsPanel;
