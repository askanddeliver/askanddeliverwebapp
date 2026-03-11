/**
 * Utilities for parsing and embedding Vimeo and YouTube videos.
 */

export type VideoSource = 'cloudinary' | 'vimeo' | 'youtube';

/**
 * Detect video source from a URL.
 */
export function detectVideoSource(url: string): VideoSource | null {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (u.includes('vimeo.com')) return 'vimeo';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('res.cloudinary.com')) return 'cloudinary';
  return null;
}

/**
 * Extract Vimeo video ID from various URL formats.
 */
export function parseVimeoId(url: string): string | null {
  const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract YouTube video ID from various URL formats.
 */
export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get embed URL for Vimeo.
 */
export function getVimeoEmbedUrl(url: string): string | null {
  const id = parseVimeoId(url);
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

/**
 * Get embed URL for YouTube.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = parseYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/**
 * Check if a URL is a valid Vimeo or YouTube URL.
 */
export function isValidEmbedUrl(url: string): boolean {
  return parseVimeoId(url) !== null || parseYouTubeId(url) !== null;
}

/**
 * Get a static thumbnail URL for video previews (gallery, not active player).
 * YouTube and Cloudinary have built-in thumbnails; Vimeo requires oEmbed (we use placeholder).
 */
export function getVideoThumbnailUrl(
  url: string,
  source: 'cloudinary' | 'vimeo' | 'youtube' | undefined
): string | null {
  if (!url || !source) return null;

  if (source === 'youtube') {
    const id = parseYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }

  if (source === 'cloudinary' && url.includes('res.cloudinary.com')) {
    // Cloudinary: add so_0 to extract first frame, use .jpg for image output
    return url.replace('/upload/', '/upload/so_0/').replace(/\.(mp4|mov|webm)$/i, '.jpg');
  }

  // Vimeo: no simple thumbnail URL without API; return null to use fallback
  return null;
}
