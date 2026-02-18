// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: true // Permite conexiones desde cualquier IP local
  },
  security: {
    checkOrigin: true // Mantén esto en true para producción real
  }
});