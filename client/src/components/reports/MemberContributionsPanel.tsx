import { useMemo, useState } from 'react';
import { Users, ArrowUpDown, ArrowDownUp } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';
import type { CostBreakdownEntry } from '../../types';

interface MemberContributionsPanelProps {
  costBreakdown: CostBreakdownEntry[];
  totalBilled?: number;
  totalEarned?: number;
  totalMargin?: number;
}

type SortKey = 'userName' | 'hours' | 'billed' | 'earned' | 'margin';

export function MemberContributionsPanel({
  costBreakdown,
  totalBilled = 0,
  totalEarned = 0,
  totalMargin = 0,
}: MemberContributionsPanelProps) {
  const [memberFilter, setMemberFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('userName');
  const [sortDesc, setSortDesc] = useState(false);

  const uniqueMembers = useMemo(() => {
    const names = new Set(costBreakdown.map((r) => r.userName));
    return Array.from(names).sort();
  }, [costBreakdown]);

  const memberTotals = useMemo(() => {
    const byMember = new Map<
      string,
      { hours: number; billed: number; earned: number; margin: number }
    >();
    for (const row of costBreakdown) {
      const key = row.userName;
      if (memberFilter && key !== memberFilter) continue;
      const cur = byMember.get(key) || {
        hours: 0,
        billed: 0,
        earned: 0,
        margin: 0,
      };
      cur.hours += row.hours;
      cur.billed += row.billed;
      cur.earned += row.earned;
      cur.margin += row.margin;
      byMember.set(key, cur);
    }
    return Array.from(byMember.entries()).map(([name, vals]) => ({
      userName: name,
      ...vals,
    }));
  }, [costBreakdown, memberFilter]);

  const sortedTotals = useMemo(() => {
    const arr = [...memberTotals];
    arr.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a] ?? 0;
      const bVal = b[sortBy as keyof typeof b] ?? 0;
      const cmp = typeof aVal === 'string'
        ? (aVal as string).localeCompare(bVal as string)
        : (aVal as number) - (bVal as number);
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [memberTotals, sortBy, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDesc((d) => !d);
    else {
      setSortBy(key);
      setSortDesc(key === 'userName' ? false : true);
    }
  };

  if (!costBreakdown.length) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Users className="w-5 h-5" />
          <p>No member contribution data for this period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-bold text-gray-900">
            Member Contributions
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          For payment stubs and team allocation
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Filter by member
          </label>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="input text-sm max-w-[200px]"
          >
            <option value="">All members</option>
            {uniqueMembers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2">
                <button
                  onClick={() => toggleSort('userName')}
                  className="flex items-center gap-1 font-bold text-gray-600 hover:text-gray-900"
                >
                  Member
                  {sortBy === 'userName' ? (sortDesc ? <ArrowDownUp className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />) : null}
                </button>
              </th>
              <th className="text-right py-2">
                <button
                  onClick={() => toggleSort('hours')}
                  className="ml-auto flex items-center gap-1 font-bold text-gray-600 hover:text-gray-900"
                >
                  Hours
                  {sortBy === 'hours' ? (sortDesc ? <ArrowDownUp className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />) : null}
                </button>
              </th>
              <th className="text-right py-2">
                <button
                  onClick={() => toggleSort('billed')}
                  className="ml-auto flex items-center gap-1 font-bold text-gray-600 hover:text-gray-900"
                >
                  Billed
                  {sortBy === 'billed' ? (sortDesc ? <ArrowDownUp className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />) : null}
                </button>
              </th>
              <th className="text-right py-2">
                <button
                  onClick={() => toggleSort('earned')}
                  className="ml-auto flex items-center gap-1 font-bold text-gray-600 hover:text-gray-900"
                >
                  Earned
                  {sortBy === 'earned' ? (sortDesc ? <ArrowDownUp className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />) : null}
                </button>
              </th>
              <th className="text-right py-2">
                <button
                  onClick={() => toggleSort('margin')}
                  className="ml-auto flex items-center gap-1 font-bold text-gray-600 hover:text-gray-900"
                >
                  Margin
                  {sortBy === 'margin' ? (sortDesc ? <ArrowDownUp className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />) : null}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTotals.map((row) => (
              <tr key={row.userName} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 font-medium text-gray-900">{row.userName}</td>
                <td className="py-2.5 text-right text-gray-700">{row.hours.toFixed(2)}</td>
                <td className="py-2.5 text-right text-gray-700">{formatCurrency(row.billed)}</td>
                <td className="py-2.5 text-right text-gray-600">{formatCurrency(row.earned)}</td>
                <td className="py-2.5 text-right font-medium text-green-600">
                  {formatCurrency(row.margin)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-bold">
              <td className="py-3">Total</td>
              <td className="py-3 text-right">
                {sortedTotals.reduce((s, r) => s + r.hours, 0).toFixed(2)}
              </td>
              <td className="py-3 text-right">{formatCurrency(totalBilled)}</td>
              <td className="py-3 text-right">{formatCurrency(totalEarned)}</td>
              <td className="py-3 text-right text-green-600">{formatCurrency(totalMargin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
