// vitest.integration.config.ts
// Separate config for live-API integration tests.
// These tests hit the real production API and require a valid auth token.
//
// Usage:
//   PARITY_LIVE_API=1 npx vitest run --config vitest.integration.config.ts
//
// The global fetch stub in src/test/setup.ts is NOT loaded here,
// so API calls go through to the actual server.

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/integration-tests/**/*.spec.ts'],
  },
});
