import type { AuthTokens, Exercise, WorkoutSession, WorkoutSet, MuscleGroup, ProgressionPoint, WorkoutTemplate, SessionExercise } from './types';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

let isRefreshing = false;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 && !isRefreshing) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((error as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return false;
    }

    const tokens = (await res.json()) as AuthTokens;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return true;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

// --- Auth ---
export const auth = {
  register: (email: string, name: string, password: string) =>
    apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken: string) =>
    apiFetch<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => apiFetch<{ id: number; email: string }>('/auth/me'),
};

// --- Exercises ---
export const exercises = {
  list: () => apiFetch<Exercise[]>('/exercises'),
  muscleGroups: () => apiFetch<MuscleGroup[]>('/exercises/muscle-groups'),
  get: (id: number) => apiFetch<Exercise>(`/exercises/${id}`),
  create: (data: { name: string; muscleGroupId: number; equipment?: string; description?: string }) =>
    apiFetch<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; muscleGroupId: number; equipment: string; description: string }>) =>
    apiFetch<Exercise>(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/exercises/${id}`, { method: 'DELETE' }),
};

// --- Sessions ---
export const sessions = {
  list: () => apiFetch<WorkoutSession[]>('/sessions'),
  get: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}`),
  getActive: () => apiFetch<WorkoutSession | null>('/sessions/active'),
  create: (data: { name?: string; notes?: string; exercises?: SessionExercise[] }) =>
    apiFetch<WorkoutSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; notes: string; duration: number; date: string; exercises: SessionExercise[] }>) =>
    apiFetch<WorkoutSession>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' }),
  pause: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/pause`, { method: 'POST' }),
  resume: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/resume`, { method: 'POST' }),
  end: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/end`, { method: 'POST' }),

  addSet: (sessionId: number, data: { exerciseId: number; setNumber: number; reps: number; weight: number; rpe?: number; notes?: string }) =>
    apiFetch<WorkoutSet>(`/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(data) }),
  updateSet: (sessionId: number, setId: number, data: Partial<{ setNumber: number; reps: number; weight: number; rpe: number; notes: string }>) =>
    apiFetch<WorkoutSet>(`/sessions/${sessionId}/sets/${setId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSet: (sessionId: number, setId: number) =>
    apiFetch<void>(`/sessions/${sessionId}/sets/${setId}`, { method: 'DELETE' }),

  progression: (exerciseId: number) =>
    apiFetch<ProgressionPoint[]>(`/sessions/progression/${exerciseId}`),
};

// --- Templates ---
export const templates = {
  list: () => apiFetch<WorkoutTemplate[]>('/templates'),
  get: (id: number) => apiFetch<WorkoutTemplate>(`/templates/${id}`),
  create: (data: { name: string; exercises: Array<{ exerciseId: number; comment?: string; sets?: number; reps?: number; weight?: number }> }) =>
    apiFetch<WorkoutTemplate>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; exercises: Array<{ exerciseId: number; comment?: string; sets?: number; reps?: number; weight?: number }> }) =>
    apiFetch<WorkoutTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/templates/${id}`, { method: 'DELETE' }),
};
