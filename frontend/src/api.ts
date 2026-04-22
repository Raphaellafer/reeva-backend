import type {
  ApiError,
  AuthResponse,
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

const COMPANY_ID =
  import.meta.env.VITE_COMPANY_ID ??
  '00000000-0000-0000-0000-000000000001';

type RequestOptions = RequestInit & {
  token?: string | null;
};

interface ExpensePayload {
  title: string;
  category: ExpenseCategory;
  amount: string;
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
