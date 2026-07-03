import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { leadsPublicApi } from '../services/api';
import {
  buildLeadSubmitPayload,
  canProceedStep,
  getVisibleFields,
} from '../lib/intakeUtils';
import type { IntakeField, PublicIntakeForm } from '../types';

interface IntakeFormContextValue {
  form: PublicIntakeForm;
  responses: Record<string, unknown>;
  pendingFiles: Record<string, File[]>;
  setFieldFiles: (key: string, files: File[]) => void;
  currentStepIndex: number;
  setField: (key: string, value: unknown) => void;
  goNext: () => void;
  goPrev: () => void;
  canProceed: boolean;
  submitting: boolean;
  submitError: string | null;
  submitted: boolean;
  submit: () => Promise<void>;
  visibleFields: IntakeField[];
  totalSteps: number;
}

const IntakeFormContext = createContext<IntakeFormContextValue | null>(null);

interface IntakeFormProviderProps {
  form: PublicIntakeForm;
  children: ReactNode;
}

export function IntakeFormProvider({ form, children }: IntakeFormProviderProps) {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File[]>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const currentStep = form.steps[currentStepIndex];
  const visibleFields = useMemo(
    () => (currentStep ? getVisibleFields(currentStep, responses) : []),
    [currentStep, responses]
  );

  const canProceed = currentStep
    ? canProceedStep(currentStep, responses)
    : false;

  const setField = useCallback((key: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFieldFiles = useCallback((key: string, files: File[]) => {
    setPendingFiles((prev) => ({ ...prev, [key]: files }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStepIndex((prev) =>
      prev < form.steps.length - 1 ? prev + 1 : prev
    );
  }, [form.steps.length]);

  const goPrev = useCallback(() => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildLeadSubmitPayload(form, responses);
      const res = await leadsPublicApi.submit(payload);

      const allFiles = Object.values(pendingFiles).flat();
      if (allFiles.length > 0 && res.data.leadId) {
        await leadsPublicApi.uploadAttachments(res.data.leadId, allFiles);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      let message = 'Something went wrong. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { message?: string; error?: string } };
        };
        message =
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, responses, pendingFiles]);

  const value = useMemo(
    () => ({
      form,
      responses,
      pendingFiles,
      setFieldFiles,
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
      totalSteps: form.steps.length,
    }),
    [
      form,
      responses,
      pendingFiles,
      setFieldFiles,
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
    ]
  );

  return (
    <IntakeFormContext.Provider value={value}>
      {children}
    </IntakeFormContext.Provider>
  );
}

export function useIntakeForm(): IntakeFormContextValue {
  const ctx = useContext(IntakeFormContext);
  if (!ctx) {
    throw new Error('useIntakeForm must be used within IntakeFormProvider');
  }
  return ctx;
}
