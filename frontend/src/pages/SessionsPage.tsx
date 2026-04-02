import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sessions } from '../lib/api';
import type { WorkoutSession } from '../lib/types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByExercise(session: WorkoutSession) {
  const map = new Map<string, { name: string; sets: typeof session.sets }>();
  for (const set of session.sets) {
    const key = String(set.exerciseId);
    if (!map.has(key)) map.set(key, { name: set.exercise.name, sets: [] });
    map.get(key)!.sets.push(set);
  }
  return [...map.values()];
}

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: sessionList = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const deleteMutation = useMutation({
    mutationFn: sessions.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <Link
          to="/sessions/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Nouvelle séance
        </Link>
      </div>

      {sessionList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-3">Aucune séance enregistrée</p>
          <Link to="/sessions/new" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Créer votre première séance →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessionList.map(session => {
            const groups = groupByExercise(session);
            const isOpen = expanded === session.id;
            return (
              <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center px-4 py-3 gap-3">
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white truncate">{session.name ?? 'Séance sans nom'}</p>
                      <span className={`text-gray-500 ml-2 text-sm shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {formatDate(session.date)}
                      {' · '}
                      {session.sets.length} série{session.sets.length > 1 ? 's' : ''}
                      {session.duration ? ` · ${session.duration} min` : ''}
                    </p>
                  </button>
                  <Link
                    to={`/sessions/${session.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-xs shrink-0 transition-colors"
                  >
                    Ouvrir
                  </Link>
                  <button
                    onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(session.id); }}
                    className="text-gray-600 hover:text-red-400 text-xs shrink-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {isOpen && groups.length > 0 && (
                  <div className="border-t border-gray-800 px-4 py-3 space-y-3">
                    {groups.map(({ name, sets }) => (
                      <div key={name}>
                        <p className="text-sm font-medium text-white mb-1">{name}</p>
                        <div className="flex flex-wrap gap-2">
                          {sets.sort((a, b) => a.setNumber - b.setNumber).map(s => (
                            <span key={s.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                              {s.weight} kg × {s.reps}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
