// Note: Auth types are provided by express-oauth2-jwt-bearer
// No need to augment Express.Request - the library does this automatically

// Environment variables type
export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  MONGODB_URI: string;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  CLIENT_URL?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// DTO types
export interface CreateClientDto {
  name: string;
  company?: string;
  email?: string;
  taskDiscounts?: Record<string, number>;
}

export interface UpdateClientDto {
  name?: string;
  company?: string;
  email?: string;
  taskDiscounts?: Record<string, number>;
}

export interface CreateProjectDto {
  clientId: string;
  title: string;
  description?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  budget?: number;
}

export interface CreateTaskTypeDto {
  name: string;
  rate: number;
  color?: string;
}

export interface CreateTimeEntryDto {
  projectId: string;
  taskTypeId: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  picture?: string;
}

export interface InvoiceRequest {
  clientId?: string;
  projectId?: string;
  startDate: string;
  endDate: string;
}
