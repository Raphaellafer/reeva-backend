import type {
  ApiError,
  AuthResponse,
  DashboardResponse,
  ExpenseCategory,
  ExpenseResponse,
  PageResponse,
  PaymentBatchResponse,
  PolicyPayload,
  PolicyResponse,
  PaymentMethod,
  ProjectPayload,
  ProjectResponse,
  TeamMemberResponse
} from './types';

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:8080/api/v1`;
}

const API_BASE_URL = resolveApiBaseUrl();
const FRONTEND_ORIGIN = window.location.origin;
const API_ORIGIN = new URL(API_BASE_URL).origin;

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
  projectId: string;
  amount: string | null;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  description: string;
}

async function diagnoseNetworkFailure(): Promise<string> {
  const healthUrl = `${API_ORIGIN}/actuator/health`;

  try {
    await fetch(healthUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store'
    });

    return [
      `A API em ${API_BASE_URL} parece estar acessivel, mas o navegador bloqueou a requisicao.`,
      `Origem atual do frontend: ${FRONTEND_ORIGIN}.`,
      'Verifique CORS, a URL aberta no navegador e se o frontend esta apontando para a API correta.'
    ].join(' ');
  } catch {
    return `Falha ao conectar na API em ${API_BASE_URL}. Verifique se o backend esta rodando e acessivel a partir de ${FRONTEND_ORIGIN}.`;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (err) {
    throw new Error(await diagnoseNetworkFailure());
  }

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

export async function getMyExpense(token: string, expenseId: string) {
  return request<ExpenseResponse>(`/expenses/${expenseId}`, {
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

export async function retryExpenseOcr(token: string, expenseId: string) {
  return request<ExpenseResponse>(`/expenses/${expenseId}/retry-ocr`, {
    method: 'POST',
    token
  });
}

export async function getMyProjects(token: string) {
  return request<ProjectResponse[]>('/projects/my', { token });
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

export async function getPolicies(token: string) {
  return request<PolicyResponse[]>('/manager/policies', { token });
}

export async function savePolicy(token: string, payload: PolicyPayload) {
  return request<PolicyResponse>('/manager/policies', {
    method: 'PUT',
    body: JSON.stringify(payload),
    token
  });
}

export async function getManagedProjects(token: string) {
  return request<ProjectResponse[]>('/manager/projects', { token });
}

export async function createProject(token: string, payload: ProjectPayload) {
  return request<ProjectResponse>('/manager/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}

export async function updateProject(token: string, projectId: string, payload: ProjectPayload) {
  return request<ProjectResponse>(`/manager/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token
  });
}

export async function getTeamMembers(token: string) {
  return request<TeamMemberResponse[]>('/manager/team-members', { token });
}

export async function getApprovedPayments(token: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return request<PaymentBatchResponse>(`/manager/payments/approved${query ? `?${query}` : ''}`, { token });
}
