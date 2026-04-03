import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { sessions, templates } from '../lib/api';
import type { WorkoutSet, WorkoutTemplateExercise } from '../lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function parseSetsCount(comment: string | null): number {
  if (!comment) return 3;
  const m = comment.match(/(\d+)\s*[×x]/);
  return m ? Math.min(parseInt(m[1]), 8) : 3;
}

function parseDefaultReps(comment: string | null): string {
  if (!comment) return '';
  const m = comment.match(/(\d+)(?:–(\d+))?\s*reps/i);
  if (!m) return '';
  return m[2] ?? m[1] ?? '';
}

type SetRow = { weight: string; reps: string; savedId: number | null };

function initRows(
  comment: string | null,
  savedSets: WorkoutSet[],
  lastSets: Array<{ weight: number; reps: number }>,
): SetRow[] {
  if (savedSets.length > 0) {
    return savedSets.map(s => ({ weight: String(s.weight), reps: String(s.reps), savedId: s.id }));
  }
  const count = parseSetsCount(comment);
  const defaultReps = parseDefaultReps(comment);
  return Array.from({ length: count }, (_, i) => ({
    weight: lastSets[i] ? String(lastSets[i]!.weight) : '',
    reps: lastSets[i] ? String(lastSets[i]!.reps) : defaultReps,
    savedId: null,
  }));
}

// ─── ExerciseBlock ───────────────────────────────────────────────────────────

interface ExerciseBlockProps {
  sessionId: number;
  exerciseId: number;
  name: string;
  muscleGroup: string;
  comment: string | null;
  savedSets: WorkoutSet[];
  lastSets: Array<{ weight: number; reps: number }>;
  lastSessionDate?: string;
  onSetsChange: () => void;
}

function ExerciseBlock({
  sessionId, exerciseId, name, muscleGroup, comment,
  savedSets, lastSets, lastSessionDate, onSetsChange,
}: ExerciseBlockProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SetRow[]>(() => initRows(comment, savedSets, lastSets));
  const queryClient = useQueryClient();

  // Re-sync rows when savedSets changes from outside
  useEffect(() => {
    setRows(initRows(comment, savedSets, lastSets));
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
      // Uncheck → delete
      await deleteSetMutation.mutateAsync(row.savedId);
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, savedId: null } : r));
    } else {
      // Check → save
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
    const last = rows[rows.length - 1];
    setRows(prev => [...prev, { weight: last?.weight ?? '', reps: last?.reps ?? '', savedId: null }]);
  }

  const doneCount = rows.filter(r => r.savedId !== null).length;
  const total = rows.length;

  return (
    <div className={`rounded-xl border transition-colors ${open ? 'border-indigo-700/60 bg-gray-900' : 'border-gray-800 bg-gray-900'}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 flex items-center justify-between"
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

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800/60 pt-3">
          {/* Comment */}
          {comment && (
            <p className="text-xs text-indigo-300/80 whitespace-pre-line break-words overflow-hidden bg-indigo-950/40 rounded-lg px-3 py-2">
              {comment}
            </p>
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
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 text-xs text-gray-500 px-1">
              <span>#</span><span>Poids (kg)</span><span>Reps</span><span></span>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 items-center">
                <span className="text-xs text-gray-500 text-center">{idx + 1}</span>
                <input
                  value={row.weight}
                  onChange={e => updateRow(idx, 'weight', e.target.value)}
                  type="number"
                  placeholder="—"
                  disabled={!!row.savedId}
                  className="w-full min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <input
                  value={row.reps}
                  onChange={e => updateRow(idx, 'reps', e.target.value)}
                  type="number"
                  placeholder="—"
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
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
          >
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
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId') ? parseInt(searchParams.get('templateId')!) : null;
  const sessionId = parseInt(id ?? '');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0); // force re-render when sets change

  const { data: session, isLoading } = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => sessions.get(sessionId),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const { data: template } = useQuery({
    queryKey: ['templates', templateId],
    queryFn: () => templates.get(templateId!),
    enabled: templateId !== null,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: () => sessions.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;
  if (!session) return <div className="text-red-400">Séance introuvable</div>;

  // Build history lookup: exerciseId → {sets, date} from last session before this one
  function getLastSets(exerciseId: number): { sets: Array<{ weight: number; reps: number }>; date: string } | null {
    const previous = allSessions
      .filter(s => s.id !== sessionId && s.sets.some(set => set.exerciseId === exerciseId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!previous.length) return null;
    const last = previous[0]!;
    const sets = last.sets
      .filter(s => s.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map(s => ({ weight: s.weight, reps: s.reps }));
    return { sets, date: last.date };
  }

  // Determine exercises to show: template first, then any extra in session
  const templateExercises: WorkoutTemplateExercise[] = template?.exercises ?? [];
  const templateExerciseIds = new Set(templateExercises.map(te => te.exerciseId));

  // Extra sets not from template
  const extraExerciseIds = [...new Set(
    session.sets
      .filter(s => !templateExerciseIds.has(s.exerciseId))
      .map(s => s.exerciseId)
  )];

  function getSavedSets(exerciseId: number): WorkoutSet[] {
    return session!.sets.filter(s => s.exerciseId === exerciseId).sort((a, b) => a.setNumber - b.setNumber);
  }

  const totalSets = session.sets.length;

  return (
    <div className="space-y-4 max-w-2xl">
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
          className="text-gray-600 hover:text-red-400 text-sm transition-colors"
        >
          Supprimer
        </button>
      </div>

      {/* Template exercises */}
      {templateExercises.length > 0 && (
        <div className="space-y-2">
          {templateExercises.map(te => {
            const last = getLastSets(te.exerciseId);
            return (
              <ExerciseBlock
                key={te.exerciseId}
                sessionId={sessionId}
                exerciseId={te.exerciseId}
                name={te.exercise.name}
                muscleGroup={te.exercise.muscleGroup.name}
                comment={te.comment}
                savedSets={getSavedSets(te.exerciseId)}
                lastSets={last?.sets ?? []}
                lastSessionDate={last?.date}
                onSetsChange={() => setTick(t => t + 1)}
              />
            );
          })}
        </div>
      )}

      {/* Extra exercises (added outside template) */}
      {extraExerciseIds.length > 0 && (
        <div className="space-y-2">
          {templateExercises.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Exercices supplémentaires</p>
          )}
          {extraExerciseIds.map(exerciseId => {
            const saved = getSavedSets(exerciseId);
            const last = getLastSets(exerciseId);
            const ex = saved[0]!.exercise;
            return (
              <ExerciseBlock
                key={exerciseId}
                sessionId={sessionId}
                exerciseId={exerciseId}
                name={ex.name}
                muscleGroup={ex.muscleGroup.name}
                comment={null}
                savedSets={saved}
                lastSets={last?.sets ?? []}
                lastSessionDate={last?.date}
                onSetsChange={() => setTick(t => t + 1)}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {templateExercises.length === 0 && extraExerciseIds.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          Aucun exercice. Crée la séance depuis un template pour avoir les exercices pré-remplis.
        </p>
      )}

      {/* Tick to force re-render (suppress unused var warning) */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
