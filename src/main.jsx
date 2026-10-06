import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AccountProvider } from './account/AccountContext.jsx'
import { ToastProvider } from './studio/Toasts.jsx'
import './studio/studio.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AccountProvider>
  </React.StrictMode>
)
