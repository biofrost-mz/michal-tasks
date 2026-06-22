// SW Force-rebuild hash: 2026-06-22-v6
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { initGlobalErrorLogging } from './utils/errorLogger.js'
import './styles/tokens.css'
import './styles/ui.css'


initGlobalErrorLogging();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* Emergency SW reset: visiting ?reset-sw clears all caches + unregisters SW */
if ('serviceWorker' in navigator && new URLSearchParams(location.search).has('reset-sw')) {
  Promise.all([
    navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister()))),
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
  ]).then(() => { location.replace(location.pathname) })
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let updateServiceWorker = () => Promise.resolve();
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

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

  /* Force SW update check on every app load */
  navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {});

  /* Auto-reload when SW sends FORCE_RELOAD (fired on new SW activate) */
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'FORCE_RELOAD' && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
