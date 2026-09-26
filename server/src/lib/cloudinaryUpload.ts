import cloudinary from '../config/cloudinary';

export type CloudinaryResourceType = 'image' | 'raw' | 'video';

/** Source files that must stay raw even when MIME looks like an image. */
const FORCE_RAW_EXTENSIONS = new Set([
  'pdf',
  'psd',
  'ai',
  'eps',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'zip',
  'txt',
  'ppt',
  'pptx',
]);

export function resolveCloudinaryResourceType(
  mimetype: string,
  originalName: string
): CloudinaryResourceType {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  if (FORCE_RAW_EXTENSIONS.has(ext)) return 'raw';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return 'raw';
}

export interface CloudinaryUploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  publicId: string;
  resourceType: CloudinaryResourceType;
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    originalName: string;
    mimetype: string;
  }
): Promise<CloudinaryUploadResult> {
  const resourceType = resolveCloudinaryResourceType(
    options.mimetype,
    options.originalName
  );

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: options.originalName.replace(/[^\w.\-]+/g, '_'),
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('No result from Cloudinary'));

        resolve({
          url: result.secure_url,
          filename: options.originalName,
          mimeType: options.mimetype,
          size: result.bytes,
          publicId: result.public_id,
          resourceType,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function destroyCloudinaryUpload(
  publicId: string,
  resourceType: CloudinaryResourceType
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
