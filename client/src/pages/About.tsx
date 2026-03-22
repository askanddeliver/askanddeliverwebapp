import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const values = [
  {
    title: 'Collaboration First',
    description:
      'Every project is a team sport — but not everyone gets to play. We assemble the right people for each project specifically. That means you get specialists who chose your work, not whoever was available.',
  },
  {
    title: 'Craft & Quality',
    description:
      'We have opinions about what good looks like. We push back when something isn\'t working. We hold the standard even when it\'s inconvenient — because the work with our name on it reflects who we are.',
  },
  {
    title: 'Honest Over Easy',
    description:
      'We\'ll tell you when the brief isn\'t the real problem. We\'ll flag when a timeline doesn\'t make sense. We\'d rather have a hard conversation early than a bad outcome at the end.',
  },
];

const capabilities = [
  {
    category: 'Strategy',
    items: ['Brand Strategy', 'Creative Direction', 'Market Research', 'Competitive Analysis', 'Brand Positioning'],
  },
  {
    category: 'Design',
    items: ['Visual Identity', 'UI/UX Design', 'Environmental Design', 'Packaging', 'Print & Collateral'],
  },
  {
    category: 'Digital',
    items: ['Web Development', 'Digital Marketing', 'Social Media', 'Content Strategy', 'SEO & Analytics'],
  },
  {
    category: 'Production',
    items: ['Photography', 'Video Production', 'Motion Graphics', 'Copywriting', 'Project Management'],
  },
  {
    category: 'AI & Technology',
    items: ['AI Navigation & Audit', 'Brand Voice Protection', 'Content Strategy', 'Workflow Integration'],
  },
];

function About() {
  return (
    <div>
      {/* Header */}
      <section className="pt-32 pb-12">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <p className="meta-label mb-3">About</p>
            <h1 className="font-display text-display-lg text-brand-charcoal mb-6">
              A creative collective.
              <br />
              <span className="text-brand-sage">Not an agency.</span>
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed max-w-3xl">
              There&rsquo;s a difference. Ask+Deliver brings together proven
              specialists who choose their projects and own them completely.
              No overhead you&rsquo;re paying for. No generalists doing a
              specialist&rsquo;s job.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-public bg-white">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h2 className="font-display text-display-sm text-brand-charcoal mb-6">
              Why the collective model changes things
            </h2>
            <div className="space-y-4 text-neutral-600 leading-relaxed">
              <p>
                We grew out of The New BLK &mdash; a studio built on the belief
                that every great brand is, at its core, a great story. That belief
                hasn&rsquo;t changed. What has is our model.
              </p>
              <p>
                Instead of a fixed roster, we assemble the right team for each
                project &mdash; people who choose the work because it aligns with
                what they do best. You&rsquo;re not paying for layers of overhead.
                You&rsquo;re working directly with the people doing the work.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-public">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <p className="meta-label mb-3">Our Values</p>
            <h2 className="font-display text-display-md text-brand-charcoal">
              What drives us
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-8 bg-white rounded-xl border border-neutral-100"
              >
                <span className="meta-label text-brand-sage block mb-4">
                  0{index + 1}
                </span>
                <h3 className="font-display text-xl font-bold text-brand-charcoal mb-3">
                  {value.title}
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="section-public bg-white">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <p className="meta-label mb-3">Capabilities</p>
            <h2 className="font-display text-display-md text-brand-charcoal">
              What we bring to the table
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {capabilities.map((group, index) => (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h3 className="font-display font-bold text-brand-charcoal mb-4 pb-3 border-b border-neutral-200">
                  {group.category}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-neutral-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
              Ready to start something great?
            </h2>
            <p className="text-neutral-400 text-lg leading-relaxed mb-10">
              Let&rsquo;s kickstart the conversation and explore how we can
              transform your ideas into success. We can&rsquo;t wait to hear
              about your goals and vision.
            </p>
            <Link
              to="/contact"
              className="btn-brand bg-brand-sage text-white hover:bg-brand-sage-light focus:ring-brand-sage focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-charcoal"
            >
              Start a Project
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default About;
