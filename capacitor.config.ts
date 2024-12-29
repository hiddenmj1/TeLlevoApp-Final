import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'TeLlevoApp2',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'none', // Evita que el teclado redimensione el viewport
    }
  }
};

export default config;
