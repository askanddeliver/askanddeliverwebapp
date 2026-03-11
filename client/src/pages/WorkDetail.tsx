import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { usePublicPortfolio, usePublicPortfolioProject } from '../hooks/usePublicPortfolio';
import { PortfolioImage } from '../components/public/PortfolioImage';
import { PortfolioMedia } from '../components/public/PortfolioMedia';
import { Lightbox, ZoomHint } from '../components/public/Lightbox';
import type { LightboxImage } from '../components/public/Lightbox';

function WorkDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { project, loading } = usePublicPortfolioProject(slug);
  const { projects: allProjects } = usePublicPortfolio();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Build combined media list for lightbox (images + videos in carousel)
  const allMedia: LightboxImage[] = useMemo(() => {
    if (!project) return [];
    const items: LightboxImage[] = [];
    if (project.featuredImage) {
      items.push({ url: project.featuredImage, caption: project.title });
    }
    project.images.forEach((img) => {
      if (img.url) {
        items.push({
          url: img.url,
          caption: img.caption,
          type: img.type === 'video' || img.source === 'vimeo' || img.source === 'youtube' ? 'video' : undefined,
          source: img.source,
        });
      }
    });
    return items;
  }, [project]);

  const openLightbox = (index: number) => {
    setLightboxIndex(Math.max(0, Math.min(index, allMedia.length - 1)));
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-32">
        <div className="w-8 h-8 border-4 border-brand-sage/20 border-t-brand-sage rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return <Navigate to="/work" replace />;
  }

  const projectIndex = allProjects.findIndex((p) => p.slug === slug);
  const prevProject = projectIndex > 0 ? allProjects[projectIndex - 1] : null;
  const nextProject =
    projectIndex < allProjects.length - 1 ? allProjects[projectIndex + 1] : null;

  return (
    <div>
      {/* Lightbox */}
      <Lightbox
        images={allMedia}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Back link */}
      <section className="pt-28 pb-4">
        <div className="container-public">
          <Link
            to="/work"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-sage transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Work
          </Link>
        </div>
      </section>

      {/* Project Header */}
      <section className="pb-12">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-3 mb-4">
              {project.categories.map((cat) => (
                <span key={cat} className="meta-label">
                  {cat}
                </span>
              ))}
              <span className="meta-label text-neutral-300">&middot;</span>
              <span className="meta-label">{project.year}</span>
            </div>

            <h1 className="font-display text-display-lg text-brand-charcoal mb-6">
              {project.title}
            </h1>

            <p className="text-xl text-neutral-600 leading-relaxed max-w-3xl">
              {project.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Hero Image */}
      <section className="pb-16">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="aspect-[16/9] rounded-xl overflow-hidden group relative cursor-pointer"
            style={{ backgroundColor: project.color + '10' }}
            onClick={() => project.featuredImage && openLightbox(0)}
          >
            <PortfolioImage
              src={project.featuredImage}
              alt={project.title}
              fallbackColor={project.color}
              fallbackLabel={project.client}
            />
            {project.featuredImage && <ZoomHint />}
          </motion.div>
        </div>
      </section>

      {/* Project Details Grid */}
      <section className="section-public bg-white">
        <div className="container-public">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar */}
            <div className="lg:col-span-4">
              <div className="space-y-8 lg:sticky lg:top-28">
                <div>
                  <h3 className="meta-label mb-3">Client</h3>
                  <p className="text-brand-charcoal font-medium">{project.client}</p>
                </div>

                <div>
                  <h3 className="meta-label mb-3">Disciplines</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.disciplines.map((d) => (
                      <span
                        key={d}
                        className="px-3 py-1 bg-brand-cream rounded-full text-sm text-neutral-700"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="meta-label mb-3">Year</h3>
                  <p className="text-brand-charcoal font-mono">{project.year}</p>
                </div>

                {project.liveUrl && (
                  <div>
                    <h3 className="meta-label mb-3">Live Project</h3>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-brand-sage hover:text-brand-sage-dark transition-colors text-sm font-medium"
                    >
                      Visit Site
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-12">
              {project.challenge && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="font-display text-2xl font-semibold text-brand-charcoal mb-4">
                    The Challenge
                  </h2>
                  <p className="text-neutral-600 leading-relaxed">{project.challenge}</p>
                </motion.div>
              )}

              {project.solution && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="font-display text-2xl font-semibold text-brand-charcoal mb-4">
                    The Solution
                  </h2>
                  <p className="text-neutral-600 leading-relaxed">{project.solution}</p>
                </motion.div>
              )}

              {/* Media Gallery (images + videos, all open in lightbox carousel) */}
              {project.images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {project.images.map((img, i) => {
                      const lightboxIndex = (project.featuredImage ? 1 : 0) + i;
                      return (
                        <figure key={i} className="group">
                          <div
                            className="aspect-[4/3] rounded-lg overflow-hidden relative cursor-pointer"
                            style={{ backgroundColor: project.color + '08' }}
                            onClick={() => img.url && openLightbox(lightboxIndex)}
                          >
                            <PortfolioMedia
                              media={img}
                              fallbackColor={project.color}
                              fallbackLabel={img.caption}
                              thumbnailOnly
                              className="group-hover:scale-105 transition-transform duration-500"
                            />
                            <ZoomHint />
                          </div>
                          {img.caption && (
                            <figcaption className="mt-2 text-sm text-neutral-500 italic">
                              {img.caption}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {project.results && project.results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="font-display text-2xl font-semibold text-brand-charcoal mb-4">
                    Results
                  </h2>
                  <ul className="space-y-3">
                    {project.results.map((result, i) => (
                      <li key={i} className="flex items-start gap-3 text-neutral-600">
                        <span className="w-6 h-6 rounded-full bg-brand-sage/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-brand-sage" />
                        </span>
                        {result}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {project.testimonial && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="bg-brand-cream rounded-xl p-8"
                >
                  <blockquote className="font-display text-xl text-brand-charcoal italic leading-relaxed mb-4">
                    &ldquo;{project.testimonial.quote}&rdquo;
                  </blockquote>
                  <div>
                    <p className="font-medium text-brand-charcoal">
                      {project.testimonial.author}
                    </p>
                    <p className="text-sm text-neutral-500">{project.testimonial.role}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Project Navigation */}
      <section className="py-12 border-t border-neutral-200">
        <div className="container-public">
          <div className="flex items-center justify-between">
            {prevProject ? (
              <Link
                to={`/work/${prevProject.slug}`}
                className="group flex items-center gap-3 text-neutral-500 hover:text-brand-sage transition-colors"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <div>
                  <span className="meta-label block mb-1">Previous</span>
                  <span className="text-sm font-medium text-brand-charcoal group-hover:text-brand-sage transition-colors">
                    {prevProject.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextProject ? (
              <Link
                to={`/work/${nextProject.slug}`}
                className="group flex items-center gap-3 text-neutral-500 hover:text-brand-sage transition-colors text-right"
              >
                <div>
                  <span className="meta-label block mb-1">Next</span>
                  <span className="text-sm font-medium text-brand-charcoal group-hover:text-brand-sage transition-colors">
                    {nextProject.title}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default WorkDetail;
