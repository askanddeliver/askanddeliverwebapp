import axios from 'axios';
import type { Client, Project, TaskType, ProjectTask, TimeEntry, Invoice, PortfolioProject } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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
  getAll: () => api.get<Project[]>('/projects'),
  getByClient: (clientId: string) =>
    api.get<Project[]>(`/projects/client/${clientId}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data),
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
  }) => api.get<TimeEntry[]>('/time-entries', { params }),
  getActive: () => api.get<TimeEntry | null>('/time-entries/active'),
  start: (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
  }) => api.post<TimeEntry>('/time-entries/start', data),
  stop: () => api.post<TimeEntry>('/time-entries/stop'),
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

// Reports
export const reportsApi = {
  generateInvoice: (data: {
    clientId?: string;
    projectId?: string;
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
    startDate?: string;
    endDate?: string;
  }) =>
    api.post('/export/csv', data, {
      responseType: 'blob',
    }),
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

export default api;
