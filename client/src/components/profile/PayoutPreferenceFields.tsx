import type { PayoutMethod, UserPayoutPreference } from '../../types';
import {
  PAYOUT_HANDLE_PLACEHOLDERS,
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABELS,
} from '../../utils/payout';

interface PayoutPreferenceFieldsProps {
  value: UserPayoutPreference | null;
  onChange: (next: UserPayoutPreference | null) => void;
  idPrefix?: string;
}

export function PayoutPreferenceFields({
  value,
  onChange,
  idPrefix = 'payout',
}: PayoutPreferenceFieldsProps) {
  const method = value?.method || '';
  const handle = value?.handle || '';
  const notes = value?.notes || '';

  const setMethod = (next: PayoutMethod | '') => {
    if (!next) {
      onChange(null);
      return;
    }
    onChange({
      method: next,
      handle,
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-method`} className="mb-1 block text-sm font-medium text-gray-700">
          Method
        </label>
        <select
          id={`${idPrefix}-method`}
          value={method}
          onChange={(e) => setMethod(e.target.value as PayoutMethod | '')}
          className="input max-w-xs"
        >
          <option value="">Choose…</option>
          {PAYOUT_METHODS.map((id) => (
            <option key={id} value={id}>
              {PAYOUT_METHOD_LABELS[id]}
            </option>
          ))}
        </select>
      </div>
      {method && (
        <>
          <div>
            <label htmlFor={`${idPrefix}-handle`} className="mb-1 block text-sm font-medium text-gray-700">
              Handle or email
            </label>
            <input
              id={`${idPrefix}-handle`}
              type="text"
              value={handle}
              onChange={(e) =>
                onChange({
                  method: method as PayoutMethod,
                  handle: e.target.value,
                  notes: notes || undefined,
                })
              }
              className="input max-w-md"
              placeholder={PAYOUT_HANDLE_PLACEHOLDERS[method as PayoutMethod]}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              PayPal email, Zelle phone/email, or Venmo @name — not routing or account numbers.
            </p>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-notes`} className="mb-1 block text-sm font-medium text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-notes`}
              type="text"
              value={notes}
              onChange={(e) =>
                onChange({
                  method: method as PayoutMethod,
                  handle,
                  notes: e.target.value || undefined,
                })
              }
              className="input max-w-md"
              placeholder="Name on the account, etc."
              maxLength={200}
            />
          </div>
        </>
      )}
    </div>
  );
}
