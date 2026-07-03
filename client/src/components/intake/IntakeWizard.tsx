import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useIntakeForm } from '../../contexts/IntakeFormContext';
import { IntakeFieldRenderer } from './IntakeFieldRenderer';
import { resolveStepCopy } from '../../lib/intakeUtils';

export function IntakeWizard() {
  const {
    form,
    responses,
    currentStepIndex,
    setField,
    goNext,
    goPrev,
    canProceed,
    submitting,
    submitError,
    submitted,
    submit,
    visibleFields,
    totalSteps,
  } = useIntakeForm();

  const currentStep = form.steps[currentStepIndex];
  const stepCopy = currentStep
    ? resolveStepCopy(currentStep, responses)
    : { title: '', description: undefined };

  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      await submit();
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-lg px-6 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-sage/10">
            <CheckCircle className="h-8 w-8 text-brand-sage" />
          </div>
          <h1 className="font-display text-display-sm mb-4 text-brand-charcoal">
            Thank you!
          </h1>
          <p className="mb-8 leading-relaxed text-neutral-600">
            {form.successMessage ||
              "We've received your project inquiry and will be in touch within 1–2 business days. In the meantime, feel free to browse our work."}
          </p>
          <a
            href={form.successCtaUrl || '/work'}
            className="btn-brand-primary"
          >
            {form.successCtaLabel || 'Explore Our Portfolio'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </motion.div>
      </div>
    );
  }

  const contactNameEmail = visibleFields.filter(
    (f) => f.key === 'name' || f.key === 'email'
  );
  const contactOther = visibleFields.filter(
    (f) => f.key !== 'name' && f.key !== 'email'
  );

  return (
    <div>
      <section className="pb-8 pt-32">
        <div className="container-public">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="meta-label mb-3">Contact</p>
            <h1 className="font-display text-display-lg mb-4 text-brand-charcoal">
              {form.title}
            </h1>
            {form.subtitle && (
              <p className="text-lg leading-relaxed text-neutral-600">
                {form.subtitle}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <section className="pb-8">
        <div className="container-public max-w-3xl">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= currentStepIndex ? 'bg-brand-sage' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
          <p className="meta-label mt-3">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="container-public max-w-3xl">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {currentStep && (
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {currentStep.id !== 'confidence' && (
                    <>
                      <h2 className="font-display text-display-sm mb-2 text-brand-charcoal">
                        {stepCopy.title}
                      </h2>
                      {stepCopy.description && (
                        <p className="mb-8 text-neutral-500">
                          {stepCopy.description}
                        </p>
                      )}
                    </>
                  )}

                  {currentStep.id === 'confidence' && (
                    <h2 className="font-display text-display-sm mb-8 text-brand-charcoal">
                      {stepCopy.title}
                    </h2>
                  )}

                  {currentStep.id === 'contact' ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {contactNameEmail.map((field) => (
                          <IntakeFieldRenderer
                            key={field.key}
                            field={field}
                            value={responses[field.key]}
                            responses={responses}
                            onChange={setField}
                          />
                        ))}
                      </div>
                      {contactOther.map((field) => (
                        <IntakeFieldRenderer
                          key={field.key}
                          field={field}
                          value={responses[field.key]}
                          responses={responses}
                          onChange={setField}
                        />
                      ))}
                    </>
                  ) : (
                    visibleFields.map((field) => (
                      <IntakeFieldRenderer
                        key={field.key}
                        field={field}
                        value={responses[field.key]}
                        responses={responses}
                        onChange={setField}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Unable to submit your inquiry
                  </p>
                  <p className="mt-1 text-sm text-red-600">{submitError}</p>
                </div>
              </motion.div>
            )}

            <div className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-8">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentStepIndex === 0 || submitting}
                className={`btn-brand-ghost ${
                  currentStepIndex === 0 ? 'pointer-events-none opacity-0' : ''
                }`}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>

              <div className="flex gap-3">
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceed}
                    className={`btn-brand-primary ${
                      !canProceed ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canProceed || submitting}
                    className={`btn-brand-primary ${
                      !canProceed || submitting
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        {form.submitButtonLabel || 'Start the Conversation'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
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
