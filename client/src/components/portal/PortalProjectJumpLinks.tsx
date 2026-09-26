import { Link } from 'react-router-dom';

export const PORTAL_PROJECT_SECTIONS = [
  { id: 'brief', label: 'Brief' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'files', label: 'Files' },
  { id: 'messages', label: 'Messages' },
] as const;

interface PortalProjectJumpLinksProps {
  projectId: string;
  /** Use hash-only links when already on the project page. */
  inPage?: boolean;
  className?: string;
}

function PortalProjectJumpLinks({
  projectId,
  inPage = false,
  className = '',
}: PortalProjectJumpLinksProps) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}
      aria-label="Project sections"
    >
      {PORTAL_PROJECT_SECTIONS.map((section) => {
        const classNames = `text-xs font-medium ${
          section.id === 'messages'
            ? 'text-brand-sage hover:underline'
            : 'text-neutral-500 hover:text-brand-charcoal'
        }`;

        if (inPage) {
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={classNames}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(section.id);
                window.history.replaceState(
                  null,
                  '',
                  `${window.location.pathname}#${section.id}`
                );
              }}
            >
              {section.label}
            </a>
          );
        }

        return (
          <Link
            key={section.id}
            to={`/portal/projects/${projectId}#${section.id}`}
            className={classNames}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default PortalProjectJumpLinks;
