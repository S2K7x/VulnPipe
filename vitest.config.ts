import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // L'environnement DOM est déclaré par fichier via `@vitest-environment
    // jsdom` : `environmentMatchGlobs` ne s'applique plus en Vitest 4.
    // Le JSX est transformé par oxc, configuré par le tsconfig.
    include: ['src/**/*.test.ts', 'web/**/*.test.tsx'],
  },
});
