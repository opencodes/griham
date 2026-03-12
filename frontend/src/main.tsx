import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { makeServer } from './mirage/server'

// Theme: when VITE_THEME=blue, apply Cisco brand theme (see src/theme/blue.css).
const theme = import.meta.env.VITE_THEME
if (theme === 'blue') {
  document.documentElement.classList.add('theme-'+theme)
  import('./theme/blue.css')
} else if (theme === 'orange') {
  document.documentElement.classList.add('theme-'+theme)
  import('./theme/orange.css')
}



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
