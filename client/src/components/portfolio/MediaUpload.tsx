import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, Video, Link as LinkIcon, Loader2 } from 'lucide-react';
import { uploadsApi } from '../../services/api';
import {
  detectVideoSource,
  isValidEmbedUrl,
  getVimeoEmbedUrl,
  getYouTubeEmbedUrl,
} from '../../utils/videoEmbed';
import type { PortfolioMediaSource, PortfolioMediaType } from '../../types';

export interface MediaUploadValue {
  url: string;
  type?: PortfolioMediaType;
  source?: PortfolioMediaSource;
}

interface MediaUploadProps {
  value: MediaUploadValue;
  projectSlug: string;
  onChange: (media: MediaUploadValue) => void;
  label?: string;
  placeholder?: string;
  /** When true, only allow images (e.g. for featured image) */
  imagesOnly?: boolean;
}

const VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'];
const IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

function isVideoFile(file: File): boolean {
  return VIDEO_MIME.includes(file.type) || file.type.startsWith('video/');
}

function isImageFile(file: File): boolean {
  return IMAGE_MIME.includes(file.type) || file.type.startsWith('image/') || file.name.endsWith('.svg');
}

export function MediaUpload({
  value,
  projectSlug,
  onChange,
  label,
  placeholder = 'Drop an image or video here, or paste a Vimeo/YouTube URL',
  imagesOnly = false,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>(
    value.url && !value.url.startsWith('/uploads') && !value.url.includes('res.cloudinary.com')
      ? 'url'
      : 'upload'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewFailed(false);
  }, [value.url]);

  const handleFile = async (file: File) => {
    if (imagesOnly) {
      if (!isImageFile(file)) {
        setError('Please select an image file');
        return;
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_IMAGE_MB} MB`);
        return;
      }
    } else {
      const isVideo = isVideoFile(file);
      const isImg = isImageFile(file);
      if (!isVideo && !isImg) {
        setError('Please select an image (JPEG, PNG, GIF, WebP, SVG) or video (MP4, MOV, WebM)');
        return;
      }
      const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (file.size > maxMb * 1024 * 1024) {
        setError(`File must be under ${maxMb} MB`);
        return;
      }
    }

    const slug = projectSlug || 'temp';

    try {
      setUploading(true);
      setError(null);
      const res = await uploadsApi.uploadSingle(slug, file);
      const isVideo = isVideoFile(file);
      onChange({
        url: res.data.url,
        type: isVideo ? 'video' : 'image',
        source: 'cloudinary',
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Make sure the server is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleClear = () => {
    onChange({ url: '' });
    setError(null);
    setPreviewFailed(false);
  };

  const handleUrlChange = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      onChange({ url: '' });
      return;
    }

    const source = detectVideoSource(trimmed);
    if (source === 'vimeo' || source === 'youtube') {
      if (isValidEmbedUrl(trimmed)) {
        onChange({ url: trimmed, type: 'video', source });
      } else {
        onChange({ url: trimmed, type: 'video', source });
      }
    } else if (source === 'cloudinary') {
      onChange({ url: trimmed, type: trimmed.includes('/video/') ? 'video' : 'image', source: 'cloudinary' });
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      onChange({ url: trimmed, type: 'image' });
    } else {
      onChange({ url: trimmed });
    }
  };

  const isUploaded =
    value.url &&
    (value.url.startsWith('/uploads') || value.url.includes('res.cloudinary.com'));
  const isEmbed = value.source === 'vimeo' || value.source === 'youtube';
  const canPreview =
    value.url &&
    !previewFailed &&
    (isUploaded ||
      isEmbed ||
      value.url.startsWith('http://') ||
      value.url.startsWith('https://'));

  const accept = imagesOnly
    ? 'image/*'
    : 'image/*,video/mp4,video/quicktime,video/webm';

  const renderDropzone = () => (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
        dragOver
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="text-sm text-gray-500">Uploading...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            {imagesOnly ? (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            ) : (
              <Video className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <span className="text-sm text-gray-600">{placeholder}</span>
          <span className="text-xs text-gray-400">
            {imagesOnly
              ? 'JPEG, PNG, WebP, GIF, SVG · Max 10 MB'
              : 'Images (10 MB) · Video MP4/MOV/WebM (100 MB) · Or paste Vimeo/YouTube URL'}
          </span>
        </div>
      )}
    </div>
  );

  const renderImagePreview = () => (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200">
      <img
        src={value.url}
        alt="Preview"
        className="w-full h-48 object-cover"
        onError={() => setPreviewFailed(true)}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-white text-gray-800 text-xs rounded-md font-medium hover:bg-white/90"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-md font-medium hover:bg-red-600"
        >
          Remove
        </button>
      </div>
      <div className="absolute top-2 right-2">
        <button
          type="button"
          onClick={handleClear}
          className="p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderVideoPreview = () => {
    const embedUrl =
      value.source === 'vimeo'
        ? getVimeoEmbedUrl(value.url)
        : value.source === 'youtube'
          ? getYouTubeEmbedUrl(value.url)
          : value.source === 'cloudinary'
            ? value.url
            : null;

    return (
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-black">
        {embedUrl ? (
          <div className="aspect-video">
            <iframe
              src={embedUrl + (value.source === 'youtube' ? '?rel=0' : '')}
              title="Video preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            src={value.url}
            controls
            className="w-full max-h-48 object-contain"
            onError={() => setPreviewFailed(true)}
          />
        )}
        <div className="absolute top-2 right-2">
          <button
            type="button"
            onClick={handleClear}
            className="p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (value.type === 'video' || value.source === 'vimeo' || value.source === 'youtube') {
      return renderVideoPreview();
    }
    return renderImagePreview();
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            mode === 'upload'
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
            mode === 'url'
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <LinkIcon className="w-3 h-3" />
          URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div>
          {canPreview && !uploading ? renderPreview() : renderDropzone()}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />

          {value.url && (
            <p className="text-xs text-gray-400 mt-1 font-mono truncate">{value.url}</p>
          )}
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={value.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="input text-sm"
            placeholder={
              imagesOnly
                ? 'https://... or Cloudinary URL'
                : 'Paste Vimeo, YouTube, Cloudinary, or image URL'
            }
          />
          {canPreview && (
            <div className="mt-2 relative rounded-lg overflow-hidden border border-gray-200">
              {value.type === 'video' || value.source === 'vimeo' || value.source === 'youtube'
                ? renderVideoPreview()
                : (
                    <img
                      src={value.url}
                      alt="Preview"
                      className="w-full h-32 object-cover"
                      onError={() => setPreviewFailed(true)}
                    />
                  )}
            </div>
          )}
          {value.url && !canPreview && value.source && (
            <p className="text-xs text-amber-600 mt-1">
              Paste a full Vimeo or YouTube URL (e.g. https://vimeo.com/123456789)
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
