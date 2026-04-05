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

  const { data: activeSession } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: sessions.getActive,
  });

  const deleteMutation = useMutation({
    mutationFn: sessions.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const abandonMutation = useMutation({
    mutationFn: () => sessions.delete(activeSession!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const completedSessions = sessionList.filter(s => s.status === 'completed');

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

      {/* Active session card */}
      {activeSession && (
        <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-300 font-semibold text-sm">Séance en cours</p>
              <p className="text-white font-medium mt-0.5">{activeSession.name ?? 'Séance sans nom'}</p>
              <p className="text-indigo-400/70 text-xs mt-0.5">
                Démarrée à {new Date(activeSession.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {activeSession.pausedAt && ' · En pause'}
              </p>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full ${activeSession.pausedAt ? 'bg-amber-400' : 'bg-green-400 animate-pulse'}`} />
          </div>
          <div className="flex gap-2">
            <Link
              to={`/sessions/${activeSession.id}`}
              className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              Reprendre
            </Link>
            <button
              onClick={() => { if (confirm('Abandonner et supprimer la séance ?')) abandonMutation.mutate(); }}
              disabled={abandonMutation.isPending}
              className="flex-1 bg-gray-800 hover:bg-red-900/40 hover:border-red-700 border border-gray-700 text-gray-300 hover:text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

      {completedSessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-3">Aucune séance enregistrée</p>
          <Link to="/sessions/new" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Créer votre première séance →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {completedSessions.map(session => {
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
