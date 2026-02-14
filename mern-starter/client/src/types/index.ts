// User types
export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
}

// Client types
export interface Client {
  _id: string;
  name: string;
  company?: string;
  email?: string;
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
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  budget?: number;
  createdAt: string;
  updatedAt: string;
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

// Time Entry types
export interface TimeEntry {
  _id: string;
  projectId: string | Project;
  taskTypeId: string | TaskType;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isRunning: boolean;
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
  descriptions: string[];
}

export interface Invoice {
  client?: Client;
  items: InvoiceLineItem[];
  total: number;
  totalHours: number;
  entryCount: number;
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

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
}
