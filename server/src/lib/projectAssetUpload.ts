import type { RequestHandler } from 'express';
import multer from 'multer';
import { createError } from '../middleware/errorHandler';

export const PROJECT_ASSET_MAX_BYTES = 75 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
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
  'mp4',
  'mov',
  'webm',
]);

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/vnd.adobe.photoshop',
  'application/pdf',
  'application/postscript',
  'application/illustrator',
  'application/x-photoshop',
  'application/photoshop',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/font-woff',
  'application/font-sfnt',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/octet-stream',
]);

export function fileExtension(originalName: string): string {
  const parts = originalName.split('.');
  if (parts.length < 2) return '';
  return parts.pop()!.toLowerCase();
}

export function isAllowedProjectAsset(originalName: string, mimetype: string): boolean {
  const ext = fileExtension(originalName);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;
  if (mimetype === 'application/octet-stream') return true;
  return ALLOWED_MIMES.has(mimetype);
}

const assetUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PROJECT_ASSET_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedProjectAsset(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

export const projectAssetUpload: RequestHandler = (req, res, next) => {
  assetUpload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const multerErr = err as { code?: string; message?: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      next(createError('File is too large (max 75 MB)', 400));
      return;
    }
    next(createError(multerErr.message || 'Upload failed', 400));
  });
};
