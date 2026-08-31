/** Starts the React app and attaches it to <div id="root"> in index.html. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthProvider } from './services/AuthContext'
import './styles/App.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter gives us page URLs; AuthProvider shares the logged-in user. */}
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
