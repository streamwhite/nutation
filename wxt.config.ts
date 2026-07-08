import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Page Translate',
    description: 'Translate page content with configurable OpenAI-compatible models',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
  },
});
