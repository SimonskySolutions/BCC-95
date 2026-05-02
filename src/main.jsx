import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'
import { FactoryConfigProvider } from './config/FactoryConfigProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FactoryConfigProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </FactoryConfigProvider>
  </StrictMode>,
)
