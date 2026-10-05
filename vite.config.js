import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // `npm run test:coverage`: the engine, the data layer and the workspace must stay at 80% or more
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/data/**', 'src/workspace/**'],
      exclude: ['**/__tests__/**'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
