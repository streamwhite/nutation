# Nutation

**English** | [简体中文](./README.zh-CN.md)

Nutation is a browser extension built for readers. It supports multiple languages and AI models, delivers fast, accurate translation, and focuses only on the content worth reading: **the article body on detail pages, and titles plus descriptions on listing pages**. Less noise, more reading, and a lower API bill.

`Multi-language` · `Multi-model` · `Fast` · `Accurate` · `Cost-effective` · `Privacy stays local`

## Why choose Nutation

- **See translations sooner**: the first useful content is prioritized, multiple tabs run in parallel, new content translates as you scroll, and cache hits appear instantly.
- **More accurate where it matters**: Nutation recognizes article bodies and listing items, skips navigation, sidebars, ads, comments and related links, and lets the model focus on real content.
- **Spend less**: no translating content nobody reads, no repeated requests for identical text, and the freedom to choose cost-effective models.
- **Never locked to one provider**: OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral, OpenRouter, Vercel AI Gateway, or any OpenAI-compatible endpoint. Switch whenever you want.
- **Privacy stays local by default**: your API key and settings live in local browser storage; page text goes directly to the provider you choose, never through a Nutation server.

## Core capabilities

- **In-place page translation** into your target language, with full-page-first and viewport-first modes.
- **Multi-tab translation**: translate several selected tabs in one click.
- **Scroll-aware translation**: as the page loads more content, the translation keeps up.
- **Smart content scope**: detail pages translate the headline and main body; listing pages translate titles and descriptions.
- **AI page summary**: generate a concise summary in a side overlay.
- **Copy page info**: copy the translated title, description and a tracking-parameter-free link in one click.
- **Translation cache**: popular pages and repeated text come back almost instantly, saving time and money.
- **Complete privacy**: personal information stays local.
- **Translate on open**: automatically translate the sites you read most by URL prefix, domain or regular expression.
- **Highly configurable**: providers, models, target language, translation mode, summary position, cache limits and auto-translate rules are all yours to tune.
- **The site stays the same**: the page looks and behaves exactly as before translation — only the text is replaced.

## Supported providers

| Type | Providers |
| --- | --- |
| API gateways | OpenRouter, Vercel AI Gateway |
| Direct providers | OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral |
| Custom | Any OpenAI-compatible `/chat/completions` endpoint |

> DeepSeek appears only after you explicitly enable “Allow sending data to providers in China” in Settings.

## Download

Get the latest package from [GitHub Releases](../../releases/latest).

## Quick start

1. Install Nutation (see “Installation” below).
2. Open the extension **Settings / Options**.
3. Choose a provider and enter its **API key** (search the web for the provider's official documentation to get one).
4. Choose a model and set your default target language.
5. Click **Save settings**.
6. Open any web page and click the Nutation icon in the toolbar.
7. Click **Translate page**; click **Restore original** to switch back.

> Your API key is stored only in local browser storage. Page text is sent directly to the provider you choose; Nutation does not route it through its own server. Nutation does not provide or resell API keys; get one from the provider's official website.

## Recommended models (cost effective)

| Provider | Model ID | Notes |
| --- | --- | --- |
| OpenAI | `gpt-6-luna` | Fast and inexpensive; a good default for everyday page translation |
| DeepSeek | `deepseek-v4.1-flash` | DeepSeek V4.1 Flash; very low cost for long pages and batch text |
| OpenRouter | `deepseek/deepseek-v4.1-flash` | Useful when you want one key for multiple model providers |
| Vercel AI Gateway | `deepseek/deepseek-v4.1-flash` | Useful when you need a unified gateway, quotas or team management |

Model IDs can differ by provider and gateway. Always confirm the exact ID in the provider console.

Recommendations weigh **performance**, **cost**, **accuracy** and **real-world experience**.

## Installation

### Install from a store

Store installation is not available yet (currently under review). Once approved, Nutation will be available in:

- Chrome Web Store
- Microsoft Edge Add-ons
- Firefox Add-ons
- Safari Extensions (App Store)

### Offline installation

Download the package for your browser from [GitHub Releases](../../releases/latest). If you run the project from source, `pnpm release` generates the same files under `release/`.

#### Chrome / Edge

1. Download the package from GitHub Releases, for example `nutation-chrome.zip` (or the `nutation-edge.zip` package).
2. Unzip it into a permanent folder and keep that folder after installation.
3. Open the extension manager:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.

#### Firefox

Temporary installation:

1. Download and unzip `nutation-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and select `manifest.json` in the unzipped folder.

> Release builds of Firefox only install signed extensions permanently. Temporary add-ons are removed when Firefox restarts. For long-term use, install from Firefox Add-ons or use an AMO-signed XPI.

#### Safari

Safari extensions are distributed through the App Store. For development, run `pnpm release:safari`, convert the generated package with Xcode's `safari-web-extension-converter`, and run the generated app in Safari.

### Build from source

```bash
pnpm install
pnpm dev          # Chrome development mode
pnpm dev:firefox  # Firefox development mode
pnpm build        # production build
pnpm release      # package all marketplace zips into release/
```

See [RELEASE.md](./RELEASE.md) (Chinese) for the full release workflow.

## Usage tips

- Scanning news, blogs, forums and search results? Listing pages translate only titles and descriptions, so you can move faster.
- Reading articles, documentation or tutorials? Detail pages translate only the body, so your attention stays on the content.
- Unusual page structure? Choose **Custom** in Settings and connect your own OpenAI-compatible endpoint.
- Watching costs? Start with `gpt-6-luna` or `deepseek-v4.1-flash` and test on a listing page or a short article first.
- Translation only changes the current page's DOM; it does not modify the site's source files. Click **Restore original** to revert.

## Development

Stack: WXT + React + Tailwind CSS + TypeScript.

No `.env` or `.env.production` file is required. Defaults are built in; end users only configure the provider and API key in Settings.

```bash
pnpm test       # unit tests
pnpm compile    # TypeScript type check
```

## Support this project

If this project is helpful to you, please support it in one of the following ways to help keep it running well:

- **Sponsoring or donating** to support ongoing maintenance (use the Sponsor entry on the repository page, or contact the maintainer for current donation options)
- **Sharing this tool** with friends, teammates or your community
- **Starring this repository** on GitHub
- **Translating this project** into more languages: translate the README files ([`README.md`](./README.md), [`README.zh-CN.md`](./README.zh-CN.md)) and the UI strings in the JSON files under [`src/i18n/messages/`](./src/i18n/messages/). To add a language, create a new `<locale>.json` there and open a pull request.
- **Contributing** by reporting bugs, improving documentation or opening a pull request

Thank you for your support!

## License

Licensed under the [Apache License, Version 2.0](./LICENSE).
