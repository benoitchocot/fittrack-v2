import { useState } from 'react';
import { flushOutbox } from '../lib/api';
import { useOnline } from '../hooks/useOnline';
import { useOutboxCount } from '../hooks/useOfflineSync';

/**
 * Bandeau discret affiché uniquement quand c'est utile : hors-ligne, ou quand
 * des modifications faites hors-ligne restent à envoyer au serveur.
 */
export default function SyncStatus() {
  const online = useOnline();
  const pending = useOutboxCount();
  const [syncing, setSyncing] = useState(false);

  if (online && pending === 0) return null;

  async function sync() {
    setSyncing(true);
    try {
      await flushOutbox();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className={`px-4 py-2 text-sm flex items-center justify-between gap-3 ${
        online
          ? 'bg-indigo-950/60 text-indigo-200 border-b border-indigo-800/50'
          : 'bg-amber-950/60 text-amber-200 border-b border-amber-800/50'
      }`}
    >
      <span className="min-w-0">
        {!online
          ? 'Hors ligne — tes séries sont enregistrées sur le téléphone'
          : `${pending} modification${pending > 1 ? 's' : ''} à synchroniser`}
      </span>
      {online && pending > 0 && (
        <button
          onClick={sync}
          disabled={syncing}
          className="shrink-0 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {syncing ? 'Synchro…' : 'Synchroniser'}
        </button>
      )}
    </div>
  );
}
