import type { AuthTokens, Exercise, WorkoutSession, WorkoutSet, MuscleGroup, ProgressionPoint, WorkoutTemplate, SessionExercise } from './types';
import * as offline from './offline';

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

  me: () => apiFetch<{ id: number; email: string; name: string; createdAt: string }>('/auth/me'),

  requestDeletion: () =>
    apiFetch<{ message: string }>('/auth/request-deletion', { method: 'POST' }),
};

// --- Exercises ---
export const exercises = {
  // Mise en cache pour permettre le "remplacer un exercice" hors-ligne.
  list: async (): Promise<Exercise[]> => {
    try {
      const list = await apiFetch<Exercise[]>('/exercises');
      offline.cache.exercises.set(list);
      return list;
    } catch (err) {
      const cached = offline.cache.exercises.get();
      if (cached && offline.isNetworkError(err)) return cached;
      throw err;
    }
  },
  muscleGroups: () => apiFetch<MuscleGroup[]>('/exercises/muscle-groups'),
  get: (id: number) => apiFetch<Exercise>(`/exercises/${id}`),
  create: (data: { name: string; muscleGroupId: number; equipment?: string; description?: string }) =>
    apiFetch<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; muscleGroupId: number; equipment: string; description: string }>) =>
    apiFetch<Exercise>(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/exercises/${id}`, { method: 'DELETE' }),
};

// --- Sessions ---
// Appels "bruts" (sans gestion hors-ligne) réutilisés par le flush de l'outbox.
const rawSessions = {
  get: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}`),
  list: () => apiFetch<WorkoutSession[]>('/sessions'),
  getActive: () => apiFetch<WorkoutSession | null>('/sessions/active'),
  end: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/end`, { method: 'POST' }),
  addSet: (sessionId: number, data: { exerciseId: number; setNumber: number; reps: number; weight: number; rpe?: number; notes?: string }) =>
    apiFetch<WorkoutSet>(`/sessions/${sessionId}/sets`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSet: (sessionId: number, setId: number) =>
    apiFetch<void>(`/sessions/${sessionId}/sets/${setId}`, { method: 'DELETE' }),
};

export const sessions = {
  list: async (): Promise<WorkoutSession[]> => {
    try {
      const list = await rawSessions.list();
      offline.cache.sessionList.set(list);
      return list;
    } catch (err) {
      const cached = offline.cache.sessionList.get();
      if (cached && offline.isNetworkError(err)) return cached;
      throw err;
    }
  },

  get: async (id: number): Promise<WorkoutSession> => {
    try {
      const session = await rawSessions.get(id);
      offline.cache.session.set(session);
      return session;
    } catch (err) {
      const snap = offline.cache.session.get(id);
      if (snap && offline.isNetworkError(err)) return snap;
      throw err;
    }
  },

  getActive: async (): Promise<WorkoutSession | null> => {
    try {
      const active = await rawSessions.getActive();
      offline.cache.activeSession.set(active);
      return active;
    } catch (err) {
      if (offline.isNetworkError(err)) return offline.cache.activeSession.get();
      throw err;
    }
  },

  create: (data: { name?: string; notes?: string; exercises?: SessionExercise[] }) =>
    apiFetch<WorkoutSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ name: string; notes: string; duration: number; date: string; exercises: SessionExercise[] }>) =>
    apiFetch<WorkoutSession>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' }),
  pause: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/pause`, { method: 'POST' }),
  resume: (id: number) => apiFetch<WorkoutSession>(`/sessions/${id}/resume`, { method: 'POST' }),

  end: async (id: number): Promise<WorkoutSession> => {
    if (offline.isOnline()) {
      const ended = await rawSessions.end(id);
      offline.cache.session.set(ended);
      offline.cache.activeSession.set(null);
      return ended;
    }
    const snap = offline.cache.session.get(id);
    const ended: WorkoutSession = { ...(snap as WorkoutSession), status: 'completed', pausedAt: null };
    if (snap) offline.cache.session.set(ended);
    offline.cache.activeSession.set(null);
    offline.enqueue({ kind: 'end', sessionId: id });
    return ended;
  },

  addSet: async (
    sessionId: number,
    data: { exerciseId: number; setNumber: number; reps: number; weight: number; rpe?: number; notes?: string },
  ): Promise<WorkoutSet> => {
    if (offline.isOnline()) {
      const saved = await rawSessions.addSet(sessionId, data);
      offline.patchSnapshot(sessionId, (s) => ({ ...s, sets: [...s.sets, saved] }));
      return saved;
    }
    const tmpId = offline.nextTmpId();
    const synthetic: WorkoutSet = {
      id: tmpId,
      sessionId,
      exerciseId: data.exerciseId,
      exercise: offline.exerciseFromCache(data.exerciseId),
      setNumber: data.setNumber,
      reps: data.reps,
      weight: data.weight,
      rpe: data.rpe ?? null,
      notes: data.notes ?? null,
    };
    offline.patchSnapshot(sessionId, (s) => ({ ...s, sets: [...s.sets, synthetic] }));
    offline.enqueue({
      kind: 'addSet',
      sessionId,
      tmpId,
      payload: { exerciseId: data.exerciseId, setNumber: data.setNumber, reps: data.reps, weight: data.weight },
    });
    return synthetic;
  },

  updateSet: (sessionId: number, setId: number, data: Partial<{ setNumber: number; reps: number; weight: number; rpe: number; notes: string }>) =>
    apiFetch<WorkoutSet>(`/sessions/${sessionId}/sets/${setId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSet: async (sessionId: number, setId: number): Promise<void> => {
    if (offline.isOnline()) {
      await rawSessions.deleteSet(sessionId, setId);
      offline.patchSnapshot(sessionId, (s) => ({ ...s, sets: s.sets.filter((x) => x.id !== setId) }));
      return;
    }
    offline.patchSnapshot(sessionId, (s) => ({ ...s, sets: s.sets.filter((x) => x.id !== setId) }));
    if (setId < 0) {
      // Série jamais synchronisée : on annule simplement son ajout en attente.
      offline.dropPendingSet(setId);
    } else {
      offline.enqueue({ kind: 'deleteSet', sessionId, setId });
    }
  },

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

// ─── Synchronisation de l'outbox ────────────────────────────────────────────

let flushing = false;

/**
 * Rejoue les opérations mises en attente hors-ligne, dans l'ordre. À la moindre
 * erreur (réseau de nouveau coupé, session expirée, serveur indisponible) on
 * s'arrête en gardant le reste de la file ; elle sera retentée au retour du
 * réseau, au prochain passage au premier plan, ou via le bouton « Synchroniser ».
 */
export async function flushOutbox(): Promise<void> {
  if (flushing || !offline.isOnline()) return;
  let ops = offline.getOutbox();
  if (ops.length === 0) return;

  flushing = true;
  const idMap = new Map<number, number>(); // id temporaire (négatif) -> id serveur
  try {
    while (ops.length > 0) {
      const op = ops[0]!;
      try {
        await applyOp(op, idMap);
      } catch (err) {
        console.warn('[offline] synchronisation interrompue, reprise plus tard', op, err);
        break;
      }
      ops = ops.slice(1);
      offline.replaceOutbox(ops);
    }
  } finally {
    flushing = false;
  }

  // File entièrement vidée : on resynchronise le snapshot local avec l'état réel
  // du serveur et on signale la fin (pour recharger l'écran de séance). Si le
  // flush a été interrompu, on garde le snapshot local tel quel — il contient
  // encore les séries pas encore envoyées.
  if (offline.getOutbox().length > 0) return;

  try {
    const active = await sessions.getActive();
    if (active) await sessions.get(active.id);
  } catch {
    /* pas grave — sera retenté plus tard */
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('outbox-flushed'));
  }
}

async function applyOp(op: offline.OutboxOp, idMap: Map<number, number>): Promise<void> {
  if (op.kind === 'addSet') {
    const saved = await rawSessions.addSet(op.sessionId, op.payload);
    idMap.set(op.tmpId, saved.id);
  } else if (op.kind === 'deleteSet') {
    const realId = op.setId < 0 ? idMap.get(op.setId) : op.setId;
    if (realId == null) return; // série créée puis supprimée entièrement hors-ligne
    await rawSessions.deleteSet(op.sessionId, realId);
  } else if (op.kind === 'end') {
    await rawSessions.end(op.sessionId);
  }
}
