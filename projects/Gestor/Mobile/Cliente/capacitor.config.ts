import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conesoft.cliente',
  appName: 'Cliente',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
    },
  },
};

export default config;