import { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { projectMessagesApi } from '../../services/api';
import ProjectMessageThread from '../portal/ProjectMessageThread';
import type { ProjectMessage } from '../../types';

interface ProjectMessagesPanelProps {
  projectId: string;
}

function ProjectMessagesPanel({ projectId }: ProjectMessagesPanelProps) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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
    if (expanded) loadMessages();
  }, [expanded, loadMessages]);

  const handleSend = async (body: string, clientVisible: boolean) => {
    const res = await projectMessagesApi.create(projectId, { body, clientVisible });
    setMessages((prev) => [...prev, res.data]);
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
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

      {expanded && (
        <div className="mt-3">
          <ProjectMessageThread
            messages={messages}
            loading={loading}
            onSend={handleSend}
            onRefresh={loadMessages}
            showVisibilityToggle
            emptyLabel="No messages on this project yet."
          />
        </div>
      )}
    </div>
  );
}

export default ProjectMessagesPanel;
