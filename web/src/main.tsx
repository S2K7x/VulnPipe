import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';
import { I18nProvider } from './i18n/context.tsx';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html.');

createRoot(container).render(
  <StrictMode>
    {/* Le fournisseur enveloppe toute l'application : la langue est un état
        global, pas une prop qu'on fait descendre de composant en composant. */}
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
