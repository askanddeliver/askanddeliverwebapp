import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const values = [
  {
    title: 'Collaboration First',
    description:
      'Every project is a partnership. We listen deeply, challenge thoughtfully, and build together with our clients to create work that truly represents their vision.',
  },
  {
    title: 'Craft & Quality',
    description:
      'We believe in doing work right — with attention to detail, strategic thinking, and a relentless pursuit of quality that shows in every deliverable.',
  },
  {
    title: 'Honest Communication',
    description:
      'No jargon, no runaround. We pride ourselves on transparent conversations about timelines, budgets, and creative direction from day one.',
  },
  {
    title: 'Collective Expertise',
    description:
      'Our model brings together the right specialists for each project — ensuring you get senior-level talent across every discipline your project demands.',
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
              More than an agency.
              <br />
              <span className="text-brand-sage">A creative collective.</span>
            </h1>
            <p className="text-xl text-neutral-600 leading-relaxed max-w-3xl">
              Ask+Deliver is a solutions hub driven by collective expertise. With
              years of experience in the field, we&rsquo;ve honed our focus on
              delivering targeted solutions tailored to your needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-public bg-white">
        <div className="container-public">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-display-sm text-brand-charcoal mb-6">
                Why consultation matters
              </h2>
              <div className="space-y-4 text-neutral-600 leading-relaxed">
                <p>
                  We get it. Success comes with hard work and sacrifice.
                  Sometimes you just need to call for help. We pride ourselves on
                  pulling up our sleeves and getting to work to make your business
                  the best that it can be.
                </p>
                <p>
                  We&rsquo;ll help you assess your marketing or business needs to
                  determine your next steps. We evaluate budget needs and help align
                  you with resources that best fit your desired results.
                </p>
                <p>
                  Whether you&rsquo;re seeking to amplify your brand, enhance your
                  online presence, or optimize project workflows, our collaborative
                  approach ensures you receive personalized strategies crafted by
                  industry professionals.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-display text-display-sm text-brand-charcoal mb-6">
                Why choose us
              </h2>
              <div className="space-y-6">
                {[
                  {
                    label: 'Design Maestro',
                    text: 'We breathe life into your ideas through captivating designs, both digital and traditional. From brand identity to environmental graphics, design is in our DNA.',
                  },
                  {
                    label: 'Tech Whisperer',
                    text: 'With 25 years of web development under our belt, we turn digital dreams into reality. Modern technology, proven methods, built to last.',
                  },
                  {
                    label: 'Management Guru',
                    text: 'From team leadership to workflow systems, we make sure projects run smoothly and efficiently. No missed deadlines, no surprises.',
                  },
                ].map((item, index) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-sage/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="font-mono text-brand-sage text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-brand-charcoal mb-1">
                        {item.label}
                      </h3>
                      <p className="text-neutral-600 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
