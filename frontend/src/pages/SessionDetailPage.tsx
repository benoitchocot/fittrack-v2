import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { sessions, exercises as exercisesApi } from '../lib/api';
import { useOnline } from '../hooks/useOnline';
import type { WorkoutSet, SessionExercise, Exercise } from '../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function computeElapsed(startedAt: string, pausedAt: string | null, pausedDuration: number): number {
  const started = new Date(startedAt).getTime();
  const pausedMs = pausedDuration * 1000;
  if (pausedAt) {
    return Math.floor((new Date(pausedAt).getTime() - started - pausedMs) / 1000);
  }
  return Math.floor((Date.now() - started - pausedMs) / 1000);
}

type SetRow = { weight: string; reps: string; savedId: number | null };

function initRows(
  defaultSets: number | null,
  savedSets: WorkoutSet[],
  lastSets: Array<{ weight: number; reps: number }> = [],
): SetRow[] {
  if (savedSets.length > 0) {
    return savedSets.map(s => ({ weight: String(s.weight), reps: String(s.reps), savedId: s.id }));
  }
  const count = defaultSets ?? Math.max(lastSets.length, 3);
  return Array.from({ length: count }, (_, i) => {
    const last = lastSets[i] ?? lastSets[lastSets.length - 1] ?? null;
    return { weight: last ? String(last.weight) : '', reps: last ? String(last.reps) : '', savedId: null };
  });
}

// ─── ExercisePicker ──────────────────────────────────────────────────────────

interface ExercisePickerProps {
  allExercises: Exercise[];
  onSelect: (ex: Exercise) => void;
  onCancel: () => void;
}

function ExercisePicker({ allExercises, onSelect, onCancel }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query.length >= 1
    ? allExercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="mt-2 bg-gray-800 border border-indigo-700/50 rounded-lg overflow-hidden">
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un exercice..."
        className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none border-b border-gray-700"
      />
      {filtered.length > 0 ? (
        <div className="max-h-48 overflow-y-auto">
          {filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
            >
              <span className="text-white">{ex.name}</span>
              <span className="text-gray-500 text-xs ml-2">{ex.muscleGroup.name}</span>
            </button>
          ))}
        </div>
      ) : query.length >= 1 ? (
        <p className="px-3 py-2 text-sm text-gray-500">Aucun résultat</p>
      ) : null}
      <button
        onClick={onCancel}
        className="w-full text-center py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors border-t border-gray-700"
      >
        Annuler
      </button>
    </div>
  );
}

// ─── ExerciseBlock ───────────────────────────────────────────────────────────

interface ExerciseBlockProps {
  sessionId: number;
  exerciseId: number;
  name: string;
  muscleGroup: string;
  comment: string | null;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultWeight: number | null;
  savedSets: WorkoutSet[];
  lastSets: Array<{ weight: number; reps: number }>;
  lastSessionDate?: string;
  isActive: boolean;
  allExercises: Exercise[];
  onSetsChange: () => void;
  onReplace: (newExercise: Exercise) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function ExerciseBlock({
  sessionId, exerciseId, name, muscleGroup, comment,
  defaultSets, defaultReps, defaultWeight,
  savedSets, lastSets, lastSessionDate,
  isActive, allExercises, onSetsChange, onReplace,
  onMoveUp, onMoveDown,
}: ExerciseBlockProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SetRow[]>(() => initRows(defaultSets, savedSets, lastSets));
  const [replacing, setReplacing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setRows(prev => {
      if (prev.length === 0) return initRows(defaultSets, savedSets, lastSets);
      const validIds = new Set(savedSets.map(s => s.id));
      return prev.map(r => ({
        ...r,
        savedId: r.savedId !== null && !validIds.has(r.savedId) ? null : r.savedId,
      }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSets.length]);

  const addSetMutation = useMutation({
    mutationFn: (data: { setNumber: number; weight: number; reps: number }) =>
      sessions.addSet(sessionId, { exerciseId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      onSetsChange();
    },
  });

  const deleteSetMutation = useMutation({
    mutationFn: (setId: number) => sessions.deleteSet(sessionId, setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] });
      onSetsChange();
    },
  });

  async function toggleSet(idx: number) {
    const row = rows[idx]!;
    if (row.savedId) {
      await deleteSetMutation.mutateAsync(row.savedId);
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, savedId: null } : r));
    } else {
      const w = parseFloat(row.weight);
      const r = parseInt(row.reps);
      if (isNaN(w) || isNaN(r) || r <= 0) return;
      const setNumber = rows.filter((r, i) => i <= idx && r.savedId !== null).length + 1;
      const saved = await addSetMutation.mutateAsync({ setNumber, weight: w, reps: r });
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, savedId: saved.id } : r));
    }
  }

  function updateRow(idx: number, field: 'weight' | 'reps', value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { weight: '0', reps: '0', savedId: null }]);
  }

  async function deleteRow(idx: number) {
    const row = rows[idx]!;
    if (row.savedId) await deleteSetMutation.mutateAsync(row.savedId);
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  const doneCount = rows.filter(r => r.savedId !== null).length;
  const total = rows.length;

  return (
    <div className={`rounded-xl border transition-colors ${open ? 'border-indigo-700/60 bg-gray-900' : 'border-gray-800 bg-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 min-w-0 text-left px-4 py-3 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{name}</p>
            <p className="text-xs text-gray-500">{muscleGroup}</p>
          </div>
          <div className="flex items-center gap-3 ml-3 shrink-0">
            {doneCount > 0 && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${doneCount === total ? 'bg-green-900/60 text-green-400' : 'bg-indigo-900/60 text-indigo-400'}`}>
                {doneCount}/{total}
              </span>
            )}
            <span className={`text-gray-400 transition-transform text-sm ${open ? 'rotate-90' : ''}`}>›</span>
          </div>
        </button>
        {(onMoveUp || onMoveDown) && (
          <div className="flex flex-col pr-1 py-1 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors"
              title="Monter"
            >↑</button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors"
              title="Descendre"
            >↓</button>
          </div>
        )}
        {isActive && (
          <button
            onClick={() => { setReplacing(v => !v); setOpen(true); }}
            className="pr-4 pl-2 py-3 text-xs text-gray-600 hover:text-indigo-400 transition-colors shrink-0"
            title="Remplacer l'exercice"
          >
            ⇄
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/60 pt-3">
          {/* Replace picker */}
          {replacing && (
            <ExercisePicker
              allExercises={allExercises.filter(e => e.id !== exerciseId)}
              onSelect={ex => { onReplace(ex); setReplacing(false); }}
              onCancel={() => setReplacing(false)}
            />
          )}

          {/* Exercise comment */}
          {comment && (
            <div className="text-xs text-indigo-300/80 bg-indigo-950/40 border border-indigo-900/40 rounded-lg px-3 py-2 whitespace-pre-line">
              {comment}
            </div>
          )}

          {/* Last session reference */}
          {lastSets.length > 0 && lastSessionDate && (
            <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
              <p className="text-gray-400 font-medium mb-1">Dernière fois · {formatDate(lastSessionDate)}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {lastSets.map((s, i) => (
                  <span key={i} className="text-gray-500">Série {i + 1} : {s.weight} kg × {s.reps}</span>
                ))}
              </div>
            </div>
          )}

          {/* Set rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2rem_2rem] gap-2 text-xs text-gray-500 px-1">
              <span>#</span><span>Poids (kg)</span><span>Reps</span><span></span><span></span>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2rem_2rem] gap-2 items-center">
                <span className="text-xs text-gray-500 text-center">{idx + 1}</span>
                <input
                  value={row.weight}
                  onChange={e => updateRow(idx, 'weight', e.target.value)}
                  type="number"
                  placeholder={defaultWeight != null ? String(defaultWeight) : '—'}
                  disabled={!!row.savedId}
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <input
                  value={row.reps}
                  onChange={e => updateRow(idx, 'reps', e.target.value)}
                  type="number"
                  placeholder={defaultReps != null ? String(defaultReps) : '—'}
                  disabled={!!row.savedId}
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  onClick={() => toggleSet(idx)}
                  disabled={addSetMutation.isPending || deleteSetMutation.isPending}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-sm
                    ${row.savedId
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-600 bg-transparent hover:border-indigo-400'
                    }`}
                >
                  {row.savedId ? '✓' : ''}
                </button>
                <button
                  onClick={() => deleteRow(idx)}
                  disabled={addSetMutation.isPending || deleteSetMutation.isPending}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors text-base disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow} className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">
            + Ajouter une série
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id ?? '');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // Bumpé quand l'outbox vient d'être vidée : force les blocs d'exercice à se
  // reconstruire à partir des séries réelles (id serveur au lieu d'id temporaire).
  const [syncNonce, setSyncNonce] = useState(0);

  const { data: session, isLoading } = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => sessions.get(sessionId),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const { data: allExercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: exercisesApi.list,
  });

  // Après une synchro réussie de l'outbox, on recharge la séance et on remonte
  // les blocs pour repartir des séries réelles.
  useEffect(() => {
    const onFlushed = () => {
      setSyncNonce((n) => n + 1);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    };
    window.addEventListener('outbox-flushed', onFlushed);
    return () => window.removeEventListener('outbox-flushed', onFlushed);
  }, [queryClient]);

  // Timer
  useEffect(() => {
    if (!session) return;
    if (session.status !== 'active') return;

    setElapsed(Math.max(0, computeElapsed(session.startedAt, session.pausedAt, session.pausedDuration)));

    if (session.pausedAt) return; // paused — don't tick

    const interval = setInterval(() => {
      setElapsed(Math.max(0, computeElapsed(session.startedAt, session.pausedAt, session.pausedDuration)));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.startedAt, session?.pausedAt, session?.pausedDuration, session?.status]);

  const pauseMutation = useMutation({
    mutationFn: () => sessions.pause(sessionId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['sessions', sessionId], updated);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => sessions.resume(sessionId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['sessions', sessionId], updated);
    },
  });

  const endMutation = useMutation({
    mutationFn: () => sessions.end(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: () => sessions.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });

  const updateExercisesMutation = useMutation({
    mutationFn: (exercises: SessionExercise[]) => sessions.update(sessionId, { exercises }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['sessions', sessionId], updated);
    },
  });

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;
  if (!session) return <div className="text-red-400">Séance introuvable</div>;

  const isActive = session.status === 'active';
  const isPaused = !!session.pausedAt;

  // Build history lookup
  function getLastSets(exerciseId: number): { sets: Array<{ weight: number; reps: number }>; date: string } | null {
    const previous = allSessions
      .filter(s => s.id !== sessionId && s.status === 'completed' && s.sets.some(set => set.exerciseId === exerciseId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!previous.length) return null;
    const last = previous[0]!;
    const sets = last.sets
      .filter(s => s.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map(s => ({ weight: s.weight, reps: s.reps }));
    return { sets, date: last.date };
  }

  function getSavedSets(exerciseId: number): WorkoutSet[] {
    return session!.sets.filter(s => s.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
  }

  // Determine exercise list: from session snapshot or fallback to extra sets
  const plannedExercises: SessionExercise[] = session.exercises ?? [];
  const plannedIds = new Set(plannedExercises.map(e => e.exerciseId));

  const extraExerciseIds = [...new Set(
    session.sets
      .filter(s => !plannedIds.has(s.exerciseId))
      .map(s => s.exerciseId)
  )];

  function handleMoveExercise(idx: number, direction: 'up' | 'down') {
    if (!online) return; // réorganisation indisponible hors-ligne
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= plannedExercises.length) return;
    const next = [...plannedExercises];
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
    updateExercisesMutation.mutate(next);
  }

  function handleReplaceExercise(idx: number, newExercise: Exercise) {
    if (!online) return; // remplacement d'exercice indisponible hors-ligne
    const updated = plannedExercises.map((e, i) =>
      i === idx
        ? {
            exerciseId: newExercise.id,
            name: newExercise.name,
            muscleGroupName: newExercise.muscleGroup.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            comment: e.comment,
          }
        : e
    );
    updateExercisesMutation.mutate(updated);
  }

  const totalSets = session.sets.length;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Timer bar — only for active sessions */}
      {isActive && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-mono font-bold ${isPaused ? 'text-gray-500' : 'text-white'}`}>
              {formatDuration(elapsed)}
            </span>
            {isPaused && <span className="text-xs text-amber-500 font-medium">EN PAUSE</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => isPaused ? resumeMutation.mutate() : pauseMutation.mutate()}
              disabled={pauseMutation.isPending || resumeMutation.isPending || !online}
              title={!online ? 'Indisponible hors ligne' : undefined}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {isPaused ? '▶ Reprendre' : '⏸ Pause'}
            </button>
            <button
              onClick={() => { if (confirm('Terminer et enregistrer la séance ?')) endMutation.mutate(); }}
              disabled={endMutation.isPending}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{session.name ?? 'Séance'}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{formatDate(session.date)}</p>
          {totalSets > 0 && (
            <p className="text-xs text-gray-500 mt-1">{totalSets} série{totalSets > 1 ? 's' : ''} validée{totalSets > 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => { if (confirm('Supprimer cette séance ?')) deleteSessionMutation.mutate(); }}
          disabled={!online}
          title={!online ? 'Indisponible hors ligne' : undefined}
          className="text-gray-600 hover:text-red-400 text-sm transition-colors disabled:opacity-40 disabled:hover:text-gray-600"
        >
          Supprimer
        </button>
      </div>

      {/* Planned exercises */}
      {plannedExercises.length > 0 && (
        <div className="space-y-2">
          {plannedExercises.map((se, idx) => {
            const last = getLastSets(se.exerciseId);
            return (
              <ExerciseBlock
                key={`${se.exerciseId}-${idx}-${syncNonce}`}
                sessionId={sessionId}
                exerciseId={se.exerciseId}
                name={se.name}
                muscleGroup={se.muscleGroupName}
                comment={se.comment ?? null}
                defaultSets={se.sets ?? null}
                defaultReps={se.reps ?? null}
                defaultWeight={se.weight ?? null}
                savedSets={getSavedSets(se.exerciseId)}
                lastSets={last?.sets ?? []}
                lastSessionDate={last?.date}
                isActive={isActive && online}
                allExercises={allExercises}
                onSetsChange={() => setTick(t => t + 1)}
                onReplace={(newEx) => handleReplaceExercise(idx, newEx)}
                onMoveUp={idx > 0 && online ? () => handleMoveExercise(idx, 'up') : undefined}
                onMoveDown={idx < plannedExercises.length - 1 && online ? () => handleMoveExercise(idx, 'down') : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Extra exercises (sets outside planned list) */}
      {extraExerciseIds.length > 0 && (
        <div className="space-y-2">
          {plannedExercises.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Exercices supplémentaires</p>
          )}
          {extraExerciseIds.map(exerciseId => {
            const saved = getSavedSets(exerciseId);
            const last = getLastSets(exerciseId);
            const ex = saved[0]!.exercise;
            return (
              <ExerciseBlock
                key={`${exerciseId}-${syncNonce}`}
                sessionId={sessionId}
                exerciseId={exerciseId}
                name={ex.name}
                muscleGroup={ex.muscleGroup.name}
                comment={null}
                defaultSets={null}
                defaultReps={null}
                defaultWeight={null}
                savedSets={saved}
                lastSets={last?.sets ?? []}
                lastSessionDate={last?.date}
                isActive={isActive && online}
                allExercises={allExercises}
                onSetsChange={() => setTick(t => t + 1)}
                onReplace={() => {}} // extra exercises can't be replaced (no planned slot)
              />
            );
          })}
        </div>
      )}

      {plannedExercises.length === 0 && extraExerciseIds.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          Aucun exercice. Démarre une séance depuis un template pour avoir les exercices pré-remplis.
        </p>
      )}

      <span className="hidden">{tick}</span>
    </div>
  );
}
