import type { Exercise, WorkoutSession } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Support hors-ligne de la séance active.
//
// Principe : quand le réseau est présent, chaque GET rafraîchit un cache local
// (localStorage). Quand il est absent, les lectures retombent sur ce cache et
// les écritures (ajout / suppression de série, fin de séance) sont appliquées
// localement puis empilées dans un "outbox" rejoué au retour du réseau.
// ─────────────────────────────────────────────────────────────────────────────

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota dépassé ou storage indisponible — on ignore */
  }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

// ─── Caches de lecture ───────────────────────────────────────────────────────

const sessionKey = (id: number) => `offline:session:${id}`;

export const cache = {
  session: {
    get: (id: number) => read<WorkoutSession>(sessionKey(id)),
    set: (s: WorkoutSession) => write(sessionKey(s.id), s),
  },
  sessionList: {
    get: () => read<WorkoutSession[]>('offline:sessions'),
    set: (l: WorkoutSession[]) => write('offline:sessions', l),
  },
  exercises: {
    get: () => read<Exercise[]>('offline:exercises'),
    set: (l: Exercise[]) => write('offline:exercises', l),
  },
  activeSession: {
    get: () => read<WorkoutSession | null>('offline:active'),
    set: (s: WorkoutSession | null) => write('offline:active', s),
  },
};

/** Applique une transformation au snapshot d'une séance, si présent. */
export function patchSnapshot(
  id: number,
  fn: (s: WorkoutSession) => WorkoutSession,
): void {
  const s = cache.session.get(id);
  if (s) cache.session.set(fn(s));
}

/** Reconstruit un objet Exercise à partir du cache de la bibliothèque. */
export function exerciseFromCache(id: number): Exercise {
  const found = cache.exercises.get()?.find((e) => e.id === id);
  if (found) return found;
  return {
    id,
    name: 'Exercice',
    muscleGroupId: 0,
    muscleGroup: { id: 0, name: '' },
    equipment: null,
    description: null,
    isCustom: false,
    createdById: null,
  };
}

// ─── Identifiants temporaires ────────────────────────────────────────────────
// Les séries créées hors-ligne reçoivent un id négatif (donc jamais en conflit
// avec un id serveur, qui est toujours positif). Le flush le remplace par l'id
// réel une fois la série créée côté API.

let tmpCounter = -Date.now();
export function nextTmpId(): number {
  return tmpCounter--;
}

// ─── Outbox ─────────────────────────────────────────────────────────────────

export type OutboxOp =
  | {
      id: string;
      kind: 'addSet';
      sessionId: number;
      tmpId: number;
      payload: { exerciseId: number; setNumber: number; reps: number; weight: number };
    }
  | { id: string; kind: 'deleteSet'; sessionId: number; setId: number }
  | { id: string; kind: 'end'; sessionId: number };

const OUTBOX_KEY = 'offline:outbox';

export function getOutbox(): OutboxOp[] {
  return read<OutboxOp[]>(OUTBOX_KEY) ?? [];
}

export function replaceOutbox(ops: OutboxOp[]): void {
  write(OUTBOX_KEY, ops);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('outbox-change'));
  }
}

export function outboxCount(): number {
  return getOutbox().length;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Omit distributif : conserve chaque variante de l'union au lieu de n'en garder
// que les propriétés communes.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export function enqueue(op: DistributiveOmit<OutboxOp, 'id'>): void {
  replaceOutbox([...getOutbox(), { ...op, id: newId() } as OutboxOp]);
}

/**
 * Annule une série jamais synchronisée : retire son `addSet` de l'outbox (et,
 * par sécurité, toute opération ultérieure ciblant le même id temporaire).
 */
export function dropPendingSet(tmpId: number): void {
  const ops = getOutbox();
  const next = ops.filter(
    (op) =>
      !(op.kind === 'addSet' && op.tmpId === tmpId) &&
      !(op.kind === 'deleteSet' && op.setId === tmpId),
  );
  if (next.length !== ops.length) replaceOutbox(next);
}

/** Type guard : erreur réseau (fetch qui rejette) vs réponse HTTP d'erreur. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
