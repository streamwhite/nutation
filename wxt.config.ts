import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Nutation',
    description: 'Nutation — translate pages with OpenAI, Anthropic, Gemini, DeepSeek, xAI, Mistral, OpenRouter, or Vercel AI Gateway.',
    permissions: ['storage', 'activeTab', 'scripting', 'tabs', 'webNavigation', 'contextMenus'],
    host_permissions: ['<all_urls>', 'https://generativelanguage.googleapis.com/*'],
  },
});
