import type { AppState, Budget, Category, RecurringRule, Transaction } from '@/types';
import { clearPersistedState } from '@/store/persistence';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'centsible:api-token';

export type ApiRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface OrganizationUser {
  id: string;
  email: string;
  role: ApiRole;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

function token(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUserRole(): ApiRole | null {
  const currentToken = token();
  if (!currentToken) return null;

  try {
    const payload = JSON.parse(atob(currentToken.split('.')[1] ?? '')) as { role?: ApiRole };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new Error(body.error ?? `API request failed (${response.status})`);
  return body as T;
}

export function hasApiSession(): boolean {
  return Boolean(token());
}

export function clearApiSession(): void {
  window.localStorage.clear();
  clearPersistedState();
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { token?: string; error?: string };
  if (!response.ok || !body.token) throw new Error(body.error ?? 'Unable to sign in');
  clearPersistedState();
  window.localStorage.setItem(TOKEN_KEY, body.token);
}

export async function register(email: string, password: string, organizationName: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, organizationName }),
  });
  const body = (await response.json()) as { token?: string; error?: string };
  if (!response.ok || !body.token) throw new Error(body.error ?? 'Unable to create account');
  clearPersistedState();
  window.localStorage.setItem(TOKEN_KEY, body.token);
}

export async function fetchRemoteState(current: AppState): Promise<AppState> {
  const [categories, transactions, budgets, recurringRules] = await Promise.all([
    request<{ data: Category[] }>('/categories'),
    request<{ data: Transaction[] }>('/transactions'),
    request<{ data: Budget[] }>('/budgets'),
    request<{ data: RecurringRule[] }>('/recurringRules'),
  ]);
  return {
    ...current,
    categories: categories.data,
    transactions: transactions.data,
    budgets: budgets.data,
    recurringRules: recurringRules.data,
  };
}

export async function fetchUsers(): Promise<OrganizationUser[]> {
  const data = await request<{ users: OrganizationUser[] }>('/users');
  return data.users;
}

export async function updateUserRole(userId: string, role: ApiRole): Promise<OrganizationUser> {
  const data = await request<{ user: OrganizationUser }>(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return data.user;
}
