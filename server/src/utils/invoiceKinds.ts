export const LIBRARY_DOCUMENT_KINDS = [
  'RETAINER_REPORT',
  'DATA_REPORT',
  'BUDGET_REPORT',
] as const;

export type LibraryDocumentKind = (typeof LIBRARY_DOCUMENT_KINDS)[number];

export function isPayableDocumentKind(kind?: string | null): boolean {
  return !kind || kind === 'INVOICE';
}

/** Mongo match for payable invoices (legacy rows omit documentKind). */
export const payableDocumentKindMatch = {
  $or: [
    { documentKind: 'INVOICE' },
    { documentKind: { $exists: false } },
    { documentKind: null },
  ],
};

export const libraryDocumentKindMatch = {
  documentKind: { $in: [...LIBRARY_DOCUMENT_KINDS] },
};

export function parseDocumentKind(raw: unknown): 'INVOICE' | LibraryDocumentKind {
  if (raw === 'RETAINER_REPORT' || raw === 'DATA_REPORT' || raw === 'BUDGET_REPORT') {
    return raw;
  }
  return 'INVOICE';
}
