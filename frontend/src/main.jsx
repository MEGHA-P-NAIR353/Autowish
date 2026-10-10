import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {/* reducedMotion="user" makes every framer-motion animation honour prefers-reduced-motion */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--glass-bg-strong)',
                color: 'rgb(var(--fg))',
                border: '1px solid var(--glass-border-hover)',
                borderRadius: '14px',
                backdropFilter: 'blur(16px)',
                boxShadow: 'var(--glass-shadow-lg)',
                fontSize: '14px',
              }
            }}
          />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
)
