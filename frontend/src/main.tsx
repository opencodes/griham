import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { makeServer } from './mirage/server'

// Start Mirage mock API in development when no real API URL is set.
// Leave VITE_API_URL unset to use the mock; set it to use a real backend.
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  makeServer()
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
