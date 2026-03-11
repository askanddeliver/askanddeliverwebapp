import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { getVimeoEmbedUrl, getYouTubeEmbedUrl } from '../../utils/videoEmbed';

export interface LightboxImage {
  url: string;
  caption?: string;
  type?: 'image' | 'video';
  source?: 'cloudinary' | 'vimeo' | 'youtube';
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) setIndex((i) => i - 1);
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) setIndex((i) => i + 1);
  }, [hasNext]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, goPrev, goNext]);

  const current = images[index];
  if (!current) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 p-2.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
              <span className="text-xs font-mono text-white/50 tracking-wider">
                {index + 1} / {images.length}
              </span>
            </div>
          )}

          {/* Previous */}
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next */}
          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image or Video */}
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {current.type === 'video' ||
              current.source === 'vimeo' ||
              current.source === 'youtube' ? (
                <div className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden bg-black">
                  {current.source === 'vimeo' && getVimeoEmbedUrl(current.url) ? (
                    <iframe
                      src={getVimeoEmbedUrl(current.url)!}
                      title={current.caption || 'Video'}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : current.source === 'youtube' && getYouTubeEmbedUrl(current.url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(current.url)! + '?autoplay=1'}
                      title={current.caption || 'Video'}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={current.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                      playsInline
                    />
                  )}
                </div>
              ) : (
                <img
                  src={current.url}
                  alt={current.caption || ''}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                  draggable={false}
                />
              )}
              {current.caption && (
                <p className="mt-4 text-sm text-white/60 font-light text-center max-w-lg">
                  {current.caption}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Small zoom-hint icon overlay for clickable images.
 */
export function ZoomHint() {
  return (
    <div className="absolute bottom-3 right-3 p-2 rounded-full bg-black/30 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
      <ZoomIn className="w-4 h-4" />
    </div>
  );
}
