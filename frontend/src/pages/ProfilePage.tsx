import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/api';

export default function ProfilePage() {
  const { logout } = useAuth();
  const [deletionSent, setDeletionSent] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
  });

  const deletionMutation = useMutation({
    mutationFn: auth.requestDeletion,
    onSuccess: () => setDeletionSent(true),
    onError: (err: Error) => setDeletionError(err.message),
  });

  function handleDeletionRequest() {
    if (!confirm('Confirmer la demande de suppression de ton compte ? Tu recevras une réponse par email.')) return;
    setDeletionError(null);
    deletionMutation.mutate();
  }

  return (
    <div className="max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-white">Profil</h1>

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
