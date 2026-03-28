import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const mdComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} className="text-[var(--prop-accent)] underline break-all" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

interface ProposalMarkdownBodyProps {
  content: string;
  className?: string;
}

export function ProposalMarkdownBody({ content, className = '' }: ProposalMarkdownBodyProps) {
  const src = content?.trim() ? content : '_No content yet._';

  return (
    <div className={`proposal-md text-gray-700 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {src}
      </ReactMarkdown>
    </div>
  );
}
