import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'be.chocot.fittrackv2',
  appName: 'FitTrack',
  webDir: 'dist',
  // Pas de server.url : les assets sont bundlés dans l'APK.
  // L'URL de l'API est injectée via VITE_API_URL au moment du build.
};

export default config;
