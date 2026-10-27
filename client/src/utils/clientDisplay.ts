/** Person (`name`) plus organization (`company`) as stored on a Client. */
export interface ClientNameParts {
  name?: string | null;
  company?: string | null;
  businessEntity?: string | null;
}

function trimmed(value?: string | null): string {
  return (value || '').trim();
}

/**
 * Organization first. Falls back to the owner/contact when no company is set.
 * Lists, pickers, and project headers use this as the client identity.
 */
export function clientPrimaryName(client: ClientNameParts | null | undefined): string {
  if (!client) return '';
  return trimmed(client.company) || trimmed(client.name);
}

/** Owner/contact when it is distinct from the company shown as the client. */
export function clientOwnerName(client: ClientNameParts | null | undefined): string {
  if (!client) return '';
  const company = trimmed(client.company);
  const name = trimmed(client.name);
  if (!company || !name) return '';
  if (company.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0) return '';
  return name;
}

/** "Restaurants Inc. (John Wade)" — company, then owner in parentheses. */
export function clientOptionLabel(client: ClientNameParts | null | undefined): string {
  const primary = clientPrimaryName(client);
  const owner = clientOwnerName(client);
  if (!primary) return '';
  return owner ? `${primary} (${owner})` : primary;
}

export function compareClientDisplay(
  a: ClientNameParts | null | undefined,
  b: ClientNameParts | null | undefined
): number {
  return clientPrimaryName(a).localeCompare(clientPrimaryName(b), undefined, {
    sensitivity: 'base',
  });
}

/**
 * Invoice and proposal "prepared for" block.
 * Legal entity, then company, then the owner as a secondary line.
 */
export function clientDocumentLines(client: ClientNameParts | null | undefined): {
  primary: string;
  secondary: string[];
} {
  if (!client) return { primary: '', secondary: [] };
  const entity = trimmed(client.businessEntity);
  const company = trimmed(client.company);
  const name = trimmed(client.name);
  const primary = entity || company || name;
  const secondary: string[] = [];
  const seen = new Set<string>([primary.toLowerCase()]);
  const add = (value: string) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    secondary.push(value);
  };
  if (entity) add(company);
  add(name);
  return { primary, secondary };
}
