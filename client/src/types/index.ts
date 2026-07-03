// User types
export type UserRole = 'admin' | 'member' | 'client' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';
export type AvailabilityDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface UserAvailability {
  hoursPerWeek?: number;
  preferredDays?: AvailabilityDay[];
  timezone?: string;
  notes?: string;
  outOfOffice?: {
    start: string;
    end: string;
    message?: string;
  };
}

export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  workspaceOwnerId?: string;
  clientId?: string;
  disciplines?: string[];
  disciplineTasks?: string[];
  availability?: UserAvailability;
  bio?: string;
  earnedRates?: Record<string, number>;
  status: UserStatus;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDashboardStats {
  todaySeconds: number;
  weekSeconds: number;
  myProjectCount: number;
  openTaskCount: number;
}

export interface MemberDashboardResponse {
  stats: MemberDashboardStats;
}

// Client types
export type PaymentPreference = 'MAILED' | 'ACH';

export interface Client {
  _id: string;
  name: string;
  company?: string;
  email?: string;
  businessEntity?: string;
  address?: string;
  paymentPreference?: PaymentPreference;
  /** Self-work / internal workspace client */
  isInternal?: boolean;
  /** Hex color for Block Time (optional; UI may hash id when unset). Null clears on update. */
  calendarColor?: string | null;
  taskDiscounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// Project types
export type ProjectBillingMode = 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER';

export interface Project {
  _id: string;
  clientId: string | Client;
  title: string;
  description?: string;
  /** Rich-text brief notes (HTML) — projects screen only */
  brief?: string;
  /** Portfolio-aligned fields for easier conversion */
  excerpt?: string;
  year?: number;
  categories?: string[];
  disciplines?: string[];
  challenge?: string;
  solution?: string;
  results?: string[];
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  budget?: number;
  billingMode?: ProjectBillingMode;
  agreedAmount?: number;
  retainerHoursTotal?: number;
  retainerHoursAdjustment?: number;
  fixedPriceInvoiceLabel?: string;
  assignedMemberIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectCounts {
  ACTIVE: number;
  PAUSED: number;
  COMPLETED: number;
  ARCHIVED: number;
  TOTAL: number;
}

/** HOURLY standing budget vs effective billed (from time entries × rates); client-only enrichment */
export interface ProjectBudgetBurn {
  budget: number;
  billed: number;
  remaining: number;
  percentUsed: number;
}

export interface ProjectBudgetBurnResponse {
  periodLabel: string;
  byProject: Record<string, ProjectBudgetBurn>;
}

// Task Type types
export interface TaskType {
  _id: string;
  name: string;
  rate: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Project Task types
export interface ProjectTask {
  _id: string;
  projectId: string | Project;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  order: number;
  estimatedHours?: number;
  clientVisible?: boolean;
  assigneeAuth0Id?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMessageAuthorRole = 'admin' | 'member' | 'client';

export interface ProjectMessage {
  _id: string;
  userId: string;
  projectId: string;
  authorAuth0Id: string;
  authorName: string;
  authorRole: ProjectMessageAuthorRole;
  body: string;
  clientVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalProjectSummary {
  _id: string;
  title: string;
  excerpt?: string;
  status: ProjectStatus;
  updatedAt: string;
  openTaskCount: number;
}

export interface PortalProjectDetail {
  _id: string;
  title: string;
  excerpt?: string;
  status: ProjectStatus;
  brief?: string;
  description?: string;
  updatedAt: string;
}

export interface PortalProjectDetailResponse {
  project: PortalProjectDetail;
  tasks: Array<{
    _id: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
}

export interface PortalDashboardResponse {
  companyName?: string;
  companyEmail?: string;
  activeProjects: PortalProjectSummary[];
  recentUpdates: Array<{
    _id: string;
    body: string;
    authorName: string;
    authorRole: ProjectMessageAuthorRole;
    createdAt: string;
    projectId: string;
    projectTitle?: string;
  }>;
}

export interface PortalProjectsResponse {
  projects: PortalProjectSummary[];
}

export interface AdminDashboardSummary {
  todaySeconds: number;
  weekSeconds: number;
  lastWeekSeconds: number;
  weekTrendPercent: number | null;
  activeProjects: number;
  pausedProjects: number;
  openTasks: number;
  openLeads: number;
  unbilledWip: { amount: number; entryCount: number };
  outstanding: { count: number; total: number };
  invoiceAging: { oldestSentDays: number | null; sentCount: number };
}

export interface DashboardPipelineLead {
  _id: string;
  name: string;
  company?: string;
  status: LeadStatus;
  priority?: LeadPriority;
  updatedAt: string;
  createdAt: string;
}

export interface DashboardPipelineResponse {
  stats: LeadStats;
  recent: DashboardPipelineLead[];
}

export interface DashboardCapacityMember {
  auth0Id: string;
  name: string;
  disciplines: string[];
  hoursPerWeek?: number;
  preferredDays?: AvailabilityDay[];
  assignedProjectCount: number;
  openTaskCount: number;
  assignedEstimatedHours: number;
  loggedHoursThisWeek: number;
  scheduledBlockHoursThisWeek: number;
  utilizationPercent: number | null;
  outOfOffice?: UserAvailability['outOfOffice'];
}

export interface DashboardCapacityResponse {
  stub: boolean;
  members: DashboardCapacityMember[];
  totals: {
    memberCount: number;
    declaredHoursPerWeek: number;
    loggedHoursThisWeek: number;
    assignedOpenTasks: number;
  };
}

export type TimeBlockKind = 'WORK' | 'PERSONAL' | 'DOWNTIME' | 'MEETING' | 'ADMIN';

/** Expanded row from GET /api/time-blocks (includes recurring instances) */
export interface ExpandedTimeBlock {
  masterId: string;
  instanceKey: string;
  startTime: string;
  endTime: string;
  title: string;
  projectId?: string | Project;
  taskTypeId?: string | TaskType;
  projectTaskId?: string | ProjectTask;
  kind: TimeBlockKind;
  colorHint?: string;
  recurrenceRule?: string;
  notes?: string;
  launchedTimeEntryIds: string[];
  isRecurringInstance: boolean;
}

// Time Entry types
export interface TimeEntry {
  _id: string;
  userId?: string; // auth0Id of member who logged the entry
  projectId: string | Project;
  taskTypeId: string | TaskType;
  projectTaskId?: string | ProjectTask;
  blockId?: string;
  invoiceId?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isRunning: boolean;
  createdAt: string;
  updatedAt: string;
}

// Line Item (fixed-cost / ad-hoc charge)
export interface LineItem {
  _id: string;
  clientId: string | Client;
  projectId?: string | Project;
  invoiceId?: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Computed types
export interface InvoiceLineItem {
  taskTypeName: string;
  taskTypeColor: string;
  baseRate: number;
  discount: number;
  effectiveRate: number;
  hours: number;
  amount: number;
  earnedAmount?: number;
  descriptions: string[];
  isFixedCost: boolean;
  /** Agreed project fee (FIXED_PRICE) — client line, not hours×rate */
  isAgreedProjectFee?: boolean;
  /** Period hours by task type on HOUR_RETAINER reports — no client $ */
  isRetainerUtilizationRow?: boolean;
}

export interface RetainerProjectSummary {
  projectId: string;
  title: string;
  poolHours: number;
  adjustmentHours: number;
  consumedHoursAllTime: number;
  remainingHours: number;
}

export interface CostBreakdownEntry {
  userName: string;
  taskTypeName: string;
  hours: number;
  billed: number;
  earned: number;
  margin: number;
}

export interface CompanyInfo {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Invoice {
  invoiceNumber?: string;
  client?: Client;
  companyInfo?: CompanyInfo;
  items: InvoiceLineItem[];
  total: number;
  totalHours: number;
  totalEarned?: number;
  totalMargin?: number;
  costBreakdown?: CostBreakdownEntry[];
  entryCount: number;
  lineItemCount?: number;
  dateRange: {
    start: string;
    end: string;
  };
  /** Stripe Payment Link URL when set (for PDF / client copy) */
  paymentLinkUrl?: string;
  /** Preview generator mode */
  invoiceKind?: 'HOURLY' | 'FIXED_PRICE' | 'RETAINER_REPORT';
  /** Hour retainer: pool vs consumption (all-time) */
  retainerSummary?: {
    projects: RetainerProjectSummary[];
  };
}

// Saved Invoice (persisted record)
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';

export type InvoiceDocumentKind = 'INVOICE' | 'RETAINER_REPORT';

export interface SavedInvoice {
  _id: string;
  userId: string;
  invoiceNumber: string;
  clientId: string | Client;
  projectIds: string[];
  status: InvoiceStatus;
  documentKind?: InvoiceDocumentKind;
  dateRange: { start: string; end: string };
  companyInfo: CompanyInfo;
  clientInfo: {
    name: string;
    company?: string;
    email?: string;
    businessEntity?: string;
    address?: string;
    paymentPreference?: string;
  };
  items: InvoiceLineItem[];
  subtotal: number;
  total: number;
  totalHours: number;
  totalEarned: number;
  totalMargin: number;
  timeEntryIds: string[];
  lineItemIds: string[];
  sentAt?: string;
  paidAt?: string;
  paymentLinkUrl?: string;
  stripePaymentLinkId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  retainerSummary?: {
    projects: RetainerProjectSummary[];
  };
}

export interface InvoiceStats {
  draft: { count: number; total: number };
  sent: { count: number; total: number };
  paid: { count: number; total: number };
}

// Proposals (admin proposal generator)
export type ProposalStatus = 'DRAFT' | 'FINALIZED';

export interface ProposalPhase {
  name: string;
  summary?: string;
  bullets: string[];
  estimatedHours?: number;
  estimatedCost?: number;
  /** Human-readable timeline (e.g. "2–3 weeks") */
  duration?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProposalInvestmentLine {
  label: string;
  amount: number;
  hours?: number;
  duration?: string;
}

export interface ProposalInvestment {
  lineItems: ProposalInvestmentLine[];
  fees: number;
  notes?: string;
  subtotal: number;
  total: number;
}

export interface SavedProposal {
  _id: string;
  userId: string;
  proposalNumber: string;
  title: string;
  clientId: string | Client;
  projectId?: string | Project;
  projectTitle?: string;
  status: ProposalStatus;
  finalizedAt?: string;
  proposalDate: string;
  accentSnapshot: ThemeColors;
  companyInfo: CompanyInfo;
  clientInfo: {
    name: string;
    company?: string;
    email?: string;
    businessEntity?: string;
    address?: string;
  };
  introduction: string;
  challenge: string;
  solution: string;
  /** Assumptions, exclusions, open questions (markdown) */
  assumptions?: string;
  phases: ProposalPhase[];
  investment: ProposalInvestment;
  /** When true, server derives investment rows from phases on save */
  investmentSyncPhases?: boolean;
  terms: string;
  sourceMarkdown?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalStats {
  draft: { count: number };
  finalized: { count: number };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

// Portfolio types
export type PortfolioMediaType = 'image' | 'video';
export type PortfolioMediaSource = 'cloudinary' | 'vimeo' | 'youtube';

export interface PortfolioImage {
  url: string;
  caption?: string;
  type?: PortfolioMediaType;
  source?: PortfolioMediaSource;
}

export interface PortfolioTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface PortfolioProject {
  _id: string;
  slug: string;
  title: string;
  client: string;
  excerpt: string;
  description: string;
  categories: string[];
  disciplines: string[];
  year: number;
  featuredImage: string;
  clientLogo: string;
  images: PortfolioImage[];
  challenge?: string;
  solution?: string;
  results?: string[];
  testimonial?: PortfolioTestimonial;
  liveUrl?: string;
  featured: boolean;
  published: boolean;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Lead types
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConfidenceLevel = 'YES' | 'MAYBE' | 'UNSURE';
export type LeadSource = 'public' | 'manual' | 'referral';

export interface LeadNote {
  _id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface Lead {
  _id: string;
  userId: string;
  // Intake form data
  confidence: ConfidenceLevel;
  projectType: string;
  description: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  company: string;
  message: string;
  responses?: Record<string, unknown>;
  intakeFormId?: string;
  intakeFormVersion?: number;
  source?: LeadSource;
  // Pipeline management
  status: LeadStatus;
  priority: LeadPriority;
  notes: LeadNote[];
  // Conversion tracking
  convertedClientId?: string | Client;
  convertedProjectId?: string | Project;
  suggestedMemberAuth0Id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  NEW: number;
  CONTACTED: number;
  QUALIFIED: number;
  PROPOSAL: number;
  WON: number;
  LOST: number;
  TOTAL: number;
}

export interface ConvertLeadPayload {
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  projectTitle: string;
  projectDescription?: string;
  projectBudget?: number;
}

// Intake form types
export type IntakeFieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'phone'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'disciplines_needed'
  | 'file';

export type IntakeFormStatus = 'DRAFT' | 'PUBLISHED';

export interface IntakeFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface IntakeDisciplineOption {
  id: string;
  label: string;
}

export interface IntakeFieldShowWhen {
  fieldKey: string;
  equals: string | string[];
}

export interface IntakeField {
  key: string;
  type: IntakeFieldType;
  label: string;
  helpText?: string;
  required?: boolean;
  placeholder?: string;
  options?: IntakeFieldOption[];
  disciplineOptionIds?: string[];
  disciplineOptions?: IntakeDisciplineOption[];
  mapsTo?: string;
  showWhen?: IntakeFieldShowWhen;
  labelVariants?: Record<string, string>;
  placeholderVariants?: Record<string, string>;
  uiVariant?: 'cards' | 'pills' | 'default';
  accept?: string;
  maxFiles?: number;
}

export interface IntakeStepCopyVariant {
  title?: string;
  description?: string;
}

export interface IntakeStep {
  id: string;
  title: string;
  description?: string;
  copyVariants?: Record<string, IntakeStepCopyVariant>;
  fields: IntakeField[];
}

export interface IntakeForm {
  _id: string;
  userId: string;
  slug: string;
  status: IntakeFormStatus;
  version: number;
  publishedAt?: string;
  title: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps: IntakeStep[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicIntakeForm {
  _id: string;
  slug: string;
  version: number;
  title: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps: IntakeStep[];
  publishedAt?: string;
}

export interface UpdateIntakeFormPayload {
  title?: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps?: IntakeStep[];
}

export interface IntakeAttachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface DisciplineTask {
  id: string;
  name: string;
  taskTypeId: string;
  assignableToMember: boolean;
  sortOrder: number;
}

export interface DisciplineDefinition {
  id: string;
  name: string;
  description?: string;
  assignableToMember: boolean;
  showOnProject: boolean;
  sortOrder: number;
  tasks: DisciplineTask[];
}

// Site Config types
export interface ThemeColors {
  brandSage: string;
  brandSageLight: string;
  brandSageDark: string;
  brandCharcoal: string;
  brandCream: string;
  brandCreamDark: string;
  accentWarm: string;
  accentCool: string;
}

export interface ColorPalette {
  _id: string;
  name: string;
  colors: ThemeColors;
  createdAt: string;
}

export interface SiteConfig {
  _id?: string;
  colors: ThemeColors;
  palettes: ColorPalette[];
  disciplines?: DisciplineDefinition[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}
