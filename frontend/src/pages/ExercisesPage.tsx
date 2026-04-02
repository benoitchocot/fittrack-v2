import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { exercises } from '../lib/api';

export default function ExercisesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroupId, setMuscleGroupId] = useState('');
  const [equipment, setEquipment] = useState('');

  const { data: exerciseList = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: exercises.list,
  });

  const { data: muscleGroups = [] } = useQuery({
    queryKey: ['muscle-groups'],
    queryFn: exercises.muscleGroups,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      exercises.create({
        name,
        muscleGroupId: parseInt(muscleGroupId),
        equipment: equipment || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setName('');
      setMuscleGroupId('');
      setEquipment('');
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: exercises.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const filtered = exerciseList.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  const globals = filtered.filter(e => !e.isCustom);
  const custom = filtered.filter(e => e.isCustom);

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Exercices</h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Exercice custom
        </button>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher..."
        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="font-medium text-white text-sm">Nouvel exercice</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom de l'exercice"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={muscleGroupId}
            onChange={e => setMuscleGroupId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Groupe musculaire</option>
            {muscleGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
            placeholder="Équipement (optionnel)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!name || !muscleGroupId || createMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {createMutation.isPending ? 'Création...' : 'Créer'}
          </button>
        </div>
      )}

      {custom.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Mes exercices</h2>
          <div className="space-y-2">
            {custom.map(ex => (
              <div key={ex.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{ex.name}</p>
                  <p className="text-gray-500 text-xs">{ex.muscleGroup.name}{ex.equipment ? ` · ${ex.equipment}` : ''}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Supprimer cet exercice ?')) deleteMutation.mutate(ex.id);
                  }}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bibliothèque</h2>
        <div className="space-y-2">
          {globals.map(ex => (
            <div key={ex.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">{ex.name}</p>
                <p className="text-gray-500 text-xs">{ex.muscleGroup.name}{ex.equipment ? ` · ${ex.equipment}` : ''}</p>
              </div>
            </div>
          ))}
          {globals.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun exercice global — lance le seed.</p>
          )}
        </div>
      </section>
    </div>
  );
}
