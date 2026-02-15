import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Target, Compass, HelpCircle } from 'lucide-react';

type ConfidenceLevel = 'YES' | 'MAYBE' | 'UNSURE';

interface FormData {
  // Step 1: Confidence
  confidence: ConfidenceLevel | '';
  // Step 2: Project details (varies by confidence)
  projectType: string;
  description: string;
  // Step 3: Budget & Timeline
  budget: string;
  timeline: string;
  // Step 4: Contact info
  name: string;
  email: string;
  company: string;
  message: string;
}

const initialFormData: FormData = {
  confidence: '',
  projectType: '',
  description: '',
  budget: '',
  timeline: '',
  name: '',
  email: '',
  company: '',
  message: '',
};

const projectTypes = [
  'Brand Strategy',
  'Web Design & Development',
  'Marketing Campaign',
  'Experiential Design',
  'Creative Consulting',
  'Video Production',
  'Other',
];

const budgetRanges = [
  'Under $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000+',
  'Not sure yet',
];

const timelineOptions = [
  'ASAP',
  '1–2 months',
  '3–6 months',
  '6+ months',
  'Flexible / ongoing',
];

function Contact() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = 4;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return formData.confidence !== '';
      case 1:
        return formData.description.trim() !== '';
      case 2:
        return true; // budget and timeline are optional
      case 3:
        return formData.name.trim() !== '' && formData.email.trim() !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // In a future phase, this will POST to the API
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg mx-auto px-6"
        >
          <div className="w-16 h-16 rounded-full bg-brand-sage/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-brand-sage" />
          </div>
          <h1 className="font-display text-display-sm text-brand-charcoal mb-4">
            Thank you!
          </h1>
          <p className="text-neutral-600 leading-relaxed mb-8">
            We&rsquo;ve received your project inquiry and will be in touch within 1–2
            business days. In the meantime, feel free to browse our work.
          </p>
          <a href="/work" className="btn-brand-primary">
            Explore Our Portfolio
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="pt-32 pb-8">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="meta-label mb-3">Contact</p>
            <h1 className="font-display text-display-lg text-brand-charcoal mb-4">
              Let&rsquo;s build something together.
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Tell us about your project and we&rsquo;ll figure out the best way to help.
              Every great project starts with a conversation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="pb-8">
        <div className="container-public max-w-3xl">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= currentStep ? 'bg-brand-sage' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
          <p className="meta-label mt-3">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
      </section>

      {/* Form Steps */}
      <section className="pb-20">
        <div className="container-public max-w-3xl">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 0: Confidence */}
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="font-display text-display-sm text-brand-charcoal mb-8">
                    What are we building?
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        value: 'YES' as ConfidenceLevel,
                        label: 'I know exactly what I need',
                        description: 'Clear scope, ready to go',
                        icon: Target,
                      },
                      {
                        value: 'MAYBE' as ConfidenceLevel,
                        label: 'I have a general idea',
                        description: 'Direction, but open to input',
                        icon: Compass,
                      },
                      {
                        value: 'UNSURE' as ConfidenceLevel,
                        label: "I'm still figuring it out",
                        description: "Let's explore together",
                        icon: HelpCircle,
                      },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField('confidence', option.value)}
                          className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 hover:border-brand-sage hover:bg-brand-sage/5 ${
                            formData.confidence === option.value
                              ? 'border-brand-sage bg-brand-sage/10'
                              : 'border-neutral-200 bg-white'
                          }`}
                        >
                          <Icon className="w-7 h-7 text-brand-sage mb-4" />
                          <span className="block text-base font-medium text-brand-charcoal mb-1">
                            {option.label}
                          </span>
                          <span className="block text-sm text-neutral-500">
                            {option.description}
                          </span>
                          {formData.confidence === option.value && (
                            <motion.div
                              layoutId="active-confidence"
                              className="absolute -top-2 -right-2 w-6 h-6 bg-brand-sage rounded-full flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 1: Project Details */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="font-display text-display-sm text-brand-charcoal mb-2">
                    {formData.confidence === 'YES'
                      ? 'Tell us about your project.'
                      : formData.confidence === 'MAYBE'
                      ? 'What problem are you trying to solve?'
                      : 'What inspired you to reach out?'}
                  </h2>
                  <p className="text-neutral-500 mb-8">
                    {formData.confidence === 'YES'
                      ? 'Help us understand the scope so we can match you with the right team.'
                      : formData.confidence === 'MAYBE'
                      ? "Share what you know and we'll help fill in the gaps."
                      : "No pressure — let's start with what's on your mind."}
                  </p>

                  {formData.confidence === 'YES' && (
                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-2">
                        Project Type
                      </label>
                      <select
                        value={formData.projectType}
                        onChange={(e) => updateField('projectType', e.target.value)}
                        className="input-brand"
                      >
                        <option value="">Select a project type...</option>
                        {projectTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-2">
                      {formData.confidence === 'UNSURE'
                        ? 'What challenges are you facing?'
                        : 'Brief Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={5}
                      placeholder={
                        formData.confidence === 'YES'
                          ? "Help us understand what you're looking to create..."
                          : formData.confidence === 'MAYBE'
                          ? 'Tell us about the challenge or opportunity you see...'
                          : 'What brought you here today? What are you thinking about?'
                      }
                      className="input-brand resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Budget & Timeline */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <h2 className="font-display text-display-sm text-brand-charcoal mb-2">
                    Budget & timeline
                  </h2>
                  <p className="text-neutral-500 mb-8">
                    These help us tailor our approach. Don&rsquo;t worry if you&rsquo;re
                    not sure — we can figure this out together.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-3">
                      Approximate Budget
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {budgetRanges.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => updateField('budget', range)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                            formData.budget === range
                              ? 'bg-brand-sage text-white'
                              : 'bg-white text-neutral-600 border border-neutral-200 hover:border-brand-sage hover:text-brand-sage'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-3">
                      Ideal Timeline
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {timelineOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('timeline', option)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                            formData.timeline === option
                              ? 'bg-brand-sage text-white'
                              : 'bg-white text-neutral-600 border border-neutral-200 hover:border-brand-sage hover:text-brand-sage'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Info */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="font-display text-display-sm text-brand-charcoal mb-2">
                    How do we reach you?
                  </h2>
                  <p className="text-neutral-500 mb-8">
                    We&rsquo;ll get back to you within 1–2 business days.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-2">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Your name"
                        className="input-brand"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-charcoal mb-2">
                        Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="you@company.com"
                        className="input-brand"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-2">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => updateField('company', e.target.value)}
                      placeholder="Your company name (optional)"
                      className="input-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-charcoal mb-2">
                      Anything else?
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      rows={4}
                      placeholder="Any additional context, links, or questions..."
                      className="input-brand resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-neutral-200">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`btn-brand-ghost ${
                  currentStep === 0 ? 'opacity-0 pointer-events-none' : ''
                }`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>

              <div className="flex gap-3">
                {currentStep < totalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className={`btn-brand-primary ${
                      !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canProceed()}
                    className={`btn-brand-primary ${
                      !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Send Inquiry
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Contact;
