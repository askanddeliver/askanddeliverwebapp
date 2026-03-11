import { useState } from 'react';
import { Play } from 'lucide-react';
import { PortfolioImage } from './PortfolioImage';
import { getVideoThumbnailUrl } from '../../utils/videoEmbed';
import type { PortfolioImage as PortfolioImageType } from '../../types';

interface PortfolioMediaProps {
  media: PortfolioImageType;
  fallbackColor: string;
  fallbackLabel?: string;
  className?: string;
  /** When true, show static thumbnail + play overlay (for gallery). When false, render active player (for lightbox). */
  thumbnailOnly?: boolean;
}

/**
 * Renders a portfolio media item (image or video) for the public site.
 * For videos in thumbnail mode: shows static preview + play icon, no active player.
 */
export function PortfolioMedia({
  media,
  fallbackColor,
  fallbackLabel,
  className = '',
  thumbnailOnly = true,
}: PortfolioMediaProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const isVideo =
    media.type === 'video' ||
    media.source === 'vimeo' ||
    media.source === 'youtube';

  if (!media.url || !media.url.trim()) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center ${className}`}
        style={{ backgroundColor: fallbackColor + '15' }}
      >
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 opacity-20"
            style={{ backgroundColor: fallbackColor }}
          />
          {fallbackLabel && (
            <span
              className="font-display text-xl font-semibold opacity-20"
              style={{ color: fallbackColor }}
            >
              {fallbackLabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isVideo && thumbnailOnly) {
    const thumbUrl = getVideoThumbnailUrl(media.url, media.source);
    const showThumb = thumbUrl && !thumbFailed;

    return (
      <div className={`w-full h-full relative ${className}`}>
        {showThumb ? (
          <img
            src={thumbUrl}
            alt={media.caption || 'Video'}
            className="w-full h-full object-cover"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: fallbackColor + '25' }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-brand-charcoal ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortfolioImage
      src={media.url}
      alt={media.caption || ''}
      fallbackColor={fallbackColor}
      fallbackLabel={fallbackLabel}
      className={className}
    />
  );
}
