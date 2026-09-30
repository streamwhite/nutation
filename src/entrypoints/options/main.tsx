import { createRoot } from 'react-dom/client';
import '@/assets/globals.css';
import { IntlRoot } from '@/components/IntlRoot';
import { OptionsApp } from '@/features/options/OptionsApp';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <IntlRoot>
      <OptionsApp />
    </IntlRoot>,
  );
}
