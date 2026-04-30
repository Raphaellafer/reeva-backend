import type { AuthResponse } from '../types'

const TOKEN_KEY = 'reeva.auth.token'
const USER_KEY = 'reeva.auth.user'
const ROLE_KEY = 'reeva.role'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthResponse | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthResponse
  } catch {
    return null
  }
}

export function persistAuth(auth: AuthResponse, frontendRole: string): void {
  localStorage.setItem(TOKEN_KEY, auth.token)
  localStorage.setItem(USER_KEY, JSON.stringify(auth))
  localStorage.setItem(ROLE_KEY, frontendRole)
  localStorage.setItem('reeva.apiRole', auth.role)
  localStorage.setItem('reeva.token', auth.token)
  localStorage.setItem('reeva.userName', auth.name)
  localStorage.setItem('reeva.userEmail', auth.email)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem('reeva.apiRole')
  localStorage.removeItem('reeva.token')
  localStorage.removeItem('reeva.userName')
  localStorage.removeItem('reeva.userEmail')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY) && !!localStorage.getItem(ROLE_KEY)
}
