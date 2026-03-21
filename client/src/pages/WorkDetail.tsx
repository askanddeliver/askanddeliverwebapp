import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

      {/* Hero: Featured image as full-bleed background */}
      <section className="relative">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-xl overflow-hidden cursor-pointer"
            style={{ backgroundColor: project.color + '20' }}
            onClick={() => project.featuredImage && openLightbox(0)}
          >
            <div className="aspect-[16/7] relative">
              <PortfolioImage
                src={project.featuredImage}
                alt={project.title}
                fallbackColor={project.color}
                fallbackLabel={project.client}
              />
              {/* Gradient overlay at the bottom for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              {project.featuredImage && <ZoomHint />}
            </div>
          </motion.div>
        </div>

        {/* Overlapping content card */}
        <div className="container-public relative z-10 -mt-20 md:-mt-28 lg:-mt-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-8 md:p-12 max-w-4xl"
          >
            {/* Client logo */}
            {project.clientLogo && (
              <div className="mb-6">
                <img
                  src={project.clientLogo}
                  alt={`${project.client} logo`}
                  className="h-10 md:h-12 w-auto object-contain"
                />
              </div>
            )}

            {/* Meta labels */}
            <div className="flex items-center gap-3 mb-4">
              {project.categories.map((cat) => (
                <span key={cat} className="meta-label">
                  {cat}
                </span>
              ))}
              {project.categories.length > 0 && (
                <span className="meta-label text-neutral-300">&middot;</span>
              )}
              <span className="meta-label">{project.year}</span>
            </div>

            {/* Client name as primary heading */}
            <h1 className="font-display text-display-lg text-brand-charcoal mb-2">
              {project.client}
            </h1>

            {/* Project title as subtitle */}
            <h2 className="text-xl md:text-2xl text-neutral-500 font-light leading-relaxed mb-6">
              {project.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-neutral-600 leading-relaxed max-w-3xl">
              {project.description}
            </p>

            {/* Disciplines + Live URL */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8 pt-6 border-t border-neutral-100">
              {project.disciplines.length > 0 && (
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
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-brand-sage hover:text-brand-sage-dark transition-colors text-sm font-medium ml-auto"
                >
                  Visit Site
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main content area */}
      <section className="section-public">
        <div className="container-public">
          <div className="max-w-4xl space-y-16">
            {/* The Challenge */}
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
                <div className="prose-portfolio">
                  <ReactMarkdown>{project.challenge}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* Results — promoted to appear right after challenge */}
            {project.results && project.results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="rounded-xl p-8 md:p-10"
                style={{ backgroundColor: project.color + '0A' }}
              >
                <h2 className="font-display text-2xl font-semibold text-brand-charcoal mb-6">
                  Results
                </h2>
                <ul className="space-y-4">
                  {project.results.map((result, i) => (
                    <li key={i} className="flex items-start gap-4 text-neutral-700">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: project.color + '15' }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                      </span>
                      <span className="text-base leading-relaxed">{result}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Media Gallery */}
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
                    const lbIndex = (project.featuredImage ? 1 : 0) + i;
                    return (
                      <figure key={i} className="group">
                        <div
                          className="aspect-[4/3] rounded-lg overflow-hidden relative cursor-pointer"
                          style={{ backgroundColor: project.color + '08' }}
                          onClick={() => img.url && openLightbox(lbIndex)}
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

            {/* The Solution */}
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
                <div className="prose-portfolio">
                  <ReactMarkdown>{project.solution}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* Testimonial */}
            {project.testimonial && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-brand-cream rounded-xl p-8 md:p-10"
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
                    {prevProject.client}
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
                    {nextProject.client}
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
