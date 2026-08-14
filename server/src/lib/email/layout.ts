import type { WorkspaceEmailBrand } from './brandContext';

export interface BrandedEmailContent {
  subject: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  previewText?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildBrandedEmailHtml(
  brand: WorkspaceEmailBrand,
  content: BrandedEmailContent
): string {
  const title = escapeHtml(content.title);
  const companyName = escapeHtml(brand.companyName);
  const body = content.bodyHtml;
  const accent = brand.accentColor;

  const ctaBlock =
    content.ctaLabel && content.ctaUrl
      ? `<p style="margin: 28px 0 0;">
           <a href="${escapeHtml(content.ctaUrl)}" style="display: inline-block; background: ${accent}; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 20px; border-radius: 8px;">
             ${escapeHtml(content.ctaLabel)}
           </a>
         </p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin: 0; padding: 0; background: #f7f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f7f5f2; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ede9e3;">
            <tr>
              <td style="padding: 24px 28px 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${accent};">
                ${companyName}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 28px 28px; color: #2a2a2a;">
                <h1 style="margin: 0 0 16px; font-size: 22px; line-height: 1.3;">${title}</h1>
                <div style="font-size: 15px; line-height: 1.6; color: #444444;">
                  ${body}
                </div>
                ${ctaBlock}
              </td>
            </tr>
          </table>
          <p style="margin: 16px 0 0; font-size: 12px; color: #888888; max-width: 560px;">
            You received this email because you have an account with ${companyName}.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Strip HTML tags for a plain-text fallback. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncateExcerpt(text: string, maxLength = 280): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}
