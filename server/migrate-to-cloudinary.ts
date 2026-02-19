import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { PortfolioProject } from './src/models';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOAD_DIR = path.join(__dirname, 'uploads', 'portfolio');

async function uploadFile(filePath: string, folder: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const resourceType = ['.mp4', '.mov', '.webm'].includes(ext) ? 'video' as const : 'image' as const;

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: resourceType,
  });

  return result.secure_url;
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected.\n');

  const projects = await PortfolioProject.find({});
  console.log(`Found ${projects.length} portfolio projects.\n`);

  let totalUploaded = 0;
  let totalUpdated = 0;

  for (const project of projects) {
    const slug = project.slug;
    const projectDir = path.join(UPLOAD_DIR, slug);
    console.log(`--- ${project.title} (${slug}) ---`);

    let changed = false;

    // Build a map of local filename -> cloudinary URL for this project
    const urlMap = new Map<string, string>();

    // Upload all files in this project's local directory
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter(f => !f.startsWith('.'));
      console.log(`  ${files.length} local files found`);

      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const folder = `portfolio/${slug}`;
        try {
          console.log(`  Uploading: ${file}...`);
          const cloudinaryUrl = await uploadFile(filePath, folder);
          const localUrl = `/uploads/portfolio/${slug}/${file}`;
          urlMap.set(localUrl, cloudinaryUrl);
          totalUploaded++;
          console.log(`    -> ${cloudinaryUrl}`);
        } catch (err) {
          console.error(`  FAILED: ${file}`, err);
        }
      }
    } else {
      console.log('  No local directory');
    }

    // Update featuredImage if it's a local path
    if (project.featuredImage && project.featuredImage.startsWith('/uploads/')) {
      const newUrl = urlMap.get(project.featuredImage);
      if (newUrl) {
        project.featuredImage = newUrl;
        changed = true;
        console.log(`  Updated featuredImage`);
      } else {
        console.log(`  WARNING: featuredImage not found in uploads: ${project.featuredImage}`);
      }
    }

    // Update gallery images
    if (project.images && project.images.length > 0) {
      for (let i = 0; i < project.images.length; i++) {
        const img = project.images[i];
        if (img.url && img.url.startsWith('/uploads/')) {
          const newUrl = urlMap.get(img.url);
          if (newUrl) {
            project.images[i].url = newUrl;
            changed = true;
            console.log(`  Updated gallery image ${i + 1}`);
          } else {
            console.log(`  WARNING: gallery image not found in uploads: ${img.url}`);
          }
        }
      }
    }

    if (changed) {
      await project.save();
      totalUpdated++;
      console.log(`  Saved to MongoDB.\n`);
    } else {
      console.log(`  No changes needed.\n`);
    }
  }

  console.log('=== Migration Complete ===');
  console.log(`Files uploaded to Cloudinary: ${totalUploaded}`);
  console.log(`MongoDB documents updated: ${totalUpdated}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
