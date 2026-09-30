import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Page Translate',
    description: 'Translate page content with configurable OpenAI-compatible models',
    permissions: ['storage', 'activeTab', 'scripting', 'tabs', 'webNavigation', 'contextMenus'],
    host_permissions: ['<all_urls>', 'https://generativelanguage.googleapis.com/*'],
  },
});
