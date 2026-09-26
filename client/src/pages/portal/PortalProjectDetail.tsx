import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { portalApi } from '../../services/api';
import PortalStatusBadge from '../../components/portal/PortalStatusBadge';
import SanitizedBrief from '../../components/portal/SanitizedBrief';
import ProjectMessageThread from '../../components/portal/ProjectMessageThread';
import ProjectAssetsPanel from '../../components/projects/ProjectAssetsPanel';
import PortalProjectJumpLinks from '../../components/portal/PortalProjectJumpLinks';
import type {
  MessageComposeFromTask,
  PortalProjectDetailResponse,
  ProjectMessage,
} from '../../types';

function PortalProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [detail, setDetail] = useState<PortalProjectDetailResponse | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeFromTask, setComposeFromTask] = useState<MessageComposeFromTask | null>(
    null
  );

  const loadMessages = useCallback(async () => {
    if (!id) return;
    setMessagesLoading(true);
    try {
      const res = await portalApi.getMessages(id);
      setMessages(res.data || []);
    } catch {
      /* keep existing messages */
    } finally {
      setMessagesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    portalApi
      .getProject(id)
      .then((res) => {
        setDetail(res.data);
        setError(null);
      })
      .catch(() => setError('Project not found'))
      .finally(() => setLoading(false));
    loadMessages();
  }, [id, loadMessages]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(loadMessages, 60_000);
    return () => clearInterval(interval);
  }, [id, loadMessages]);

  useEffect(() => {
    if (loading || !detail) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    if (hash === 'messages' && messagesLoading) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, detail, location.hash, messagesLoading]);

  const handleSend = async (
    body: string,
    _clientVisible?: boolean,
    meta?: { projectTaskId?: string; replyToMessageId?: string }
  ) => {
    if (!id) return;
    const res = await portalApi.postMessage(id, body, meta);
    setMessages((prev) => [...prev, res.data]);
  };

  const handleMessageFromTask = (task: {
    _id: string;
    title: string;
  }) => {
    setComposeFromTask({
      projectTaskId: task._id,
      taskTitle: task.title,
      taskClientVisible: true,
    });
    document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-sage/30 border-t-brand-sage" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-neutral-600">{error || 'Project not found'}</p>
        <Link to="/portal/projects" className="mt-4 inline-block text-brand-sage underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const { project, tasks } = detail;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/portal/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-display-sm text-brand-charcoal">{project.title}</h1>
            {project.excerpt && (
              <p className="mt-1 text-neutral-600">{project.excerpt}</p>
            )}
          </div>
          <PortalStatusBadge kind="project" status={project.status} />
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Last updated {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="sticky top-0 z-20 mb-6 rounded-xl border border-neutral-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Jump to
        </p>
        <PortalProjectJumpLinks projectId={project._id} inPage />
      </div>

      <section id="brief" className="mb-8 scroll-mt-16 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Brief
        </h2>
        <SanitizedBrief
          html={project.brief}
          fallback={project.description}
        />
      </section>

      <section id="tasks" className="mb-8 scroll-mt-16 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Tasks
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            Your team hasn&apos;t shared task updates yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li
                key={t._id}
                className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-brand-charcoal">{t.title}</span>
                  <div className="flex items-center gap-1.5">
                    <PortalStatusBadge kind="task" status={t.status} />
                    <button
                      type="button"
                      onClick={() => handleMessageFromTask(t)}
                      className="rounded p-1 text-neutral-400 hover:bg-brand-sage/10 hover:text-brand-sage"
                      title="Comment on this task"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {t.description && (
                  <p className="mt-1 text-sm text-neutral-600">{t.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="files" className="mb-8 scroll-mt-16 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Files
        </h2>
        <ProjectAssetsPanel projectId={project._id} variant="portal" />
      </section>

      <section id="messages" className="scroll-mt-16 rounded-xl border border-neutral-200 bg-white p-6">
        <ProjectMessageThread
          messages={messages}
          loading={messagesLoading}
          onSend={handleSend}
          onRefresh={loadMessages}
          projectTitle={project.title}
          composeFromTask={composeFromTask}
          onClearComposeFromTask={() => setComposeFromTask(null)}
          emptyLabel="No messages yet — say hello to your team."
        />
      </section>
    </div>
  );
}

export default PortalProjectDetail;
