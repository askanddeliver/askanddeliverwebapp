import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Loader2 } from 'lucide-react';
import { uploadsApi } from '../../services/api';

interface ImageUploadProps {
  value: string;
  projectSlug: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  projectSlug,
  onChange,
  label,
  placeholder = 'Drop an image here or click to upload',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>(
    value && !value.startsWith('/uploads') ? 'url' : 'upload'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset preview failure state whenever the value changes
  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.svg')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB');
      return;
    }

    const slug = projectSlug || 'temp';

    try {
      setUploading(true);
      setError(null);
      const res = await uploadsApi.uploadSingle(slug, file);
      onChange(res.data.url);
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
    onChange('');
    setError(null);
    setPreviewFailed(false);
  };

  const isUploaded = value && value.startsWith('/uploads');
  const canPreview =
    value &&
    !previewFailed &&
    (isUploaded || value.startsWith('http://') || value.startsWith('https://'));

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
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <span className="text-sm text-gray-600">{placeholder}</span>
          <span className="text-xs text-gray-400">
            JPEG, PNG, WebP, GIF, SVG &middot; Max 10 MB
          </span>
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200">
      <img
        src={value}
        alt="Preview"
        className="w-full h-48 object-cover"
        onError={() => setPreviewFailed(true)}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-white text-gray-800 text-xs rounded-md font-medium hover:bg-gray-100"
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

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Mode toggle */}
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
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {value && (
            <p className="text-xs text-gray-400 mt-1 font-mono truncate">{value}</p>
          )}
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input text-sm"
            placeholder="/portfolio/project-name/image.jpg or https://..."
          />
          {canPreview && (
            <div className="mt-2 relative rounded-lg overflow-hidden border border-gray-200">
              <img
                src={value}
                alt="Preview"
                className="w-full h-32 object-cover"
                onError={() => setPreviewFailed(true)}
              />
            </div>
          )}
          {value && !canPreview && (
            <p className="text-xs text-amber-600 mt-1">
              Path set but cannot preview. Upload an image or use a full URL to see a preview.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
