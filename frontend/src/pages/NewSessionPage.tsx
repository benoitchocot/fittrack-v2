import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { sessions, templates } from '../lib/api';
import type { WorkoutTemplate } from '../lib/types';

export default function NewSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templateList = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templates.list,
  });

  const { data: activeSession } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: sessions.getActive,
  });

  const createMutation = useMutation({
    mutationFn: (template: WorkoutTemplate) =>
      sessions.create({
        name: template.name,
        exercises: template.exercises.map(te => ({
          exerciseId: te.exerciseId,
          name: te.exercise.name,
          muscleGroupName: te.exercise.muscleGroup.name,
          sets: te.sets ?? null,
          reps: te.reps ?? null,
          weight: te.weight ?? null,
          comment: te.comment ?? null,
        })),
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(`/sessions/${session.id}`);
    },
  });

  const abandonMutation = useMutation({
    mutationFn: () => sessions.delete(activeSession!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white">Nouvelle séance</h1>

      {/* Active session warning */}
      {activeSession && (
        <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-amber-300 font-medium text-sm">Séance en cours</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {activeSession.name ?? 'Séance sans nom'} · démarrée{' '}
              {new Date(activeSession.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/sessions/${activeSession.id}`}
              className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              Reprendre
            </Link>
            <button
              onClick={() => { if (confirm('Abandonner et supprimer la séance en cours ?')) abandonMutation.mutate(); }}
              disabled={abandonMutation.isPending}
              className="flex-1 bg-gray-800 hover:bg-red-900/40 hover:border-red-700 border border-gray-700 text-gray-300 hover:text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

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
                onClick={() => createMutation.mutate(tpl)}
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
      ) : (
        <p className="text-gray-500 text-sm">
          Aucun template disponible. Crée d'abord un template depuis la page Templates.
        </p>
      )}
    </div>
  );
}
