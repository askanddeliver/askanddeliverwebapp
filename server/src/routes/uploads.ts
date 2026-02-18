import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();

// All upload routes require authentication
router.use(checkJwt);

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'portfolio');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration: organize by project slug
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Files go to uploads/portfolio/ initially; we'll move to project subfolder after
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename and add timestamp to prevent collisions
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const timestamp = Date.now();
    cb(null, `${baseName}-${timestamp}${ext}`);
  },
});

// File filter: only allow images
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max per file
    files: 10, // Max 10 files per request
  },
});

// POST /api/uploads/portfolio/:projectSlug - Upload images for a portfolio project
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

    // Create project-specific directory
    const projectDir = path.join(UPLOAD_DIR, projectSlug);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Move files to project directory and build response
    const uploadedFiles = files.map((file) => {
      const newPath = path.join(projectDir, file.filename);
      fs.renameSync(file.path, newPath);

      return {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/portfolio/${projectSlug}/${file.filename}`,
      };
    });

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  })
);

// POST /api/uploads/portfolio/:projectSlug/single - Upload a single image (featured image, etc.)
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

    // Create project-specific directory
    const projectDir = path.join(UPLOAD_DIR, projectSlug);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Move file to project directory
    const newPath = path.join(projectDir, file.filename);
    fs.renameSync(file.path, newPath);

    res.status(201).json({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/portfolio/${projectSlug}/${file.filename}`,
    });
  })
);

// DELETE /api/uploads/portfolio/:projectSlug/:filename - Delete an uploaded image
router.delete(
  '/portfolio/:projectSlug/:filename',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug, filename } = req.params;

    // Sanitize to prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, projectSlug, safeName);

    if (!fs.existsSync(filePath)) {
      throw createError('File not found', 404);
    }

    fs.unlinkSync(filePath);

    res.json({ message: 'File deleted successfully' });
  })
);

// GET /api/uploads/portfolio/:projectSlug - List uploaded images for a project
router.get(
  '/portfolio/:projectSlug',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectSlug } = req.params;
    const projectDir = path.join(UPLOAD_DIR, projectSlug);

    if (!fs.existsSync(projectDir)) {
      res.json({ files: [] });
      return;
    }

    const fileNames = fs.readdirSync(projectDir);
    const files = fileNames
      .filter((f) => !f.startsWith('.'))
      .map((f) => {
        const stats = fs.statSync(path.join(projectDir, f));
        return {
          filename: f,
          url: `/uploads/portfolio/${projectSlug}/${f}`,
          size: stats.size,
          modified: stats.mtime,
        };
      });

    res.json({ files });
  })
);

export default router;
