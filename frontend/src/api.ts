import type {
  ApiError,
  AuthResponse,
  CreateEmployeePayload,
  DashboardResponse,
  EmployeeListItem,
  EmployeeProfile,
  ExpenseCategory,
  ExpenseResponse,
  PageResponse,
  PaymentMethod
} from './types';

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;
  }

  return 'http://localhost:8080/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

export async function getAttachmentBlob(token: string, attachmentId: string) {
  const response = await fetch(`${API_BASE_URL}/expenses/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar anexo.');
  }

  return response.blob();
}

const COMPANY_ID =
  import.meta.env.VITE_COMPANY_ID ??
  '00000000-0000-0000-0000-000000000001';

type RequestOptions = RequestInit & {
  token?: string | null;
};

interface ExpensePayload {
  title: string;
  category: ExpenseCategory;
  amount: string | null;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  description: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    const details = error?.errors?.length ? `: ${error.errors.join(', ')}` : '';
    throw new Error(`${error?.message ?? 'Falha na requisição'}${details}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function register(name: string, email: string, password: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      companyId: COMPANY_ID,
      name,
      email,
      password
    })
  });
}

// ── Employee ─────────────────────────────────────────────────────────

export async function getMyExpenses(token: string) {
  return request<PageResponse<ExpenseResponse>>('/expenses/my?size=50&sort=createdAt,desc', {
    method: 'GET',
    token
  });
}

export async function createExpense(
  token: string,
  payload: ExpensePayload,
  file: File
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append(
    'data',
    new Blob([JSON.stringify(payload)], { type: 'application/json' })
  );

  return request<ExpenseResponse>('/expenses', {
    method: 'POST',
    body: formData,
    token
  });
}

export async function submitExpense(token: string, expenseId: string) {
  return request<ExpenseResponse>(`/expenses/${expenseId}/submit`, {
    method: 'POST',
    token
  });
}

// ── Manager ──────────────────────────────────────────────────────────

export async function getManagerDashboard(token: string) {
  return request<DashboardResponse>('/manager/dashboard', { token });
}

export async function getTeamExpenses(token: string, status?: string, page = 0, size = 20) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: 'createdAt,desc' });
  if (status) params.set('status', status);
  return request<PageResponse<ExpenseResponse>>(`/manager/expenses?${params}`, { token });
}

export async function getTeamExpenseDetail(token: string, expenseId: string) {
  return request<ExpenseResponse>(`/manager/expenses/${expenseId}`, { token });
}

export async function approveExpense(token: string, expenseId: string) {
  return request<ExpenseResponse>(`/manager/expenses/${expenseId}/approve`, {
    method: 'POST',
    token
  });
}

export async function rejectExpense(token: string, expenseId: string, notes: string) {
  return request<ExpenseResponse>(`/manager/expenses/${expenseId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
    token
  });
}

export async function requestRevision(token: string, expenseId: string, notes: string) {
  return request<ExpenseResponse>(`/manager/expenses/${expenseId}/request-revision`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
    token
  });
}

// ── Manager: Employees ────────────────────────────────────────────

export async function getTeamEmployees(token: string) {
  return request<EmployeeListItem[]>('/manager/employees', { token });
}

export async function getTeamEmployee(token: string, employeeId: string) {
  return request<EmployeeProfile>(`/manager/employees/${employeeId}`, { token });
}

export async function createEmployee(token: string, payload: CreateEmployeePayload) {
  return request<EmployeeListItem>('/manager/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}
