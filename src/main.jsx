import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Last-resort safety net: catches crashes React's own error boundaries
// CANNOT catch (errors inside async functions, promises, and effects),
// plus anything that happens before React even finishes mounting.
// Shows the real error on screen instead of a blank white page.
function showFatalError(title, err) {
  const existing = document.getElementById('fatal-error-overlay');
  if (existing) return; // don't stack multiple overlays
  const message = err?.message || (typeof err === 'string' ? err : String(err));
  const stack = err?.stack || '';
  const detail = 'MESSAGE: ' + message + '\n\nSTACK:\n' + stack;
  const el = document.createElement('div');
  el.id = 'fatal-error-overlay';
  el.style.cssText =
    'position:fixed;inset:0;z-index:999999;background:#1a0b2e;color:#fff;' +
    'padding:20px;overflow:auto;font-family:monospace;font-size:13px;' +
    'white-space:pre-wrap;line-height:1.5;';
  el.innerHTML =
    '<div style="color:#ff6b6b;font-size:16px;font-weight:bold;margin-bottom:12px;">' +
    title + '</div><div>' +
    detail.replace(/</g, '&lt;') + '</div>';
  document.body.appendChild(el);
}

window.addEventListener('error', (event) => {
  showFatalError('App crashed (uncaught error):', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError('App crashed (unhandled promise rejection):', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}



