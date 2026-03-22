import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicPortfolio } from '../hooks/usePublicPortfolio';
import { PortfolioImage } from '../components/public/PortfolioImage';
import type { PortfolioProject } from '../types';

function PortfolioCard({ project, index }: { project: PortfolioProject; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Link to={`/work/${project.slug}`} className="group block">
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-lg mb-5"
          style={{ backgroundColor: project.color + '10' }}
        >
          <PortfolioImage
            src={project.featuredImage}
            alt={project.title}
            fallbackColor={project.color}
            fallbackLabel={project.client}
            className="group-hover:scale-105 transition-transform duration-700"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-5 left-5 text-white">
              <span className="text-sm font-mono uppercase tracking-wider">
                View Project &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* Project info */}
        <div className="flex items-center gap-2 mb-2">
          {project.categories[0] && (
            <span className="meta-label">{project.categories[0]}</span>
          )}
          {project.categories.length > 1 && (
            <span className="meta-label text-neutral-400">
              +{project.categories.length - 1}
            </span>
          )}
          <span className="meta-label text-neutral-300">&middot;</span>
          <span className="meta-label">{project.year}</span>
        </div>

        <h3 className="font-display text-xl font-bold text-brand-charcoal mb-2 group-hover:text-brand-sage transition-colors">
          {project.title}
        </h3>

        <p className="text-neutral-600 text-sm leading-relaxed">
          {project.excerpt}
        </p>
      </Link>
    </motion.div>
  );
}

function Work() {
  const { projects: portfolioProjects, loading } = usePublicPortfolio();
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const allCategories = useMemo(
    () =>
      Array.from(new Set(portfolioProjects.flatMap((p) => p.categories))).sort(),
    [portfolioProjects]
  );

  const filteredProjects =
    activeFilter === 'All'
      ? portfolioProjects
      : portfolioProjects.filter((p) => p.categories.includes(activeFilter));

  const featuredProjects = filteredProjects.filter((p) => p.featured);
  const otherProjects = filteredProjects.filter((p) => !p.featured);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-32">
        <div className="w-8 h-8 border-4 border-brand-sage/20 border-t-brand-sage rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="pt-32 pb-12">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="meta-label mb-3">Portfolio</p>
            <h1 className="font-display text-display-lg text-brand-charcoal mb-6">
              Selected Work
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl leading-relaxed">
              From brand strategy to experiential design, we collaborate with
              clients across industries to create meaningful impact.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="pb-8">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap gap-2"
          >
            <button
              onClick={() => setActiveFilter('All')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                activeFilter === 'All'
                  ? 'bg-brand-sage text-white'
                  : 'bg-white text-neutral-600 hover:text-brand-sage hover:bg-brand-sage/5 border border-neutral-200'
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                  activeFilter === cat
                    ? 'bg-brand-sage text-white'
                    : 'bg-white text-neutral-600 hover:text-brand-sage hover:bg-brand-sage/5 border border-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <section className="pb-16">
          <div className="container-public">
            <h2 className="meta-label mb-8">Featured Projects</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter + '-featured'}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {featuredProjects.map((project, index) => (
                  <PortfolioCard key={project.slug} project={project} index={index} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* All Projects */}
      {otherProjects.length > 0 && (
        <section className="section-public bg-white">
          <div className="container-public">
            <h2 className="meta-label mb-8">All Projects</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter + '-all'}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {otherProjects.map((project, index) => (
                  <PortfolioCard key={project.slug} project={project} index={index} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}

export default Work;
