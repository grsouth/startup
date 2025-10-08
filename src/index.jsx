import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.jsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Unable to locate root element for React render.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
