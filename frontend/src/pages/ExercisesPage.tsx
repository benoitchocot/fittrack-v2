import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { exercises } from '../lib/api';

type EditState = {
  id: number;
  name: string;
  muscleGroupId: string;
  equipment: string;
};

export default function ExercisesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroupId, setMuscleGroupId] = useState('');
  const [equipment, setEquipment] = useState('');
  const [editing, setEditing] = useState<EditState | null>(null);

  const { data: exerciseList = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: exercises.list,
  });

  const { data: muscleGroups = [] } = useQuery({
    queryKey: ['muscle-groups'],
    queryFn: exercises.muscleGroups,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; muscleGroupId: number; equipment?: string }) =>
      exercises.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setName('');
      setMuscleGroupId('');
      setEquipment('');
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (e: EditState) =>
      exercises.update(e.id, {
        name: e.name,
        muscleGroupId: parseInt(e.muscleGroupId),
        equipment: e.equipment || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setEditing(null);
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

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500';
  const selectClass =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500';

  function startEdit(ex: { id: number; name: string; muscleGroup: { id: number }; equipment?: string | null }) {
    setEditing({
      id: ex.id,
      name: ex.name,
      muscleGroupId: String(ex.muscleGroup.id),
      equipment: ex.equipment ?? '',
    });
  }

  function duplicate(ex: { name: string; muscleGroup: { id: number }; equipment?: string | null }) {
    createMutation.mutate({
      name: `${ex.name} (copie)`,
      muscleGroupId: ex.muscleGroup.id,
      equipment: ex.equipment ?? undefined,
    });
  }

  function renderCustomRow(ex: {
    id: number;
    name: string;
    muscleGroup: { id: number; name: string };
    equipment?: string | null;
  }) {
    if (editing?.id === ex.id) {
      return (
        <div key={ex.id} className="bg-gray-900 border border-indigo-700 rounded-lg px-4 py-3 space-y-2">
          <input
            value={editing.name}
            onChange={e => setEditing(v => v && ({ ...v, name: e.target.value }))}
            className={inputClass}
          />
          <select
            value={editing.muscleGroupId}
            onChange={e => setEditing(v => v && ({ ...v, muscleGroupId: e.target.value }))}
            className={selectClass}
          >
            <option value="">Groupe musculaire</option>
            {muscleGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input
            value={editing.equipment}
            onChange={e => setEditing(v => v && ({ ...v, equipment: e.target.value }))}
            placeholder="Équipement (optionnel)"
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              onClick={() => editing && updateMutation.mutate(editing)}
              disabled={!editing?.name || !editing?.muscleGroupId || updateMutation.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-1.5 rounded-lg text-sm transition-colors"
            >
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 rounded-lg text-sm transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={ex.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">{ex.name}</p>
          <p className="text-gray-500 text-xs">{ex.muscleGroup.name}{ex.equipment ? ` · ${ex.equipment}` : ''}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => startEdit(ex)}
            className="text-gray-500 hover:text-indigo-400 text-xs transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={() => {
              if (confirm('Supprimer cet exercice ?')) deleteMutation.mutate(ex.id);
            }}
            className="text-gray-600 hover:text-red-400 text-xs transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

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
            className={inputClass}
          />
          <select
            value={muscleGroupId}
            onChange={e => setMuscleGroupId(e.target.value)}
            className={selectClass}
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
            className={inputClass}
          />
          <button
            onClick={() => createMutation.mutate({ name, muscleGroupId: parseInt(muscleGroupId), equipment: equipment || undefined })}
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
            {custom.map(ex => renderCustomRow(ex))}
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
              <button
                onClick={() => duplicate(ex)}
                disabled={createMutation.isPending}
                className="text-gray-500 hover:text-indigo-400 text-xs transition-colors disabled:opacity-50"
              >
                Dupliquer
              </button>
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
