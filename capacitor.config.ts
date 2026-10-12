import type { CapacitorConfig } from '@capacitor/cli';

/** iOS App：把 vite build 的 dist 包進原生殼（npm run ios） */
const config: CapacitorConfig = {
  appId: 'io.github.coollinsudo.dawnland',
  appName: '晨曦大陸',
  webDir: 'dist',
  backgroundColor: '#0a0c13',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0c13',
  },
};

export default config;
