import type { LucideIcon } from 'lucide-react';
import {
  Clock,
  FileText,
  FolderOpen,
  ListTodo,
  MessageSquare,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ProjectJumpSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const PORTAL_JUMP_SECTIONS: ProjectJumpSection[] = [
  { id: 'brief', label: 'Brief', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

export function hubJumpSections(includeBudget: boolean): ProjectJumpSection[] {
  const sections: ProjectJumpSection[] = [
    { id: 'team', label: 'Team', icon: Users },
    { id: 'brief', label: 'Brief', icon: FileText },
  ];
  if (includeBudget) {
    sections.push({ id: 'budget', label: 'Budget', icon: Wallet });
  }
  sections.push(
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'entries', label: 'Time', icon: Clock },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  );
  return sections;
}

interface ProjectJumpNavProps {
  sections: ProjectJumpSection[];
  /** When set, off-page links go to `${hrefPrefix}#id`. */
  hrefPrefix?: string;
  /** Hash-only links that scroll the current page. */
  inPage?: boolean;
  tone?: 'portal' | 'admin';
  className?: string;
}

function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function ProjectJumpNav({
  sections,
  hrefPrefix,
  inPage = false,
  tone = 'portal',
  className = '',
}: ProjectJumpNavProps) {
  const isAdmin = tone === 'admin';

  const chipClass = (id: string) => {
    const emphasized = id === 'messages';
    if (isAdmin) {
      return emphasized
        ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
        : 'border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)] hover:border-primary-400 hover:bg-primary-50 hover:text-primary-800';
    }
    return emphasized
      ? 'border-brand-sage bg-brand-sage text-white hover:bg-brand-sage-dark'
      : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-sage hover:bg-brand-sage/10 hover:text-brand-sage-dark';
  };

  const items = sections.map((section) => {
    const Icon = section.icon;
    const classNameChip = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors ${chipClass(section.id)}`;

    if (inPage) {
      return (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={classNameChip}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(section.id);
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}${window.location.search}#${section.id}`
            );
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          {section.label}
        </a>
      );
    }

    const to = `${hrefPrefix || ''}#${section.id}`;
    return (
      <Link key={section.id} to={to} className={classNameChip}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {section.label}
      </Link>
    );
  });

  return (
    <nav className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Project sections">
      {items}
    </nav>
  );
}

export default ProjectJumpNav;
