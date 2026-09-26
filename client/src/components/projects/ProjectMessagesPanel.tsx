import { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { projectMessagesApi } from '../../services/api';
import ProjectMessageThread from '../portal/ProjectMessageThread';
import type { MessageComposeFromTask, ProjectMessage } from '../../types';

interface ProjectMessagesPanelProps {
  projectId: string;
  projectTitle?: string;
  memberMode?: boolean;
  defaultExpanded?: boolean;
  hideToggle?: boolean;
  composeFromTask?: MessageComposeFromTask | null;
  onClearComposeFromTask?: () => void;
}

function ProjectMessagesPanel({
  projectId,
  projectTitle,
  defaultExpanded = false,
  hideToggle = false,
  composeFromTask = null,
  onClearComposeFromTask,
}: ProjectMessagesPanelProps) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded || hideToggle);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectMessagesApi.list(projectId);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (expanded || hideToggle) loadMessages();
  }, [expanded, hideToggle, loadMessages]);

  useEffect(() => {
    if (composeFromTask) setExpanded(true);
  }, [composeFromTask]);

  const handleSend = async (
    body: string,
    clientVisible: boolean,
    meta?: { projectTaskId?: string }
  ) => {
    const res = await projectMessagesApi.create(projectId, {
      body,
      clientVisible,
      projectTaskId: meta?.projectTaskId,
    });
    setMessages((prev) => [...prev, res.data]);
  };

  const handleToggleVisibility = async (messageId: string, clientVisible: boolean) => {
    const res = await projectMessagesApi.updateVisibility(
      projectId,
      messageId,
      clientVisible
    );
    setMessages((prev) => prev.map((m) => (m._id === messageId ? res.data : m)));
  };

  return (
    <div className={hideToggle ? '' : 'mt-4 border-t border-gray-100 pt-4'}>
      {!hideToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
        >
          <MessageSquare className="h-4 w-4" />
          Messages
          {messages.length > 0 && (
            <span className="text-xs font-normal text-gray-500">({messages.length})</span>
          )}
        </button>
      )}

      {(expanded || hideToggle) && (
        <div className={hideToggle ? '' : 'mt-3'}>
          <ProjectMessageThread
            messages={messages}
            loading={loading}
            onSend={handleSend}
            onRefresh={loadMessages}
            showVisibilityToggle
            onToggleVisibility={handleToggleVisibility}
            composeFromTask={composeFromTask}
            onClearComposeFromTask={onClearComposeFromTask}
            projectTitle={projectTitle}
            linkTaskChips
            emptyLabel="No messages on this project yet."
          />
        </div>
      )}
    </div>
  );
}

export default ProjectMessagesPanel;
