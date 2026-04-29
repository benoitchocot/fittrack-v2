import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth, sessions } from '../lib/api';
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

export default function ProfilePage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [deletionSent, setDeletionSent] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
  });

  const { data: sessionList = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const { data: activeSession } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: sessions.getActive,
  });

  const deletionMutation = useMutation({
    mutationFn: auth.requestDeletion,
    onSuccess: () => setDeletionSent(true),
    onError: (err: Error) => setDeletionError(err.message),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: sessions.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const abandonMutation = useMutation({
    mutationFn: () => sessions.delete(activeSession!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  function handleDeletionRequest() {
    if (!confirm('Confirmer la demande de suppression de ton compte ? Tu recevras une réponse par email.')) return;
    setDeletionError(null);
    deletionMutation.mutate();
  }

  const completedSessions = sessionList.filter(s => s.status === 'completed');

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Profil</h1>

      {/* User info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Nom</p>
          <p className="text-white mt-0.5">{me?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
          <p className="text-white mt-0.5">{me?.email ?? '—'}</p>
        </div>
        {me?.createdAt && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Membre depuis</p>
            <p className="text-white mt-0.5">
              {new Date(me.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg transition-colors"
      >
        Se déconnecter
      </button>

      {/* Session history */}
      <div className="border-t border-gray-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="flex items-center gap-2 text-left group"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">
              Historique des séances
            </p>
            <span className={`text-gray-600 text-sm transition-transform duration-200 ${historyOpen ? 'rotate-90' : ''}`}>›</span>
          </button>
          <Link
            to="/sessions/new"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Nouvelle séance
          </Link>
        </div>

        {historyOpen && activeSession && (
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

        {historyOpen && sessionsLoading ? (
          <div className="text-gray-500 text-sm">Chargement...</div>
        ) : historyOpen && completedSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p className="text-sm">Aucune séance enregistrée</p>
            <Link to="/sessions/new" className="text-indigo-400 hover:text-indigo-300 text-sm mt-1 inline-block">
              Créer ta première séance →
            </Link>
          </div>
        ) : historyOpen ? (
          <div className="space-y-2">
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
                        <span className={`text-gray-500 ml-2 text-sm shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>›</span>
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
                      onClick={() => { if (confirm('Supprimer ?')) deleteSessionMutation.mutate(session.id); }}
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
        ) : null}
      </div>

      {/* Legal */}
      <div className="border-t border-gray-800 pt-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Légal</p>
        <div className="flex gap-4 text-sm">
          <Link to="/cgu" className="text-gray-400 hover:text-white transition-colors">
            Conditions générales
          </Link>
          <Link to="/rgpd" className="text-gray-400 hover:text-white transition-colors">
            Données personnelles
          </Link>
        </div>
      </div>

      {/* Account management */}
      <div className="border-t border-gray-800 pt-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Gestion du compte</p>

        {deletionSent ? (
          <p className="text-sm text-green-400">
            Ta demande a bien été envoyée. Tu seras contacté à l'adresse {me?.email}.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Pour supprimer ton compte et toutes tes données, envoie une demande. Elle sera traitée manuellement.
            </p>
            {deletionError && (
              <p className="text-xs text-red-400">{deletionError}</p>
            )}
            <button
              onClick={handleDeletionRequest}
              disabled={deletionMutation.isPending}
              className="text-sm text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {deletionMutation.isPending ? 'Envoi en cours...' : 'Demander la suppression de mon compte'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
