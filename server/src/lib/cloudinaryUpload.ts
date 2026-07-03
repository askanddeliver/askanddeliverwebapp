import cloudinary from '../config/cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  publicId: string;
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    originalName: string;
    mimetype: string;
  }
): Promise<CloudinaryUploadResult> {
  const isImage = options.mimetype.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';

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
        });
      }
    );
    stream.end(buffer);
  });
}
