import { sanitizeBriefHtml } from '../../lib/sanitizeHtml';

interface SanitizedBriefProps {
  html?: string;
  fallback?: string;
  className?: string;
}

function SanitizedBrief({ html, fallback, className = '' }: SanitizedBriefProps) {
  if (html?.trim()) {
    return (
      <div
        className={`prose prose-neutral max-w-none text-neutral-700 ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeBriefHtml(html) }}
      />
    );
  }

  if (fallback?.trim()) {
    return <p className={`whitespace-pre-wrap text-neutral-700 ${className}`}>{fallback}</p>;
  }

  return (
    <p className="text-sm text-neutral-500 italic">
      No brief has been added for this project yet.
    </p>
  );
}

export default SanitizedBrief;
