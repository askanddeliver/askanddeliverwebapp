import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { portalApi, projectAssetsApi } from '../../services/api';
import { useUserRole } from '../../contexts/UserContext';
import type { ProjectAsset } from '../../types';

const ACCEPT =
  '.jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.psd,.ai,.eps,.ttf,.otf,.woff,.woff2,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt,.ppt,.pptx,.mp4,.mov,.webm';

interface ProjectAssetsPanelProps {
  projectId: string;
  variant: 'team' | 'portal';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
}

function isPreviewable(asset: ProjectAsset): boolean {
  if (asset.resourceType === 'image') return true;
  const ext = fileExt(asset.originalName).toLowerCase();
  return ext === 'pdf' || asset.mimeType === 'application/pdf';
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ProjectAssetsPanel({ projectId, variant }: ProjectAssetsPanelProps) {
  const { user, isAdmin } = useUserRole();
  const auth0Id = user?.auth0Id;
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        variant === 'portal'
          ? await portalApi.getAssets(projectId)
          : await projectAssetsApi.list(projectId);
      setAssets(res.data || []);
      setError(null);
    } catch {
      setAssets([]);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId, variant]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res =
        variant === 'portal'
          ? await portalApi.uploadAsset(projectId, file)
          : await projectAssetsApi.upload(projectId, file);
      setAssets((prev) => [res.data, ...prev]);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleToggle = async (asset: ProjectAsset) => {
    try {
      const res = await projectAssetsApi.updateVisibility(
        projectId,
        asset._id,
        !asset.clientVisible
      );
      setAssets((prev) => prev.map((a) => (a._id === asset._id ? res.data : a)));
    } catch {
      setError('Failed to update visibility');
    }
  };

  const handleDelete = async (asset: ProjectAsset) => {
    if (!window.confirm(`Delete “${asset.originalName}”?`)) return;
    try {
      if (variant === 'portal') {
        await portalApi.deleteAsset(projectId, asset._id);
      } else {
        await projectAssetsApi.remove(projectId, asset._id);
      }
      setAssets((prev) => prev.filter((a) => a._id !== asset._id));
    } catch {
      setError('Failed to delete file');
    }
  };

  const canDelete = (asset: ProjectAsset): boolean => {
    if (variant === 'portal') return asset.uploadedByAuth0Id === auth0Id;
    if (isAdmin) return true;
    return asset.uploadedByAuth0Id === auth0Id;
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {variant === 'portal'
            ? 'Files shared with you on this project.'
            : 'Uploads start internal. Toggle to share with the client.'}
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sage/30 border-t-brand-sage" />
        </div>
      ) : assets.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">No files yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Who</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                {variant === 'team' && (
                  <th className="py-2 pr-3 font-medium">Visibility</th>
                )}
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset._id} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      {asset.resourceType === 'image' ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
                      )}
                      <span className="truncate font-medium text-neutral-800">
                        {asset.originalName}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {formatBytes(asset.size)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-neutral-500">{fileExt(asset.originalName)}</td>
                  <td className="py-2.5 pr-3 text-neutral-600">{asset.uploadedByName}</td>
                  <td className="py-2.5 pr-3 text-neutral-500">{formatWhen(asset.createdAt)}</td>
                  {variant === 'team' && (
                    <td className="py-2.5 pr-3">
                      {asset.uploadedByRole === 'client' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-[11px] text-primary-800">
                          <Eye className="h-3 w-3" />
                          Client
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggle(asset)}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                            asset.clientVisible
                              ? 'bg-primary-50 text-primary-800 hover:bg-primary-100'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title={
                            asset.clientVisible
                              ? 'Visible to client — click to make internal'
                              : 'Internal — click to share with client'
                          }
                        >
                          {asset.clientVisible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {asset.clientVisible ? 'Client' : 'Internal'}
                        </button>
                      )}
                    </td>
                  )}
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-primary-700"
                        title={isPreviewable(asset) ? 'Open' : 'Download'}
                        download={!isPreviewable(asset) ? asset.originalName : undefined}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {canDelete(asset) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(asset)}
                          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  );
}

export default ProjectAssetsPanel;
