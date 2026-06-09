import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { initGlobalErrorLogging } from './utils/errorLogger.js'

initGlobalErrorLogging();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let updateServiceWorker = () => Promise.resolve();

  const notifyUpdateReady = () => {
    window.dispatchEvent(new CustomEvent('app:update-ready', { detail: { updateSW: updateServiceWorker } }));
  };

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: notifyUpdateReady,
    onNeedReload: notifyUpdateReady,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('app:offline-ready'));
    },
    onRegisterError(error) {
      console.warn('SW registration failed:', error);
    },
  });
}
