import { useEffect, useSyncExternalStore } from 'react';
import { flushOutbox } from '../lib/api';
import { outboxCount } from '../lib/offline';

function subscribe(callback: () => void): () => void {
  window.addEventListener('outbox-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('outbox-change', callback);
    window.removeEventListener('storage', callback);
  };
}

/** Nombre d'opérations en attente de synchronisation. */
export function useOutboxCount(): number {
  return useSyncExternalStore(subscribe, outboxCount, () => 0);
}

/**
 * Déclenche la synchronisation de l'outbox au montage, au retour du réseau et
 * quand l'appli repasse au premier plan. À monter une seule fois (dans Layout).
 */
export function useOfflineSync(): void {
  useEffect(() => {
    void flushOutbox();

    const onOnline = () => void flushOutbox();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flushOutbox();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
