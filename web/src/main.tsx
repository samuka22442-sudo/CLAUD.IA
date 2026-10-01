import '@fontsource-variable/plus-jakarta-sans/wght.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { captureInstallPrompt } from './hooks/useInstallPrompt.ts'
import { useAuth } from './store/auth.ts'
import { installPersistence } from './store/data.ts'

// Guarda o evento de instalação do PWA antes de qualquer tela montar.
captureInstallPrompt()
// Grava os dados no aparelho (e acompanha o que outras abas gravam).
installPersistence()
// Descobre se há sessão (do cache ou do servidor) e liga a sincronização.
void useAuth.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
