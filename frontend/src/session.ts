import { login } from './api';
import type { AuthResponse, UserRole as ApiRole } from './types';
import type { UserRole as UiRole } from './types/index';

const demoProfiles: Record<UiRole, { email: string; password: string; apiRole: ApiRole }> = {
  FUNCIONARIO: { email: 'funcionario@reeva.com.br', password: 'reeva123', apiRole: 'EMPLOYEE' },
  GERENTE: { email: 'gestor@reeva.com.br', password: 'reeva123', apiRole: 'MANAGER' },
  CFO: { email: 'gestor@reeva.com.br', password: 'reeva123', apiRole: 'MANAGER' }
};

export function getToken() {
  return localStorage.getItem('reeva.token');
}

export function getUserName() {
  return localStorage.getItem('reeva.userName') ?? 'Usuario';
}

export function clearSession() {
  localStorage.removeItem('reeva.role');
  localStorage.removeItem('reeva.apiRole');
  localStorage.removeItem('reeva.token');
  localStorage.removeItem('reeva.userName');
  localStorage.removeItem('reeva.userEmail');
}

export async function startDemoSession(role: UiRole): Promise<AuthResponse> {
  const profile = demoProfiles[role];
  const auth = await login(profile.email, profile.password);
  localStorage.setItem('reeva.role', role);
  localStorage.setItem('reeva.apiRole', auth.role);
  localStorage.setItem('reeva.token', auth.token);
  localStorage.setItem('reeva.userName', auth.name);
  localStorage.setItem('reeva.userEmail', auth.email);
  return auth;
}
