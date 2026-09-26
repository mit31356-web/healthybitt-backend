import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.healthybit.fit',
  appName: 'HealthyBit',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
