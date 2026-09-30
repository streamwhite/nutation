import { createRoot } from 'react-dom/client';
import '@/assets/globals.css';
import { IntlRoot } from '@/components/IntlRoot';
import { PopupApp } from '@/features/popup/PopupApp';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <IntlRoot>
      <PopupApp />
    </IntlRoot>,
  );
}
