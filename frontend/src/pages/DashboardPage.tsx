import { useQuery } from '@tanstack/react-query';
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
  const { data: sessionList = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const weekSessions = getWeekSessions(sessionList);
  const lastSession = sessionList[0] ?? null;

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
          <p className="text-3xl font-bold text-white mt-1">{sessionList.length}</p>
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
