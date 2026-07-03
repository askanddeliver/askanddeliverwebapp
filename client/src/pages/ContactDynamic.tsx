import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { IntakeFormProvider } from '../contexts/IntakeFormContext';
import { IntakeWizard } from '../components/intake/IntakeWizard';
import { intakeFormsPublicApi } from '../services/api';
import type { PublicIntakeForm } from '../types';

function ContactDynamic() {
  const [form, setForm] = useState<PublicIntakeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    intakeFormsPublicApi
      .getPublished('default')
      .then(({ data }) => {
        if (!cancelled) {
          setForm(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(err);
        setError(
          'Unable to load the intake form. Please try again later or contact us directly.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-sage" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 pt-20">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{error || 'Form not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <IntakeFormProvider form={form}>
      <IntakeWizard />
    </IntakeFormProvider>
  );
}

export default ContactDynamic;
