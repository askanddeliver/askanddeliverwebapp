import { useCallback, useEffect, useRef } from 'react';

function sectionIsVisible(el: HTMLElement | null): boolean {
  if (window.location.hash.replace('#', '') === 'messages') return true;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

/** Mark a project thread read when the messages section is actually on screen. */
export function useMarkProjectMessagesRead(
  projectId: string | undefined,
  markRead: (projectId: string) => Promise<unknown>
) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const markIfVisible = useCallback(() => {
    if (!projectId) return;
    if (!sectionIsVisible(sectionRef.current)) return;
    void markRead(projectId).catch(() => undefined);
  }, [projectId, markRead]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !projectId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void markRead(projectId).catch(() => undefined);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [projectId, markRead]);

  useEffect(() => {
    const onHash = () => markIfVisible();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [markIfVisible]);

  return { sectionRef, markIfVisible };
}
