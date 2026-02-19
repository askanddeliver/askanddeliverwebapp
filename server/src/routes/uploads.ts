import { Router, Response } from 'express';
import multer from 'multer';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import cloudinary from '../config/cloudinary';

const router = Router();

router.use(checkJwt);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/webm',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) and video files (MP4, MOV, WebM) are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB for video support
    files: 10,
  },
});

function uploadToCloudinary(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<{ secure_url: string; public_id: string; bytes: number; format: string; resource_type: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('No result from Cloudinary'));
        resolve(result as { secure_url: string; public_id: string; bytes: number; format: string; resource_type: string });
      }
    );
    stream.end(buffer);
  });
}

function resourceTypeFromMime(mimetype: string): 'image' | 'video' {
  return mimetype.startsWith('video/') ? 'video' : 'image';
}

// POST /api/uploads/portfolio/:projectSlug - Upload multiple images/videos
router.post(
  '/portfolio/:projectSlug',
  upload.array('images', 10),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw createError('No files uploaded', 400);
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const resType = resourceTypeFromMime(file.mimetype);
        const result = await uploadToCloudinary(file.buffer, {
          folder: `portfolio/${projectSlug}`,
          resource_type: resType,
        });

        return {
          filename: result.public_id.split('/').pop() || result.public_id,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: result.bytes,
          url: result.secure_url,
          publicId: result.public_id,
        };
      })
    );

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  })
);

// POST /api/uploads/portfolio/:projectSlug/single - Upload a single file
router.post(
  '/portfolio/:projectSlug/single',
  upload.single('image'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug } = req.params;
    const file = req.file;

    if (!file) {
      throw createError('No file uploaded', 400);
    }

    const resType = resourceTypeFromMime(file.mimetype);
    const result = await uploadToCloudinary(file.buffer, {
      folder: `portfolio/${projectSlug}`,
      resource_type: resType,
    });

    res.status(201).json({
      filename: result.public_id.split('/').pop() || result.public_id,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: result.bytes,
      url: result.secure_url,
      publicId: result.public_id,
    });
  })
);

// DELETE /api/uploads/portfolio/:projectSlug/:filename - Delete an uploaded file
router.delete(
  '/portfolio/:projectSlug/:filename',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug, filename } = req.params;
    const publicId = `portfolio/${projectSlug}/${filename}`;

    // Try deleting as image first, then as video
    const imageResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (imageResult.result !== 'ok') {
      const videoResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      if (videoResult.result !== 'ok') {
        throw createError('File not found in Cloudinary', 404);
      }
    }

    res.json({ message: 'File deleted successfully' });
  })
);

// GET /api/uploads/portfolio/:projectSlug - List uploaded files for a project
router.get(
  '/portfolio/:projectSlug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug } = req.params;
    const prefix = `portfolio/${projectSlug}`;

    try {
      const [imageResult, videoResult] = await Promise.all([
        cloudinary.api.resources({
          type: 'upload',
          prefix,
          resource_type: 'image',
          max_results: 100,
        }),
        cloudinary.api.resources({
          type: 'upload',
          prefix,
          resource_type: 'video',
          max_results: 100,
        }),
      ]);

      const allResources = [...(imageResult.resources || []), ...(videoResult.resources || [])];

      const files = allResources.map((r: { public_id: string; secure_url: string; bytes: number; created_at: string }) => ({
        filename: r.public_id.split('/').pop(),
        url: r.secure_url,
        size: r.bytes,
        modified: r.created_at,
        publicId: r.public_id,
      }));

      res.json({ files });
    } catch {
      res.json({ files: [] });
    }
  })
);

export default router;
