import type { ProjectAssignedMember, ProjectMessageNotifyMode } from '../../types';

interface MessageNotifyPickerProps {
  mode: ProjectMessageNotifyMode;
  onModeChange: (mode: ProjectMessageNotifyMode) => void;
  mentionable: ProjectAssignedMember[];
  mentionedIds: string[];
  onMentionedIdsChange: (ids: string[]) => void;
  currentUserAuth0Id?: string;
  disabled?: boolean;
}

const MODES: { id: ProjectMessageNotifyMode; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'mentions', label: '@' },
  { id: 'team', label: 'Team' },
];

function MessageNotifyPicker({
  mode,
  onModeChange,
  mentionable,
  mentionedIds,
  onMentionedIdsChange,
  currentUserAuth0Id,
  disabled = false,
}: MessageNotifyPickerProps) {
  const candidates = mentionable.filter((m) => m.auth0Id !== currentUserAuth0Id);
  const canMention = candidates.length > 0;

  const toggleMention = (auth0Id: string) => {
    if (mentionedIds.includes(auth0Id)) {
      onMentionedIdsChange(mentionedIds.filter((id) => id !== auth0Id));
    } else {
      onMentionedIdsChange([...mentionedIds, auth0Id]);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-neutral-500">Notify</span>
        {MODES.map(({ id, label }) => {
          const isActive = mode === id;
          const isDisabled = disabled || (id === 'mentions' && !canMention);
          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              onClick={() => onModeChange(id)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-400 hover:text-primary-800'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {mode === 'mentions' && canMention && (
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((person) => {
            const selected = mentionedIds.includes(person.auth0Id);
            return (
              <button
                key={person.auth0Id}
                type="button"
                disabled={disabled}
                onClick={() => toggleMention(person.auth0Id)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  selected
                    ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-300'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {person.name}
              </button>
            );
          })}
        </div>
      )}
      {mode === 'none' && (
        <p className="text-[11px] text-neutral-400">Posts to this thread without emailing the team.</p>
      )}
    </div>
  );
}

export default MessageNotifyPicker;
