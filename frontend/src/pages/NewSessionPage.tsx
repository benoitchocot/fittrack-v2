import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { sessions, templates } from '../lib/api';
import type { WorkoutTemplate } from '../lib/types';

export default function NewSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customName, setCustomName] = useState('');

  const { data: templateList = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templates.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name?: string; templateId?: number }) =>
      sessions.create({ name: data.name }),
    onSuccess: (session, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      const url = vars.templateId
        ? `/sessions/${session.id}?templateId=${vars.templateId}`
        : `/sessions/${session.id}`;
      navigate(url);
    },
  });

  function startFromTemplate(template: WorkoutTemplate) {
    createMutation.mutate({ name: template.name, templateId: template.id });
  }

  function startBlank() {
    createMutation.mutate({ name: customName || undefined });
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Nouvelle séance</h1>

      {/* Templates */}
      {isLoading ? (
        <p className="text-gray-400 text-sm">Chargement des templates...</p>
      ) : templateList.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Démarrer depuis un template
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {templateList.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => startFromTemplate(tpl)}
                disabled={createMutation.isPending}
                className="bg-gray-900 border border-gray-800 hover:border-indigo-500 hover:bg-gray-800 rounded-xl p-4 text-left transition-all disabled:opacity-50 group"
              >
                <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {tpl.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {tpl.exercises.length} exercice{tpl.exercises.length > 1 ? 's' : ''}
                </p>
                <div className="mt-2 space-y-0.5">
                  {tpl.exercises.slice(0, 3).map((te) => (
                    <p key={te.id} className="text-xs text-gray-600 truncate">
                      {te.exercise.name}
                    </p>
                  ))}
                  {tpl.exercises.length > 3 && (
                    <p className="text-xs text-gray-600">+{tpl.exercises.length - 3} autres</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Blank session */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Séance libre
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nom de la séance (optionnel)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={startBlank}
            disabled={createMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {createMutation.isPending ? 'Création...' : 'Commencer'}
          </button>
        </div>
      </div>
    </div>
  );
}
