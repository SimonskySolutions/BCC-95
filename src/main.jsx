import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'
import { FactoryConfigProvider } from './config/FactoryConfigProvider.jsx'
import { CurrentUserProvider } from './auth/CurrentUserProvider.jsx'
import { ThemeProvider } from './theme/ThemeProvider.jsx'
import { FeedbackProvider } from './components/ui/Feedback.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <FactoryConfigProvider>
        <LanguageProvider>
          <CurrentUserProvider>
            <FeedbackProvider>
              <App />
            </FeedbackProvider>
          </CurrentUserProvider>
        </LanguageProvider>
      </FactoryConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
