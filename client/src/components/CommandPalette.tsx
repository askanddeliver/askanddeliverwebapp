import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Search, Users, X } from 'lucide-react';
import { clientsApi, projectsApi } from '../services/api';
import type { Client, Project } from '../types';

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => {},
  close: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

type ResultItem =
  | { kind: 'project'; id: string; label: string; sub?: string; to: string }
  | { kind: 'client'; id: string; label: string; sub?: string; to: string };

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    if (!isOpen || loaded) return;
    Promise.all([projectsApi.getAll(), clientsApi.getAll()])
      .then(([pRes, cRes]) => {
        setProjects(pRes.data || []);
        setClients(cRes.data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isOpen, loaded]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: ResultItem[] = [];

    for (const p of projects) {
      if (p.title.toLowerCase().includes(q)) {
        items.push({
          kind: 'project',
          id: p._id,
          label: p.title,
          sub: typeof p.clientId === 'object' ? p.clientId.name : undefined,
          to: '/projects',
        });
      }
    }

    for (const c of clients) {
      const hay = `${c.name} ${c.company || ''}`.toLowerCase();
      if (hay.includes(q)) {
        items.push({
          kind: 'client',
          id: c._id,
          label: c.name,
          sub: c.company,
          to: '/clients',
        });
      }
    }

    return items.slice(0, 12);
  }, [query, projects, clients]);

  const handleSelect = (item: ResultItem) => {
    close();
    navigate(item.to);
  };

  return (
    <CommandPaletteContext.Provider value={{ open, close }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]">
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderColor: 'var(--admin-border)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div
              className="flex items-center gap-2 border-b px-3"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <Search className="h-4 w-4 shrink-0 text-[var(--admin-text-3)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects and clients…"
                className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm outline-none text-[var(--admin-text)] placeholder:text-[var(--admin-text-3)]"
              />
              <button
                type="button"
                onClick={close}
                className="rounded p-1 text-[var(--admin-text-3)] hover:bg-[var(--admin-app-bg)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto py-2">
              {query.trim() === '' ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--admin-text-3)]">
                  Type to search projects and clients
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--admin-text-3)]">
                  No matches
                </p>
              ) : (
                <ul>
                  {results.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--admin-app-bg)]"
                      >
                        {item.kind === 'project' ? (
                          <FolderOpen className="h-4 w-4 shrink-0 text-[var(--admin-text-3)]" />
                        ) : (
                          <Users className="h-4 w-4 shrink-0 text-[var(--admin-text-3)]" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--admin-text)]">
                            {item.label}
                          </div>
                          {item.sub && (
                            <div className="truncate text-xs text-[var(--admin-text-3)]">
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  );
}
