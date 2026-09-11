import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { KbProvider } from './kb/store'
import './index.css'

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
