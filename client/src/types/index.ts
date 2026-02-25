// User types
export type UserRole = 'admin' | 'member' | 'pending';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  workspaceOwnerId?: string;
  earnedRates?: Record<string, number>;
  status: UserStatus;
  invitedBy?: string;
  createdAt: string;
  updatedAt: string;
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
  taskDiscounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// Project types
export interface Project {
  _id: string;
  clientId: string | Client;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  budget?: number;
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
  createdAt: string;
  updatedAt: string;
}

// Time Entry types
export interface TimeEntry {
  _id: string;
  userId?: string; // auth0Id of member who logged the entry
  projectId: string | Project;
  taskTypeId: string | TaskType;
  projectTaskId?: string | ProjectTask;
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
export interface PortfolioImage {
  url: string;
  caption?: string;
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

export interface LeadNote {
  _id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface Lead {
  _id: string;
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
  // Pipeline management
  status: LeadStatus;
  priority: LeadPriority;
  notes: LeadNote[];
  // Conversion tracking
  convertedClientId?: string | Client;
  convertedProjectId?: string | Project;
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
