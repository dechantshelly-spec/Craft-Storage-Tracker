import './index.css';   // <-- adds Tailwind + your custom styles
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  alert('Root element not found'); // should never happen
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('React mount failed', err);
    alert('App failed to start: ' + (err as Error).message);
  }
}
