import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Reply, Send, X } from 'lucide-react';
import type { MessageComposeFromTask, ProjectMessage } from '../../types';

export type MessageSendMeta = { projectTaskId?: string; replyToMessageId?: string };

interface ProjectMessageThreadProps {
  messages: ProjectMessage[];
  loading?: boolean;
  onSend: (
    body: string,
    clientVisible: boolean,
    meta?: MessageSendMeta
  ) => Promise<void>;
  onRefresh?: () => void;
  /** Admin/member compose — show visibility toggle */
  showVisibilityToggle?: boolean;
  onToggleVisibility?: (messageId: string, clientVisible: boolean) => Promise<void>;
  composeFromTask?: MessageComposeFromTask | null;
  onClearComposeFromTask?: () => void;
  projectTitle?: string;
  /** When true, task chips deep-link to #tasks (hub). Portal keeps them static. */
  linkTaskChips?: boolean;
  emptyLabel?: string;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function roleBadge(role: ProjectMessage['authorRole']): string {
  switch (role) {
    case 'client':
      return 'Client';
    case 'admin':
      return 'Team';
    default:
      return 'Team';
  }
}

function TaskChip({
  taskTitle,
  projectTitle,
  link,
}: {
  taskTitle: string;
  projectTitle?: string;
  link: boolean;
}) {
  const label = projectTitle ? `${projectTitle} · ${taskTitle}` : taskTitle;
  const className =
    'inline-flex max-w-full items-center truncate rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700';

  if (link) {
    return (
      <a href="#tasks" className={`${className} hover:bg-primary-50 hover:text-primary-800`}>
        {label}
      </a>
    );
  }

  return <span className={className}>{label}</span>;
}

/** Quote of the immediate parent only — never walks further up the chain. */
function ReplyPreview({
  parent,
  onClear,
}: {
  parent: ProjectMessage;
  onClear?: () => void;
}) {
  return (
    <div className="relative rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
      <p className="text-[11px] font-medium text-neutral-600">
        Replying to {parent.authorName}
      </p>
      <p className="line-clamp-2 whitespace-pre-wrap text-xs text-neutral-500">{parent.body}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1 top-1 rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
          aria-label="Cancel reply"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function ProjectMessageThread({
  messages,
  loading = false,
  onSend,
  onRefresh,
  showVisibilityToggle = false,
  onToggleVisibility,
  composeFromTask = null,
  onClearComposeFromTask,
  projectTitle,
  linkTaskChips = false,
  emptyLabel = 'No messages yet.',
}: ProjectMessageThreadProps) {
  const [body, setBody] = useState('');
  const [clientVisible, setClientVisible] = useState(false);
  const [replyTo, setReplyTo] = useState<ProjectMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const messagesById = useMemo(() => {
    const map = new Map<string, ProjectMessage>();
    for (const m of messages) map.set(m._id, m);
    return map;
  }, [messages]);

  useEffect(() => {
    if (!composeFromTask) return;
    setClientVisible(Boolean(composeFromTask.taskClientVisible));
  }, [composeFromTask]);

  const confirmClientSeesTaskName = (): boolean => {
    return window.confirm('The client will see this task name.');
  };

  const startReply = (message: ProjectMessage) => {
    setReplyTo(message);
    if (showVisibilityToggle) setClientVisible(Boolean(message.clientVisible));
    composeRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    const nextVisible = showVisibilityToggle ? clientVisible : true;
    if (
      nextVisible &&
      composeFromTask &&
      !composeFromTask.taskClientVisible &&
      !confirmClientSeesTaskName()
    ) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      await onSend(text, nextVisible, {
        projectTaskId: composeFromTask?.projectTaskId,
        replyToMessageId: replyTo?._id,
      });
      setBody('');
      setReplyTo(null);
      if (showVisibilityToggle) setClientVisible(false);
      onClearComposeFromTask?.();
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleToggle = async (message: ProjectMessage) => {
    if (!onToggleVisibility) return;
    const next = !message.clientVisible;
    if (next && message.taskTitle && !confirmClientSeesTaskName()) return;

    setTogglingId(message._id);
    setError(null);
    try {
      await onToggleVisibility(message._id, next);
    } catch {
      setError('Failed to update visibility');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Messages</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-brand-charcoal"
            title="Refresh messages"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sage/30 border-t-brand-sage" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => {
            const parent = m.replyToMessageId
              ? messagesById.get(String(m.replyToMessageId))
              : undefined;
            return (
              <li
                key={m._id}
                className={`rounded-lg border px-3 py-2.5 ${
                  m.authorRole === 'client'
                    ? 'border-brand-sage/25 bg-brand-sage/5'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700">{m.authorName}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {roleBadge(m.authorRole)}
                  </span>
                  {showVisibilityToggle && m.authorRole !== 'client' && (
                    onToggleVisibility ? (
                      <button
                        type="button"
                        onClick={() => handleToggle(m)}
                        disabled={togglingId === m._id}
                        title={
                          m.clientVisible
                            ? 'Visible to client — click to make internal'
                            : 'Internal — click to share with client'
                        }
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          m.clientVisible
                            ? 'bg-primary-50 text-primary-800 hover:bg-primary-100'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {m.clientVisible ? 'Visible to client' : 'Internal'}
                      </button>
                    ) : (
                      !m.clientVisible && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                          Internal
                        </span>
                      )
                    )
                  )}
                  <span>{formatWhen(m.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => startReply(m)}
                    className="ml-auto inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                </div>
                {parent && (
                  <div className="mb-2">
                    <ReplyPreview parent={parent} />
                  </div>
                )}
                {m.taskTitle && (
                  <div className="mb-1.5">
                    <TaskChip
                      taskTitle={m.taskTitle}
                      projectTitle={projectTitle}
                      link={linkTaskChips}
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm text-neutral-800">{m.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 pt-3">
        {composeFromTask && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-800">
              <span className="truncate">
                {projectTitle ? `${projectTitle} · ` : ''}
                {composeFromTask.taskTitle}
              </span>
              {onClearComposeFromTask && (
                <button
                  type="button"
                  onClick={onClearComposeFromTask}
                  className="rounded-full p-0.5 hover:bg-primary-100"
                  aria-label="Clear task context"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          </div>
        )}
        {replyTo && (
          <div className="mb-2">
            <ReplyPreview parent={replyTo} onClear={() => setReplyTo(null)} />
          </div>
        )}
        <textarea
          ref={composeRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="input w-full text-sm"
          placeholder={
            composeFromTask
              ? `Write a message about “${composeFromTask.taskTitle}”…`
              : replyTo
                ? `Reply to ${replyTo.authorName}…`
                : 'Write a message…'
          }
          disabled={sending}
        />
        {showVisibilityToggle && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="rounded border-neutral-300"
            />
            Visible to client portal
          </label>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectMessageThread;
