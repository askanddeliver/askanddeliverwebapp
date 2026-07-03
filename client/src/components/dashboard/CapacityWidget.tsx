import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { AdminPanel } from '../admin/AdminPanel';
import type { DashboardCapacityResponse } from '../../types';

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

interface CapacityWidgetProps {
  capacity: DashboardCapacityResponse | null;
}

function CapacityWidget({ capacity }: CapacityWidgetProps) {
  const members = capacity?.members ?? [];
  const totals = capacity?.totals;

  return (
    <AdminPanel
      title="Team capacity"
      headerActions={
        <Link to="/users" className="link text-sm font-medium">
          Team
        </Link>
      }
    >
      {members.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-3)]">
          No active members. Add team members to track capacity.
        </p>
      ) : (
        <>
          {totals && (
            <div className="mb-4 flex flex-wrap gap-3 text-sm text-[var(--admin-text-2)]">
              <span>
                <span className="font-mono font-semibold text-[var(--admin-text)]">
                  {totals.declaredHoursPerWeek}
                </span>{' '}
                hrs/wk declared
              </span>
              <span>
                <span className="font-mono font-semibold text-[var(--admin-text)]">
                  {totals.loggedHoursThisWeek}
                </span>{' '}
                hrs logged this week
              </span>
              <span>
                <span className="font-mono font-semibold text-[var(--admin-text)]">
                  {totals.assignedOpenTasks}
                </span>{' '}
                open assigned tasks
              </span>
            </div>
          )}

          <ul className="divide-y divide-[var(--admin-border)]">
            {members.map((member) => (
              <li key={member.auth0Id} className="flex items-start gap-3 py-2.5 first:pt-0">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-text-3)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--admin-text)]">
                    {member.name}
                    {member.outOfOffice && (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        OOO
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--admin-text-3)]">
                    {member.hoursPerWeek != null ? `${member.hoursPerWeek} hrs/wk` : 'No availability set'}
                    {member.preferredDays && member.preferredDays.length > 0 && (
                      <> · {member.preferredDays.map((d) => DAY_LABELS[d] || d).join(', ')}</>
                    )}
                  </p>
                  <p className="text-xs text-[var(--admin-text-3)]">
                    {member.loggedHoursThisWeek}h logged
                    {member.assignedProjectCount > 0 && (
                      <> · {member.assignedProjectCount} project{member.assignedProjectCount === 1 ? '' : 's'}</>
                    )}
                    {member.openTaskCount > 0 && (
                      <> · {member.openTaskCount} task{member.openTaskCount === 1 ? '' : 's'} ({member.assignedEstimatedHours}h est.)</>
                    )}
                    {member.scheduledBlockHoursThisWeek > 0 && (
                      <> · {member.scheduledBlockHoursThisWeek}h scheduled</>
                    )}
                  </p>
                  {member.utilizationPercent != null && member.hoursPerWeek != null && member.hoursPerWeek > 0 && (
                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          member.utilizationPercent >= 90
                            ? 'bg-red-500'
                            : member.utilizationPercent >= 70
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${member.utilizationPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPanel>
  );
}

export default CapacityWidget;
