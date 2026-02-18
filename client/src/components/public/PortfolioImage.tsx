import { useState } from 'react';

interface PortfolioImageProps {
  src: string;
  alt: string;
  fallbackColor: string;
  fallbackLabel?: string;
  className?: string;
}

/**
 * Renders a portfolio image with a graceful fallback to a branded
 * placeholder when no image URL is set or the image fails to load.
 */
export function PortfolioImage({
  src,
  alt,
  fallbackColor,
  fallbackLabel,
  className = '',
}: PortfolioImageProps) {
  const [failed, setFailed] = useState(false);
  const hasImage = src && src.trim() !== '' && !failed;

  if (hasImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback placeholder
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
