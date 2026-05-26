import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { templates, exercises } from '../lib/api';
import type { WorkoutTemplate } from '../lib/types';

interface ExerciseEntry {
  exerciseId: number;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  comment: string;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<ExerciseEntry[]>([]);
  const [search, setSearch] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [replaceSearch, setReplaceSearch] = useState('');

  const { data: templateList = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templates.list,
  });

  const { data: exerciseList = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: exercises.list,
  });

  const createMutation = useMutation({
    mutationFn: () => templates.create({
      name,
      exercises: selectedExercises.map(e => ({
        exerciseId: e.exerciseId,
        sets: e.sets ? parseInt(e.sets) : undefined,
        reps: e.reps ? parseInt(e.reps) : undefined,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        comment: e.comment || undefined,
      })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => templates.update(editing!.id, {
      name,
      exercises: selectedExercises.map(e => ({
        exerciseId: e.exerciseId,
        sets: e.sets ? parseInt(e.sets) : undefined,
        reps: e.reps ? parseInt(e.reps) : undefined,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        comment: e.comment || undefined,
      })),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: templates.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  function openCreate() {
    setEditing(null);
    setName('');
    setSelectedExercises([]);
    setSearch('');
    setExpandedIdx(null);
    setReplacingIdx(null);
    setReplaceSearch('');
    setShowForm(true);
  }

  function openEdit(tpl: WorkoutTemplate) {
    setEditing(tpl);
    setName(tpl.name);
    setSelectedExercises(
      tpl.exercises.map(te => ({
        exerciseId: te.exerciseId,
        name: te.exercise.name,
        sets: te.sets != null ? String(te.sets) : '',
        reps: te.reps != null ? String(te.reps) : '',
        weight: te.weight != null ? String(te.weight) : '',
        comment: te.comment ?? '',
      })),
    );
    setSearch('');
    setExpandedIdx(null);
    setReplacingIdx(null);
    setReplaceSearch('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setExpandedIdx(null);
    setReplacingIdx(null);
    setReplaceSearch('');
  }

  function addExercise(id: number, exName: string) {
    if (selectedExercises.find(e => e.exerciseId === id)) return;
    const newIdx = selectedExercises.length;
    setSelectedExercises(prev => [...prev, { exerciseId: id, name: exName, sets: '3', reps: '', weight: '', comment: '' }]);
    setExpandedIdx(newIdx);
    setSearch('');
  }

  function replaceExercise(idx: number, newId: number, newName: string) {
    setSelectedExercises(prev => prev.map((e, i) =>
      i === idx ? { ...e, exerciseId: newId, name: newName } : e,
    ));
    setReplacingIdx(null);
    setReplaceSearch('');
  }

  function cancelReplace() {
    setReplacingIdx(null);
    setReplaceSearch('');
  }

  function removeExercise(idx: number) {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
    if (replacingIdx === idx) { setReplacingIdx(null); setReplaceSearch(''); }
  }

  function moveExercise(idx: number, direction: 'up' | 'down') {
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    setSelectedExercises(prev => {
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next;
    });
    if (expandedIdx === idx) setExpandedIdx(swapIdx);
    else if (expandedIdx === swapIdx) setExpandedIdx(idx);
    if (replacingIdx === idx) setReplacingIdx(swapIdx);
    else if (replacingIdx === swapIdx) setReplacingIdx(idx);
  }

  function updateField(idx: number, field: 'sets' | 'reps' | 'weight' | 'comment', value: string) {
    setSelectedExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  const filteredExercises = exerciseList.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) &&
    !selectedExercises.find(s => s.exerciseId === e.id),
  );

  const filteredReplaceExercises = exerciseList.filter(e =>
    e.name.toLowerCase().includes(replaceSearch.toLowerCase()) &&
    !selectedExercises.find((s, i) => s.exerciseId === e.id && i !== replacingIdx),
  );

  if (isLoading) return <div className="text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          + Nouveau
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeForm}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">{editing ? 'Modifier le template' : 'Nouveau template'}</h2>
              <button onClick={closeForm} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom (ex: PUSH, PULL, LEGS…)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />

            {/* Selected exercises */}
            {selectedExercises.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Exercices ({selectedExercises.length})</p>
                {selectedExercises.map((entry, idx) => (
                  <div key={entry.exerciseId} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1 px-2 py-2">
                      {/* Move buttons */}
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => moveExercise(idx, 'up')}
                          disabled={idx === 0}
                          className="h-7 w-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors"
                          title="Monter"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveExercise(idx, 'down')}
                          disabled={idx === selectedExercises.length - 1}
                          className="h-7 w-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:hover:bg-transparent rounded transition-colors"
                          title="Descendre"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      {/* Exercise name or replace search */}
                      <div className="flex-1 min-w-0 relative">
                        {replacingIdx === idx ? (
                          <>
                            <input
                              autoFocus
                              value={replaceSearch}
                              onChange={e => setReplaceSearch(e.target.value)}
                              placeholder="Rechercher un exercice…"
                              className="w-full bg-gray-700 border border-indigo-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none"
                              onClick={e => e.stopPropagation()}
                            />
                            {replaceSearch && (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-40 overflow-y-auto z-10 shadow-xl">
                                {filteredReplaceExercises.slice(0, 8).map(ex => (
                                  <button
                                    key={ex.id}
                                    onClick={() => replaceExercise(idx, ex.id, ex.name)}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex justify-between gap-2"
                                  >
                                    <span>{ex.name}</span>
                                    <span className="text-xs text-gray-500 shrink-0">{ex.muscleGroup.name}</span>
                                  </button>
                                ))}
                                {filteredReplaceExercises.length === 0 && (
                                  <p className="px-3 py-2 text-sm text-gray-500">Aucun résultat</p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                            className="w-full text-left text-sm text-white hover:text-indigo-300 transition-colors truncate"
                          >
                            {entry.name}
                            {(entry.sets || entry.reps) && (
                              <span className="ml-2 text-xs text-gray-500">
                                {entry.sets && `${entry.sets} séries`}
                                {entry.sets && entry.reps && ' · '}
                                {entry.reps && `${entry.reps} reps`}
                                {entry.weight && ` · ${entry.weight} kg`}
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Replace / cancel replace */}
                      {replacingIdx === idx ? (
                        <button
                          onClick={cancelReplace}
                          className="h-9 w-9 shrink-0 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="Annuler"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => { setReplacingIdx(idx); setReplaceSearch(''); }}
                          className="h-9 w-9 shrink-0 flex items-center justify-center text-gray-500 hover:text-indigo-400 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Remplacer l'exercice"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                          </svg>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => removeExercise(idx)}
                        className="h-9 w-9 shrink-0 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    {expandedIdx === idx && replacingIdx !== idx && (
                      <div className="px-3 pb-3 border-t border-gray-700 pt-3 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Séries</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={entry.sets}
                              onChange={e => updateField(idx, 'sets', e.target.value)}
                              placeholder="3"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Reps</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={entry.reps}
                              onChange={e => updateField(idx, 'reps', e.target.value)}
                              placeholder="8"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Poids (kg)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={entry.weight}
                              onChange={e => updateField(idx, 'weight', e.target.value)}
                              placeholder="—"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Commentaire</label>
                          <textarea
                            value={entry.comment}
                            onChange={e => updateField(idx, 'comment', e.target.value)}
                            placeholder="Consignes, tempo, note technique…"
                            rows={2}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Exercise search */}
            <div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ajouter un exercice…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              {search && (
                <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  {filteredExercises.slice(0, 12).map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex.id, ex.name)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors flex justify-between"
                    >
                      <span>{ex.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{ex.muscleGroup.name}</span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-500">Aucun résultat</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => editing ? updateMutation.mutate() : createMutation.mutate()}
                disabled={!name || selectedExercises.length === 0 || createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
              <button onClick={closeForm} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates list */}
      {templateList.length === 0 && !showForm ? (
        <p className="text-gray-500 text-sm">Aucun template.</p>
      ) : (
        <div className="space-y-4">
          {templateList.map(tpl => (
            <div key={tpl.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-white text-lg">{tpl.name}</p>
                  <p className="text-xs text-gray-500">{tpl.exercises.length} exercice{tpl.exercises.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(tpl)} className="text-gray-500 hover:text-white text-sm transition-colors">Modifier</button>
                  <button
                    onClick={() => { if (confirm(`Supprimer "${tpl.name}" ?`)) deleteMutation.mutate(tpl.id); }}
                    className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                  >Supprimer</button>
                </div>
              </div>
              <div className="space-y-2">
                {tpl.exercises.map(te => (
                  <div key={te.id} className="border-l-2 border-gray-700 pl-3">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm text-white">{te.exercise.name}</p>
                      {(te.sets != null || te.reps != null) && (
                        <p className="text-xs text-gray-500">
                          {te.sets != null && `${te.sets} × `}
                          {te.reps != null && `${te.reps} reps`}
                          {te.weight != null && ` · ${te.weight} kg`}
                        </p>
                      )}
                    </div>
                    {te.comment && (
                      <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{te.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
