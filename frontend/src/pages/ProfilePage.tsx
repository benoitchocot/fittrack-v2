import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/api';

export default function ProfilePage() {
  const { logout } = useAuth();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: auth.me,
  });

  return (
    <div className="max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-white">Profil</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
          <p className="text-white mt-0.5">{me?.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">ID</p>
          <p className="text-white mt-0.5">{me?.id ?? '—'}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}
