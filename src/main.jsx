import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root.jsx'
import { startAnalytics } from './analytics.js'
import { reloadOnStaleChunks } from './staleChunks.js'
import { browserStorage } from './routes.js'
import { mount } from './mount.js'
import './fonts.css'
import './studio/studio.css'

startAnalytics()
reloadOnStaleChunks()

const app = (
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
mount(document.getElementById('root'), app, {
  hash: window.location.hash,
  storage: browserStorage(),
  hydrate: ReactDOM.hydrateRoot,
  create: ReactDOM.createRoot,
})
