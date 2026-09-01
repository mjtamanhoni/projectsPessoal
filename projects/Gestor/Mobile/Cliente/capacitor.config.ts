import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.conesoft.cliente',
  appName: 'Chegou',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3500,
      backgroundColor: '#0a1a12',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      launchAutoHide: true,
    },
    Geolocation: {
      permissions: ['location'],
    },
  },
};

export default config;