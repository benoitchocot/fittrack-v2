import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { exercises, sessions } from '../lib/api';

export default function ProgressionPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: exerciseList = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: exercises.list,
  });

  const { data: progression = [], isLoading } = useQuery({
    queryKey: ['progression', selectedId],
    queryFn: () => sessions.progression(selectedId!),
    enabled: selectedId !== null,
  });

  const maxWeight = progression.length > 0 ? Math.max(...progression.map(p => p.maxWeight)) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Progression</h1>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Exercice</label>
        <select
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">Choisir un exercice...</option>
          {exerciseList.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {selectedId && isLoading && <div className="text-gray-400">Chargement...</div>}

      {selectedId && !isLoading && progression.length === 0 && (
        <p className="text-gray-500">Aucune donnée pour cet exercice.</p>
      )}

      {progression.length > 0 && (
        <div className="space-y-4">
          {/* Simple bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Poids max par séance</h2>
            <div className="flex items-end gap-2 h-40">
              {progression.map((point, i) => {
                const height = maxWeight > 0 ? (point.maxWeight / maxWeight) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.maxWeight}kg
                    </span>
                    <div
                      className="w-full bg-indigo-600 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-600 rotate-45 origin-left truncate w-6">
                      {new Date(point.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Date</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Poids max</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Reps</th>
                </tr>
              </thead>
              <tbody>
                {[...progression].reverse().map((point, i) => (
                  <tr key={i} className="border-b border-gray-800 last:border-0">
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(point.date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-right">{point.maxWeight} kg</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{point.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
