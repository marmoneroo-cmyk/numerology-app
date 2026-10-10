import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root.jsx'
import { startAnalytics } from './analytics.js'
import './studio/studio.css'

startAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
