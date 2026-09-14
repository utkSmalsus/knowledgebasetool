import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { completeMsalRedirect } from './kb/sharepoint/authMsal'
import { KbProvider } from './kb/store'
import './index.css'

// Consumes the auth response if we just landed back here from an MSAL sign-in
// redirect (no-op otherwise) — must happen before anything tries to use it.
completeMsalRedirect().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <KbProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </KbProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
})
