interface UnreadCountBadgeProps {
  count?: number;
  /** Admin/member cards vs portal cards */
  tone?: 'admin' | 'portal';
  className?: string;
}

export function formatUnreadCount(count: number): string | null {
  if (!count || count < 1) return null;
  return count > 9 ? '9+' : String(count);
}

function UnreadCountBadge({
  count = 0,
  tone = 'admin',
  className = '',
}: UnreadCountBadgeProps) {
  const label = formatUnreadCount(count);
  if (!label) return null;

  const color =
    tone === 'portal' ? 'bg-brand-sage text-white' : 'bg-primary-600 text-white';

  return (
    <span
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${color} ${className}`}
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      {label}
    </span>
  );
}

export default UnreadCountBadge;
