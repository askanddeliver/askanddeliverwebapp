import type {
  IIntakeForm,
  IIntakeStep,
  IntakeFormStatus,
} from '../models/IntakeForm';

export const DEFAULT_INTAKE_SLUG = 'default';

const CONFIDENCE_OPTIONS = [
  {
    value: 'YES',
    label: 'I know exactly what I need',
    description: 'Clear scope, ready to go',
  },
  {
    value: 'MAYBE',
    label: 'I have a general idea',
    description: 'Direction, but open to input',
  },
  {
    value: 'UNSURE',
    label: "I'm still figuring it out",
    description: 'Start the conversation anyway',
  },
];

const PROJECT_TYPE_OPTIONS = [
  { value: 'Brand Strategy', label: 'Brand Strategy' },
  { value: 'Web Design & Development', label: 'Web Design & Development' },
  { value: 'Marketing Campaign', label: 'Marketing Campaign' },
  { value: 'Experiential Design', label: 'Experiential Design' },
  { value: 'Creative Consulting', label: 'Creative Consulting' },
  { value: 'Video Production', label: 'Video Production' },
  { value: 'Other', label: 'Other' },
];

const BUDGET_OPTIONS = [
  { value: 'Under $5,000', label: 'Under $5,000' },
  { value: '$5,000 – $15,000', label: '$5,000 – $15,000' },
  { value: '$15,000 – $50,000', label: '$15,000 – $50,000' },
  { value: '$50,000+', label: '$50,000+' },
  { value: 'Not sure yet', label: 'Not sure yet' },
];

const TIMELINE_OPTIONS = [
  { value: 'ASAP', label: 'ASAP' },
  { value: 'Within 4–6 weeks', label: 'Within 4–6 weeks' },
  { value: '1–2 months', label: '1–2 months' },
  { value: '3–6 months', label: '3–6 months' },
  { value: '6+ months', label: '6+ months' },
  { value: 'Flexible / ongoing', label: 'Flexible / ongoing' },
];

const DISCIPLINE_OPTIONS = [
  { id: 'design', label: 'Design' },
  { id: 'development', label: 'Development' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'research', label: 'Research' },
  { id: 'support', label: 'Support' },
];

export function buildDefaultIntakeSteps(): IIntakeStep[] {
  return [
    {
      id: 'confidence',
      title: 'What are we building?',
      fields: [
        {
          key: 'confidence',
          type: 'single_select',
          label: 'Confidence level',
          required: true,
          mapsTo: 'confidence',
          uiVariant: 'cards',
          options: CONFIDENCE_OPTIONS,
        },
      ],
    },
    {
      id: 'project-details',
      title: 'Tell us about your project.',
      description:
        'Help us understand the scope so we can match you with the right team.',
      copyVariants: {
        YES: {
          title: 'Tell us about your project.',
          description:
            'Help us understand the scope so we can match you with the right team.',
        },
        MAYBE: {
          title: 'What problem are you trying to solve?',
          description: "Share what you know and we'll help fill in the gaps.",
        },
        UNSURE: {
          title: 'What inspired you to reach out?',
          description: "No pressure — let's start with what's on your mind.",
        },
      },
      fields: [
        {
          key: 'disciplines_needed',
          type: 'disciplines_needed',
          label: 'What disciplines do you need?',
          helpText: 'Select all that apply.',
          required: true,
          disciplineOptionIds: DISCIPLINE_OPTIONS.map((d) => d.id),
          disciplineOptions: DISCIPLINE_OPTIONS,
        },
        {
          key: 'project_type',
          type: 'single_select',
          label: 'Project Type',
          required: false,
          mapsTo: 'projectType',
          options: PROJECT_TYPE_OPTIONS,
          showWhen: { fieldKey: 'confidence', equals: 'YES' },
        },
        {
          key: 'description',
          type: 'textarea',
          label: 'Brief Description',
          required: true,
          mapsTo: 'description',
          placeholder: "Help us understand what you're looking to create...",
          labelVariants: {
            UNSURE: "What's on your mind?",
          },
          placeholderVariants: {
            MAYBE: 'Tell us about the challenge or opportunity you see...',
            UNSURE: 'What brought you here today? What are you thinking about?',
          },
        },
      ],
    },
    {
      id: 'budget-timeline',
      title: "Let's talk numbers and timing.",
      description:
        'No wrong answers here. Even a rough sense helps us build the right team.',
      fields: [
        {
          key: 'budget',
          type: 'single_select',
          label: 'Approximate Budget',
          required: false,
          mapsTo: 'budget',
          uiVariant: 'pills',
          options: BUDGET_OPTIONS,
        },
        {
          key: 'timeline',
          type: 'single_select',
          label: 'Ideal Timeline',
          required: false,
          mapsTo: 'timeline',
          uiVariant: 'pills',
          options: TIMELINE_OPTIONS,
        },
      ],
    },
    {
      id: 'attachments',
      title: 'Have anything to share?',
      description:
        'Brand guidelines, briefs, inspiration, or reference files — totally optional.',
      fields: [
        {
          key: 'attachments',
          type: 'file',
          label: 'Attachments',
          required: false,
          accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip',
          maxFiles: 5,
        },
      ],
    },
    {
      id: 'contact',
      title: 'How do we reach you?',
      description:
        "We read every submission personally. You'll hear from us within 1–2 business days — usually faster.",
      fields: [
        {
          key: 'name',
          type: 'text',
          label: 'Name',
          required: true,
          mapsTo: 'name',
          placeholder: 'Your name',
        },
        {
          key: 'email',
          type: 'email',
          label: 'Email',
          required: true,
          mapsTo: 'email',
          placeholder: 'you@company.com',
        },
        {
          key: 'company',
          type: 'text',
          label: 'Company / Organization',
          required: false,
          mapsTo: 'company',
          placeholder: 'Your company name (optional)',
        },
        {
          key: 'message',
          type: 'textarea',
          label: 'Anything else?',
          required: false,
          mapsTo: 'message',
          placeholder: 'Any additional context, links, or questions...',
        },
      ],
    },
  ];
}

export type DefaultIntakeFormPayload = {
  userId: string;
  slug: string;
  status: IntakeFormStatus;
  version: number;
  publishedAt?: Date;
  title: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps: IIntakeStep[];
};

export function buildDefaultIntakeFormPayload(
  userId: string,
  status: IntakeFormStatus = 'PUBLISHED',
  version = 1
): DefaultIntakeFormPayload {
  return {
    userId,
    slug: DEFAULT_INTAKE_SLUG,
    status,
    version,
    publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
    title: "Let's build something together.",
    subtitle:
      "Tell us about your project and we'll figure out the best way to help. Every great project starts with a conversation.",
    successMessage:
      "We've received your project inquiry and will be in touch within 1–2 business days. In the meantime, feel free to browse our work.",
    successCtaLabel: 'Explore Our Portfolio',
    successCtaUrl: '/work',
    submitButtonLabel: 'Start the Conversation',
    steps: buildDefaultIntakeSteps(),
  };
}
