import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { sessions } from '../lib/api';

interface ExerciseStat {
  exerciseId: number;
  name: string;
  count: number;
}

function ExerciseCard({ stat }: { stat: ExerciseStat }) {
  const [expanded, setExpanded] = useState(false);

  const { data: progression = [], isLoading } = useQuery({
    queryKey: ['progression', stat.exerciseId],
    queryFn: () => sessions.progression(stat.exerciseId),
    enabled: expanded,
  });

  const chartData = progression.map(p => ({
    date: new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    poids: p.maxWeight,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{stat.name}</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {stat.count} séance{stat.count > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="bg-indigo-900/50 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            ×{stat.count}
          </span>
          <span className={`text-gray-500 text-base transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
            ›
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-4 pt-4 pb-5">
          {isLoading ? (
            <div className="text-gray-500 text-sm py-4 text-center">Chargement...</div>
          ) : progression.length === 0 ? (
            <div className="text-gray-500 text-sm py-4 text-center">Aucune donnée disponible.</div>
          ) : (
            <>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Poids max par séance</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} kg`, 'Poids max']}
                    cursor={{ stroke: '#374151', strokeDasharray: '3 3' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="poids"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>
                  Min&nbsp;
                  <span className="text-gray-300 font-medium">
                    {Math.min(...progression.map(p => p.maxWeight))} kg
                  </span>
                </span>
                <span>
                  Max&nbsp;
                  <span className="text-indigo-400 font-semibold">
                    {Math.max(...progression.map(p => p.maxWeight))} kg
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PerformancesPage() {
  const [search, setSearch] = useState('');

  const { data: sessionList = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessions.list,
  });

  const completedSessions = sessionList.filter(s => s.status === 'completed');

  const exerciseMap = new Map<number, ExerciseStat>();
  for (const session of completedSessions) {
    const seen = new Set<number>();
    for (const set of session.sets) {
      if (seen.has(set.exerciseId)) continue;
      seen.add(set.exerciseId);
      const existing = exerciseMap.get(set.exerciseId);
      if (existing) {
        existing.count++;
      } else {
        exerciseMap.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          name: set.exercise.name,
          count: 1,
        });
      }
    }
  }

  const sortedExercises = [...exerciseMap.values()]
    .sort((a, b) => b.count - a.count)
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Performances</h1>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Rechercher un exercice..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {sortedExercises.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {search ? (
            <p className="text-sm">Aucun exercice trouvé pour « {search} »</p>
          ) : (
            <>
              <p className="text-lg">Aucune donnée</p>
              <p className="text-sm mt-1">Complète des séances pour voir tes progressions</p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {sortedExercises.length} exercice{sortedExercises.length > 1 ? 's' : ''} — triés par fréquence
          </p>
          <div className="space-y-3">
            {sortedExercises.map(stat => (
              <ExerciseCard key={stat.exerciseId} stat={stat} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
