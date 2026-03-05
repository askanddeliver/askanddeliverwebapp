import axios from 'axios';
import type {
  User,
  Client,
  Project,
  ProjectStatus,
  ProjectCounts,
  TaskType,
  ProjectTask,
  TimeEntry,
  LineItem,
  Invoice,
  InvoiceStatus,
  SavedInvoice,
  InvoiceStats,
  PortfolioProject,
  Lead,
  LeadStats,
  LeadStatus,
  LeadPriority,
  ConvertLeadPayload,
  SiteConfig,
  ThemeColors,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// Token storage key
const TOKEN_KEY = 'auth0_token';

// Set the auth token for API requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize token from storage on load
const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear it
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

// ---- API Service Methods ----

// Users (current user profile + role)
export const usersApi = {
  getMe: () => api.get<User>('/users/me'),
  updateMe: (data: Partial<Pick<User, 'name' | 'picture'>>) =>
    api.put<User>('/users/me', data),
  // Admin only
  getAll: () => api.get<User[]>('/users'),
  addByEmail: (email: string) =>
    api.post<User>('/users/add-by-email', { email }),
  update: (id: string, data: Partial<Pick<User, 'role' | 'status' | 'earnedRates'>>) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
};

// Clients
export const clientsApi = {
  getAll: () => api.get<Client[]>('/clients'),
  getOne: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) => api.post<Client>('/clients', data),
  update: (id: string, data: Partial<Client>) =>
    api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Projects
export const projectsApi = {
  getAll: (params?: {
    status?: ProjectStatus | 'ALL';
    search?: string;
    sort?: string;
    clientId?: string;
  }) => api.get<Project[]>('/projects', { params }),
  getCounts: () => api.get<ProjectCounts>('/projects/counts'),
  getByClient: (clientId: string) =>
    api.get<Project[]>(`/projects/client/${clientId}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data),
  archive: (id: string) => api.put<Project>(`/projects/${id}/archive`),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Task Types
export const taskTypesApi = {
  getAll: () => api.get<TaskType[]>('/task-types'),
  create: (data: Partial<TaskType>) =>
    api.post<TaskType>('/task-types', data),
  update: (id: string, data: Partial<TaskType>) =>
    api.put<TaskType>(`/task-types/${id}`, data),
  delete: (id: string) => api.delete(`/task-types/${id}`),
  seedDefaults: () => api.post<TaskType[]>('/task-types/seed'),
};

// Project Tasks
export const projectTasksApi = {
  getAll: (params?: { projectId?: string }) =>
    api.get<ProjectTask[]>('/project-tasks', { params }),
  getOne: (id: string) => api.get<ProjectTask>(`/project-tasks/${id}`),
  create: (data: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    estimatedHours?: number;
  }) => api.post<ProjectTask>('/project-tasks', data),
  update: (id: string, data: Partial<ProjectTask>) =>
    api.put<ProjectTask>(`/project-tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch<ProjectTask>(`/project-tasks/${id}/status`, { status }),
  reorder: (projectId: string, taskIds: string[]) =>
    api.put<ProjectTask[]>('/project-tasks/reorder', { projectId, taskIds }),
  delete: (id: string) => api.delete(`/project-tasks/${id}`),
};

// Time Entries
export const timeEntriesApi = {
  getAll: (params?: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
    projectIds?: string[];
    billingStatus?: 'unbilled' | 'paid' | 'all';
  }) => api.get<TimeEntry[]>('/time-entries', { params }),
  getActive: () => api.get<TimeEntry | null>('/time-entries/active'),
  start: (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
  }) => api.post<TimeEntry>('/time-entries/start', data),
  stop: () => api.post<TimeEntry>('/time-entries/stop'),
  continue: (id: string) => api.post<TimeEntry>(`/time-entries/${id}/continue`),
  create: (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
  }) => api.post<TimeEntry>('/time-entries', data),
  update: (id: string, data: Partial<TimeEntry>) =>
    api.put<TimeEntry>(`/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
};

// Line Items (fixed-cost charges)
export const lineItemsApi = {
  getAll: (params?: {
    clientId?: string;
    projectId?: string;
    projectIds?: string[];
    startDate?: string;
    endDate?: string;
  }) => api.get<LineItem[]>('/line-items', { params }),
  create: (data: {
    clientId: string;
    projectId?: string;
    description: string;
    amount: number;
    category?: string;
    date: string;
  }) => api.post<LineItem>('/line-items', data),
  update: (id: string, data: Partial<LineItem>) =>
    api.put<LineItem>(`/line-items/${id}`, data),
  delete: (id: string) => api.delete(`/line-items/${id}`),
};

// Reports
export const reportsApi = {
  generateInvoice: (data: {
    clientId?: string;
    projectId?: string;
    projectIds?: string[];
    startDate: string;
    endDate: string;
  }) => api.post<Invoice>('/reports/generate-invoice', data),
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/summary', { params }),
};

// Export
export const exportApi = {
  csv: (data: {
    clientId?: string;
    projectId?: string;
    projectIds?: string[];
    startDate?: string;
    endDate?: string;
  }) =>
    api.post('/export/csv', data, {
      responseType: 'blob',
    }),
  backup: () =>
    api.post('/export/backup', {}, {
      responseType: 'json',
    }),
};

// Invoices
export const invoicesApi = {
  getAll: (params?: {
    status?: InvoiceStatus | 'ALL';
    clientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => api.get<SavedInvoice[]>('/invoices', { params }),
  getOne: (id: string) => api.get<SavedInvoice>(`/invoices/${id}`),
  getStats: () => api.get<InvoiceStats>('/invoices/stats'),
  getNextNumber: () => api.get<{ invoiceNumber: string }>('/invoices/next-number'),
  create: (data: {
    invoiceNumber?: string;
    clientId: string;
    projectIds?: string[];
    dateRange: { start: string; end: string };
    items: Invoice['items'];
    subtotal?: number;
    total: number;
    totalHours?: number;
    totalEarned?: number;
    totalMargin?: number;
    timeEntryIds?: string[];
    lineItemIds?: string[];
    notes?: string;
  }) => api.post<SavedInvoice>('/invoices', data),
  update: (id: string, data: { invoiceNumber?: string; notes?: string }) =>
    api.put<SavedInvoice>(`/invoices/${id}`, data),
  updateStatus: (id: string, status: InvoiceStatus) =>
    api.patch<SavedInvoice>(`/invoices/${id}/status`, { status }),
  delete: (id: string) => api.delete<{ message: string }>(`/invoices/${id}`),
};

// Portfolio (admin - authenticated)
export const portfolioApi = {
  getAll: () => api.get<PortfolioProject[]>('/portfolio'),
  getOne: (id: string) => api.get<PortfolioProject>(`/portfolio/${id}`),
  create: (data: Partial<PortfolioProject>) =>
    api.post<PortfolioProject>('/portfolio', data),
  update: (id: string, data: Partial<PortfolioProject>) =>
    api.put<PortfolioProject>(`/portfolio/${id}`, data),
  delete: (id: string) => api.delete(`/portfolio/${id}`),
  togglePublish: (id: string) =>
    api.patch<PortfolioProject>(`/portfolio/${id}/publish`),
  toggleFeature: (id: string) =>
    api.patch<PortfolioProject>(`/portfolio/${id}/feature`),
  reorder: (projectIds: string[]) =>
    api.put<PortfolioProject[]>('/portfolio/reorder', { projectIds }),
  seed: (projects: Partial<PortfolioProject>[]) =>
    api.post<PortfolioProject[]>('/portfolio/seed', { projects }),
};

// Portfolio (public - unauthenticated)
export const portfolioPublicApi = {
  getAll: () => api.get<PortfolioProject[]>('/portfolio/public'),
  getFeatured: () => api.get<PortfolioProject[]>('/portfolio/public/featured'),
  getBySlug: (slug: string) =>
    api.get<PortfolioProject>(`/portfolio/public/${slug}`),
};

// Leads (admin - authenticated)
export const leadsApi = {
  getAll: (params?: {
    status?: LeadStatus | 'ALL';
    priority?: LeadPriority;
    search?: string;
    sort?: string;
  }) => api.get<Lead[]>('/leads', { params }),
  getOne: (id: string) => api.get<Lead>(`/leads/${id}`),
  getStats: () => api.get<LeadStats>('/leads/stats'),
  update: (id: string, data: Partial<Lead>) =>
    api.put<Lead>(`/leads/${id}`, data),
  addNote: (id: string, text: string) =>
    api.post<Lead>(`/leads/${id}/notes`, { text }),
  convert: (
    id: string,
    data: ConvertLeadPayload
  ) =>
    api.post<{ message: string; lead: Lead; client: Client; project: Project }>(
      `/leads/${id}/convert`,
      data
    ),
  delete: (id: string) => api.delete(`/leads/${id}`),
};

// Leads (public - unauthenticated, uses raw axios to skip auth header)
export const leadsPublicApi = {
  submit: (data: {
    confidence: string;
    projectType?: string;
    description?: string;
    budget?: string;
    timeline?: string;
    name: string;
    email: string;
    company?: string;
    message?: string;
  }) =>
    axios.post<{ message: string; leadId: string }>(
      `${API_URL}/leads/public`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    ),
};

// Uploads
export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

export const uploadsApi = {
  uploadSingle: (projectSlug: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<UploadedFile>(`/uploads/portfolio/${projectSlug}/single`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (projectSlug: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return api.post<{ message: string; files: UploadedFile[] }>(
      `/uploads/portfolio/${projectSlug}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  listFiles: (projectSlug: string) =>
    api.get<{ files: { filename: string; url: string; size: number; modified: string }[] }>(
      `/uploads/portfolio/${projectSlug}`
    ),
  deleteFile: (projectSlug: string, filename: string) =>
    api.delete(`/uploads/portfolio/${projectSlug}/${filename}`),
};

// Site Config (admin - authenticated)
export const siteConfigApi = {
  get: () => api.get<SiteConfig>('/site-config'),
  updateColors: (colors: ThemeColors) =>
    api.put<SiteConfig>('/site-config/colors', { colors }),
  updateCompany: (data: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
  }) => api.put<SiteConfig>('/site-config/company', data),
  reset: () => api.put<SiteConfig>('/site-config/reset'),
  savePalette: (name: string, colors: ThemeColors) =>
    api.post<SiteConfig>('/site-config/palettes', { name, colors }),
  renamePalette: (paletteId: string, name: string) =>
    api.put<SiteConfig>(`/site-config/palettes/${paletteId}`, { name }),
  deletePalette: (paletteId: string) =>
    api.delete<SiteConfig>(`/site-config/palettes/${paletteId}`),
};

// Site Config (public - unauthenticated)
export const siteConfigPublicApi = {
  getColors: () =>
    axios.get<ThemeColors>(`${API_URL}/site-config/public`),
};

export default api;
