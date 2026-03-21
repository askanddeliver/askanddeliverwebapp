import { useState, useEffect } from 'react';
import { portfolioPublicApi } from '../services/api';
import { portfolioProjects as staticProjects } from '../data/portfolioProjects';
import type { PortfolioProject } from '../types';
import type { PortfolioProject as StaticPortfolioProject } from '../data/portfolioProjects';

/**
 * Adapts the static data format (no _id, no published, no order) to match
 * the API response format so components can work with either source.
 */
function adaptStaticProject(p: StaticPortfolioProject, index: number): PortfolioProject {
  return {
    _id: p.slug, // Use slug as a pseudo-id for static data
    slug: p.slug,
    title: p.title,
    client: p.client,
    excerpt: p.excerpt,
    description: p.description,
    categories: p.categories,
    disciplines: p.disciplines,
    year: p.year,
    featuredImage: p.featuredImage,
    clientLogo: '',
    images: p.images,
    challenge: p.challenge,
    solution: p.solution,
    results: p.results,
    testimonial: p.testimonial,
    liveUrl: p.liveUrl,
    featured: p.featured,
    published: true,
    color: p.color,
    order: index,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches published portfolio projects from the API.
 * Falls back to static data if the API is unavailable or returns empty.
 */
export function usePublicPortfolio() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromApi, setIsFromApi] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        const res = await portfolioPublicApi.getAll();
        if (!cancelled && res.data && res.data.length > 0) {
          setProjects(res.data);
          setIsFromApi(true);
        } else if (!cancelled) {
          // API returned empty — fall back to static
          setProjects(staticProjects.map(adaptStaticProject));
          setIsFromApi(false);
        }
      } catch {
        // API unavailable — fall back to static
        if (!cancelled) {
          setProjects(staticProjects.map(adaptStaticProject));
          setIsFromApi(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading, isFromApi };
}

/**
 * Fetches a single portfolio project by slug from the API.
 * Falls back to static data if unavailable.
 */
export function usePublicPortfolioProject(slug: string | undefined) {
  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProject() {
      try {
        const res = await portfolioPublicApi.getBySlug(slug!);
        if (!cancelled && res.data) {
          setProject(res.data);
        } else if (!cancelled) {
          // Fall back to static
          const staticMatch = staticProjects.find((p) => p.slug === slug);
          setProject(staticMatch ? adaptStaticProject(staticMatch, 0) : null);
        }
      } catch {
        if (!cancelled) {
          const staticMatch = staticProjects.find((p) => p.slug === slug);
          setProject(staticMatch ? adaptStaticProject(staticMatch, 0) : null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProject();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { project, loading };
}
