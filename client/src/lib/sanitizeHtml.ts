import DOMPurify from 'dompurify';

/** Sanitize rich-text HTML (e.g. project brief) before rendering in the portal. */
export function sanitizeBriefHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
