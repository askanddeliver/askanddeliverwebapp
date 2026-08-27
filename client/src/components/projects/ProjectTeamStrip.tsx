import type { ProjectAssignedMember } from '../../types';

interface ProjectTeamStripProps {
  members: ProjectAssignedMember[];
  canEdit: boolean;
  onEditAssignments?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProjectTeamStrip({
  members,
  canEdit,
  onEditAssignments,
}: ProjectTeamStripProps) {
  if (members.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm italic text-[var(--admin-text-3)]">
          No members assigned yet.
        </p>
        {canEdit && onEditAssignments && (
          <button type="button" onClick={onEditAssignments} className="link text-sm">
            Assign members
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ul className="flex flex-wrap items-center gap-3">
        {members.map((m) => (
          <li key={m.auth0Id} className="flex items-center gap-2">
            {m.picture ? (
              <img
                src={m.picture}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                {initials(m.name)}
              </span>
            )}
            <span className="text-sm text-[var(--admin-text)]">{m.name}</span>
          </li>
        ))}
      </ul>
      {canEdit && onEditAssignments && (
        <button type="button" onClick={onEditAssignments} className="link text-sm">
          Edit assignments
        </button>
      )}
    </div>
  );
}
