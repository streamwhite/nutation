# Nutation

**English** | [简体中文](./README.zh-CN.md)

Nutation is a browser extension for translating web pages. It supports multiple languages and AI models, and focuses on the content you want to read: **article text on detail pages, and titles and descriptions on listing pages**. It skips page navigation and other unrelated elements.

`Any language` · `Any model` · `Fast` · `Accurate` · `Cost-effective` · `Private`

## Why choose Nutation

- **Translate as you browse**: handle multiple tabs, translate newly loaded content while scrolling, and show cached translations right away.
- **Focus on useful content**: translate article text or listing titles and descriptions instead of navigation and other page chrome.
- **Keep costs down**: avoid translating unrelated content, reuse cached translations, and choose a model that fits your budget.
- **Choose your provider**: use OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral, OpenRouter, Vercel AI Gateway, or a custom OpenAI-compatible endpoint.
- **Keep control of your data**: your API key and translation cache stay in local browser storage. Page text goes directly to the model provider you choose.
- **Summarize pages**: get a quick summary of the current page.
- **Copy page info**: copy the translated title and description, plus the page link, for notes or other uses.
- **Translate sites on open**: set URL rules for sites you want translated automatically.
- **Adjust the settings**: choose the provider, model, target language, translation mode, summary position, cache size and auto-translate rules.
- **Keep the original page experience**: Nutation replaces text in place without changing the site's layout or source files.

## Quick start

1. Install Nutation (see [Installation](#installation)).
2. Open the extension's **Settings**.
3. Choose a provider and enter its **API key**.
4. Enter a model ID and choose your default target language.
5. Click **Save settings**.
6. Open a web page and click the Nutation icon in the toolbar.
7. Click **Translate**. Click **Restore** to show the original text again.

Your API key and translation cache stay in local browser storage. Nutation sends page text directly to the provider you select; it does not pass through a Nutation server. Nutation does not provide or resell API keys. Get one from your provider.

## Supported providers

| Type | Providers |
| --- | --- |
| API gateways | OpenRouter, Vercel AI Gateway |
| Direct providers | OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral |
| Custom | Any OpenAI-compatible `/chat/completions` endpoint |

> DeepSeek appears in Settings only after you enable **Allow sending data to providers in China**.

## Recommended models

| Provider | Model ID | Notes |
| --- | --- | --- |
| OpenAI | `gpt-6-luna` | Fast and cost-effective for everyday translation |
| DeepSeek | `deepseek-v4.1-flash` | Low-cost option for long pages and batches |
| OpenRouter | `deepseek/deepseek-v4.1-flash` | Use one key to access models from multiple providers |
| Vercel AI Gateway | `deepseek/deepseek-v4.1-flash` | Useful for a unified gateway, quotas or team management |

Model IDs can vary by provider or gateway. Check the provider's console for the exact ID. Compare performance, cost, accuracy and your own experience when choosing a model.

## Installation

Store installation is not available yet.

### Offline installation

Download the latest package from the [Nutation download page](https://dl.piaosiyuan.cn/Nutation/). If you build from source, `pnpm release` creates the packages in the `release/` directory.

#### Chrome / Edge

1. Download the Chrome or Edge ZIP package.
2. Unzip it into a permanent folder.
3. Open the extension manager:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.

#### Firefox

Temporary installation:

1. Download and unzip `nutation-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json` from the unzipped folder.

> Firefox removes temporary add-ons when it restarts. For release and packaging instructions, see [RELEASE.md](./RELEASE.md).

## Usage tips

- To keep costs down, try `gpt-6-luna` or `deepseek-v4.1-flash`.

## Support this project

If Nutation helps you, you can support the project by:

- **Sharing it** with friends, teammates or your community
- **Starring the repository** on GitHub
- **Translating the project**: update the README files or UI strings under [`src/i18n/messages/`](./src/i18n/messages/), then open a pull request
- **Contributing** by reporting bugs, improving documentation or opening a pull request

Thank you for your support!

## License

Licensed under the [Apache License, Version 2.0](./LICENSE).
