import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sessions } from '../lib/api';
import type { WorkoutSession } from '../lib/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function getWeekSessions(sessionList: WorkoutSession[]) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return sessionList.filter(s => new Date(s.date) >= weekAgo);
}

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: sessionList = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const { data: activeSession } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: sessions.getActive,
  });

  const abandonMutation = useMutation({
    mutationFn: () => sessions.delete(activeSession!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const completedSessions = sessionList.filter(s => s.status === 'completed');
  const weekSessions = getWeekSessions(completedSessions);
  const lastSession = completedSessions[0] ?? null;
  const totalSetsThisWeek = weekSessions.reduce((acc, s) => acc + s.sets.length, 0);

  if (isLoading) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Séances cette semaine</p>
          <p className="text-3xl font-bold text-white mt-1">{weekSessions.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Séries cette semaine</p>
          <p className="text-3xl font-bold text-white mt-1">{totalSetsThisWeek}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total séances</p>
          <p className="text-3xl font-bold text-white mt-1">{completedSessions.length}</p>
        </div>
      </div>

      {/* Dernière séance */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Dernière séance</h2>
        {lastSession ? (
          <Link
            to={`/sessions/${lastSession.id}`}
            className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white">{lastSession.name ?? 'Séance sans nom'}</span>
              <span className="text-sm text-gray-400">{formatDate(lastSession.date)}</span>
            </div>
            <p className="text-sm text-gray-400">
              {lastSession.sets.length} série{lastSession.sets.length > 1 ? 's' : ''}
              {lastSession.duration ? ` · ${lastSession.duration} min` : ''}
            </p>
          </Link>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400 mb-3">Aucune séance enregistrée</p>
            <Link
              to="/sessions/new"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              Commencer maintenant →
            </Link>
          </div>
        )}
      </div>

      {/* Séances de la semaine */}
      {weekSessions.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Cette semaine</h2>
          <div className="space-y-2">
            {weekSessions.map(session => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-3 transition-colors"
              >
                <span className="text-white text-sm font-medium">{session.name ?? 'Séance sans nom'}</span>
                <span className="text-gray-400 text-sm">{formatDate(session.date)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
