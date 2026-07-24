import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conesoft.gestor',
  appName: 'Gestor Financeiro',
  webDir: '../../dist/gestor',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
    },
  },
};

export default config;
