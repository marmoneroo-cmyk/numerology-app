import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Israel time on every machine (builds run in UTC): date tests cross its clock changes
    env: { TZ: 'Asia/Jerusalem' },
    // a global a test fakes (jsdom has no matchMedia, for one) is put back after each test
    unstubGlobals: true,
    // `npm run test:coverage`: the engine, the data layer, the workspace, the accounts and the Studio's units must stay at 80% or more
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/data/**', 'src/workspace/**', 'src/account/**', 'src/studio/**', 'src/sales/**', 'src/demo/**', 'src/legal/**', 'src/routes.js', 'src/Root.jsx', 'src/AppWorld.jsx', 'src/analytics.js'],
      exclude: ['**/__tests__/**'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
