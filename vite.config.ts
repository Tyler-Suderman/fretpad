import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// base './' keeps asset paths relative, so the build also works from a GitHub Pages subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
});
