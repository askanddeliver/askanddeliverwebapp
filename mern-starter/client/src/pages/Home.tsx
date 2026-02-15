import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Palette, Globe, BarChart3, Lightbulb, PenTool, Users } from 'lucide-react';
import { usePublicPortfolio } from '../hooks/usePublicPortfolio';

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  }),
};

const services = [
  {
    icon: Palette,
    title: 'Brand Strategy',
    description: 'Identity systems, positioning, and visual language that tell your story with clarity and conviction.',
  },
  {
    icon: Globe,
    title: 'Web Design & Development',
    description: 'Digital experiences built with modern technology, thoughtful UX, and performance in mind.',
  },
  {
    icon: BarChart3,
    title: 'Marketing Campaigns',
    description: 'Strategic campaigns that connect with audiences and drive measurable results across channels.',
  },
  {
    icon: Lightbulb,
    title: 'Creative Consulting',
    description: 'Expert guidance on creative direction, project planning, and bringing ambitious ideas to life.',
  },
  {
    icon: PenTool,
    title: 'Experiential Design',
    description: 'Physical and digital experiences that immerse audiences and create lasting impressions.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'A collective model that brings the right specialists together for every unique project.',
  },
];

function Home() {
  const { projects } = usePublicPortfolio();
  const featuredProjects = projects.filter((p) => p.featured).slice(0, 4);

  return (
    <div>
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-sage/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-accent-warm/5 rounded-full blur-3xl" />
        </div>

        <div className="container-public">
          <div className="max-w-4xl">
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.p
                custom={0}
                variants={fadeUpVariant}
                className="meta-label"
              >
                Creative Collective
              </motion.p>

              <motion.h1
                custom={1}
                variants={fadeUpVariant}
                className="font-display text-display-xl text-brand-charcoal"
              >
                Ask<span className="text-brand-sage">+</span>Deliver
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUpVariant}
                className="text-xl md:text-2xl text-neutral-600 max-w-2xl leading-relaxed"
              >
                A creative collective where talented professionals collaborate
                to bring exceptional projects to life. From brand strategy to
                experiential design, we build meaningful work.
              </motion.p>

              <motion.div
                custom={3}
                variants={fadeUpVariant}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link to="/work" className="btn-brand-primary">
                  View Our Work
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link to="/contact" className="btn-brand-secondary">
                  Start a Project
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 tracking-wider uppercase">Scroll</span>
            <div className="w-px h-8 bg-neutral-300 animate-pulse" />
          </div>
        </motion.div>
      </section>

      {/* ============================================
          FEATURED WORK SECTION
          ============================================ */}
      <section className="section-public bg-white">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
          >
            <div>
              <p className="meta-label mb-3">Selected Projects</p>
              <h2 className="font-display text-display-md text-brand-charcoal">
                Featured Work
              </h2>
            </div>
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-brand-sage hover:text-brand-sage-dark transition-colors text-sm font-medium"
            >
              View all projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredProjects.map((project, index) => (
              <motion.div
                key={project.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link to={`/work/${project.slug}`} className="group block">
                  {/* Image placeholder */}
                  <div
                    className="relative aspect-[4/3] overflow-hidden rounded-lg mb-5"
                    style={{ backgroundColor: project.color + '15' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-24 h-24 rounded-full opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700"
                        style={{ backgroundColor: project.color }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-2xl font-semibold opacity-30"
                        style={{ color: project.color }}
                      >
                        {project.client}
                      </span>
                    </div>
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
                    {project.categories.map((cat) => (
                      <span key={cat} className="meta-label">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-brand-charcoal mb-2 group-hover:text-brand-sage transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {project.excerpt}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          ABOUT / PHILOSOPHY SECTION
          ============================================ */}
      <section className="section-public">
        <div className="container-public">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              <p className="meta-label mb-3">Our Approach</p>
              <h2 className="font-display text-display-md text-brand-charcoal mb-6">
                We have to talk.
              </h2>
              <div className="space-y-4 text-neutral-600 leading-relaxed">
                <p>
                  Every successful project begins with a genuine conversation. We
                  want to understand your challenges, your vision, and the context
                  behind the ask — because the best solutions come from deep
                  understanding.
                </p>
                <p>
                  At Ask+Deliver, we&rsquo;re more than a traditional agency.
                  We&rsquo;re a solutions hub driven by collective expertise. With
                  years of experience across design, technology, and strategy,
                  we&rsquo;ve honed our focus on delivering targeted solutions
                  tailored to your needs.
                </p>
                <p>
                  Sometimes we discover even more ways to find success together —
                  solutions to problems no one was thinking about.
                </p>
              </div>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-brand-sage hover:text-brand-sage-dark transition-colors text-sm font-medium mt-8"
              >
                Learn more about us
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Visual element */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square bg-white rounded-2xl shadow-sm border border-neutral-200/50 p-12 flex flex-col justify-center">
                <blockquote className="font-display text-display-sm text-brand-charcoal italic leading-snug mb-6">
                  &ldquo;Success comes with hard work and sacrifice. Sometimes you just need to call for help.&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-sage/10 flex items-center justify-center">
                    <span className="font-display text-brand-sage font-semibold text-sm">A+D</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">Ask+Deliver</p>
                    <p className="text-xs text-neutral-500">Creative Collective</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          SERVICES SECTION
          ============================================ */}
      <section className="section-public bg-white">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="meta-label mb-3">What We Do</p>
            <h2 className="font-display text-display-md text-brand-charcoal mb-4">
              How can we help you?
            </h2>
            <p className="text-neutral-600 leading-relaxed">
              Whether you&rsquo;re seeking to amplify your brand, enhance your
              online presence, or optimize project workflows — our collaborative
              approach ensures you receive personalized strategies crafted by
              industry professionals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="group p-8 rounded-xl border border-neutral-100 hover:border-brand-sage/20 hover:shadow-sm transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-brand-sage/10 flex items-center justify-center mb-5 group-hover:bg-brand-sage/20 transition-colors">
                    <Icon className="w-6 h-6 text-brand-sage" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-2">
                    {service.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          WHY CHOOSE US SECTION
          ============================================ */}
      <section className="section-public">
        <div className="container-public">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                label: 'Design Maestro',
                text: 'We breathe life into your ideas through captivating designs, both digital and traditional.',
              },
              {
                label: 'Tech Whisperer',
                text: 'With 25 years of web development experience, we turn digital dreams into reality.',
              },
              {
                label: 'Management Guru',
                text: 'From team leadership to workflow systems, we make sure projects run smoothly and efficiently.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-brand-sage/10 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-brand-sage font-bold text-xl">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-brand-charcoal mb-2">
                  {item.label}
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed max-w-xs mx-auto">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-20 md:py-30 bg-brand-charcoal">
        <div className="container-public text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="font-display text-display-md text-white mb-6">
              Let&rsquo;s elevate your business together.
            </h2>
            <p className="text-neutral-400 text-lg leading-relaxed mb-10">
              Ready to take your business to new heights? Whether you&rsquo;re a
              seasoned entrepreneur or just starting out, we&rsquo;re here to offer
              personalized insights and creative solutions tailored to your
              unique needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="btn-brand bg-brand-sage text-white hover:bg-brand-sage-light focus:ring-brand-sage focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-charcoal"
              >
                Start a Conversation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                to="/work"
                className="btn-brand border-2 border-neutral-600 text-neutral-300 hover:border-white hover:text-white focus:ring-white focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-charcoal"
              >
                Explore Our Portfolio
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Home;
