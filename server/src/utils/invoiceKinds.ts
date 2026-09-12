export const LIBRARY_DOCUMENT_KINDS = [
  'RETAINER_REPORT',
  'DATA_REPORT',
  'BUDGET_REPORT',
] as const;

export const PAYROLL_DOCUMENT_KINDS = ['PAY_STUB'] as const;

export type LibraryDocumentKind = (typeof LIBRARY_DOCUMENT_KINDS)[number];
export type PayrollDocumentKind = (typeof PAYROLL_DOCUMENT_KINDS)[number];

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

export const payrollDocumentKindMatch = {
  documentKind: { $in: [...PAYROLL_DOCUMENT_KINDS] },
};

export function parseDocumentKind(
  raw: unknown
): 'INVOICE' | LibraryDocumentKind | PayrollDocumentKind {
  if (raw === 'RETAINER_REPORT' || raw === 'DATA_REPORT' || raw === 'BUDGET_REPORT') {
    return raw;
  }
  if (raw === 'PAY_STUB') return 'PAY_STUB';
  return 'INVOICE';
}
