/** Person (`name`) plus organization (`company`) as stored on a Client. */
export interface ClientNameParts {
  name?: string | null;
  company?: string | null;
}

function trimmed(value?: string | null): string {
  return (value || '').trim();
}

/** Organization first. Falls back to the owner/contact when no company is set. */
export function clientPrimaryName(client: ClientNameParts | null | undefined): string {
  if (!client) return '';
  return trimmed(client.company) || trimmed(client.name);
}
