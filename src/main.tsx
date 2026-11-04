import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { themeCss } from './ui/tokens';
import './index.css';

const style = document.createElement('style');
style.textContent = themeCss();
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
