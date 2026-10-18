import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { portfolioPitchPublicApi } from '../services/api';
import { PortfolioImage } from '../components/public/PortfolioImage';
import type { PublicPortfolioPitch } from '../types';

function PitchPortfolio() {
  const { slug } = useParams<{ slug: string }>();
  const [pitch, setPitch] = useState<PublicPortfolioPitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMissing(false);

    portfolioPitchPublicApi
      .getBySlug(slug)
      .then((res) => {
        if (!cancelled) setPitch(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setPitch(null);
          setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-32">
        <div className="w-8 h-8 border-4 border-brand-sage/20 border-t-brand-sage rounded-full animate-spin" />
      </div>
    );
  }

  if (missing || !pitch) {
    return (
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container-public max-w-2xl">
          <p className="meta-label mb-3">Portfolio</p>
          <h1 className="font-display text-[2.125rem] leading-[1.08] sm:text-display-md lg:text-display-lg text-brand-charcoal mb-4 break-words">
            This page is not available
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 mb-8">
            The link may be unpublished or no longer active.
          </p>
          <Link to="/work" className="btn-brand-primary">
            View all work
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <section className="pt-24 pb-8 md:pt-32 md:pb-12">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="meta-label mb-3">Selected work</p>
            <h1 className="font-display text-[2.125rem] leading-[1.08] sm:text-display-md lg:text-display-lg text-brand-charcoal mb-4 md:mb-6 break-words">
              {pitch.title}
            </h1>
            {pitch.summary && (
              <p className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-2xl leading-relaxed whitespace-pre-line">
                {pitch.summary}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="md:container-public">
          <div className="flex flex-col gap-12 md:grid md:grid-cols-2 md:gap-8">
            {pitch.projects.map((project, index) => (
              <motion.div
                key={project.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05 }}
              >
                <Link to={`/work/${project.slug}`} className="group block min-w-0">
                  <div
                    className="relative aspect-[4/3] overflow-hidden md:rounded-lg md:mb-5"
                    style={{ backgroundColor: project.color + '10' }}
                  >
                    <PortfolioImage
                      src={project.featuredImage}
                      alt={project.title}
                      fallbackColor={project.color}
                      fallbackLabel={project.client}
                      className="md:group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-900/75 to-transparent px-6 py-5 md:px-5 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-sm font-mono uppercase tracking-wider text-white">
                        View project &rarr;
                      </span>
                    </div>
                  </div>
                  <div className="px-6 pt-4 md:px-0 md:pt-0">
                    <p className="meta-label text-brand-charcoal mb-1">{project.client}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                      {project.categories[0] && (
                        <>
                          <span className="meta-label">{project.categories[0]}</span>
                          <span className="meta-label text-neutral-300">&middot;</span>
                        </>
                      )}
                      <span className="meta-label">{project.year}</span>
                    </div>
                    <h2 className="font-display text-2xl md:text-xl font-bold text-brand-charcoal mb-2 break-words group-hover:text-brand-sage transition-colors">
                      {project.title}
                    </h2>
                    <p className="text-neutral-600 text-base md:text-sm leading-relaxed">
                      {project.excerpt}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PitchPortfolio;
