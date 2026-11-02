# Nutation

**English** | [简体中文](./README.zh-CN.md)

Nutation is a browser extension for translating web pages. It translates only what is worth reading: the **full article body on detail pages**, and **titles plus descriptions on listing pages**, reducing useless translation and API usage.

It works with Chrome, Edge, Firefox and Safari, and with any OpenAI-compatible endpoint.

## Download

Get the latest packages from [GitHub Releases](../../releases/latest).

## Features

- **In-place page translation** into your target language, with full-page-first and viewport-first modes.
- **Multi-tab translation**: translate several selected tabs in one click.
- **Scroll-aware translation**: new content is translated automatically as you scroll.
- **Fast translation**: concurrent batching and cache hits keep long pages flowing.
- **Smart content scope**:
  - Article/detail pages: translate the headline and main body only.
  - Listing/feed pages: translate titles and descriptions only.
  - Automatically skip navigation, sidebars, comments, related stories, newsletter prompts, ads, pagination and other non-content areas.
- **Multiple providers**: OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral, OpenRouter, Vercel AI Gateway, or any custom OpenAI-compatible endpoint.
- **Flexible configuration**: configure providers, models, target language, translation mode, summary position, cache limits and site-specific auto-translate rules.
- **AI page summary** in a side overlay.
- **Copy page info**: copy the translated title, description and a tracking-parameter-free link in one click.
- **Translation cache**: identical text is not requested twice, which keeps costs down.
- **Complete privacy**: all personal information stays local.
- **Translate on open**: automatically translate matching sites by URL prefix, domain or regular expression.

## Supported providers

| Type | Providers |
| --- | --- |
| API gateways | OpenRouter, Vercel AI Gateway |
| Direct providers | OpenAI, Anthropic, Google Gemini, DeepSeek, xAI, Mistral |
| Custom | Any OpenAI-compatible `/chat/completions` endpoint |

## Quick start

1. Install Nutation (see “Installation” below).
2. Open the extension **Settings / Options**.
3. Choose a provider and enter its **API key**.
4. Choose a model and set your default target language.
5. Click **Save settings**.
6. Open any web page and click the Nutation icon in the toolbar.
7. Click **Translate page**; click **Restore original** to switch back.

> Your API key is stored only in local browser storage. Page text is sent directly to the provider you choose; Nutation does not route it through its own server.

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

Download the package for your browser from GitHub Releases. If you run the project from source, `pnpm release` generates the same files under `release/`.

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

- Listing pages translate only titles and descriptions, which is ideal for quickly scanning news, blogs, forums and search results.
- Detail pages translate only the article body, which is ideal for articles, documentation and tutorials.
- If a site has an unusual structure, choose **Custom** in Settings and enter your own OpenAI-compatible endpoint.
- If cost matters, start with `gpt-6-luna` or `deepseek-v4.1-flash` and test on a listing page or a short article first.
- Translation only changes the current page's DOM; it does not modify the site's source files. Click **Restore original** to revert.

## Development

Stack: WXT + React + Tailwind CSS + TypeScript.

```bash
pnpm test       # unit tests
pnpm compile    # TypeScript type check
```

## Support this project

If this project is helpful to you, please help by:

- **Sponsoring or donating** to support ongoing maintenance (use the Sponsor entry on the repository page, or contact the maintainer for current donation options)
- **Sharing this tool** with friends, teammates or your community
- **Starring this repository** on GitHub
- **Translating this project** into more languages: translate the README files ([`README.md`](./README.md), [`README.zh-CN.md`](./README.zh-CN.md)) and the UI strings in the JSON files under [`src/i18n/messages/`](./src/i18n/messages/). To add a language, create a new `<locale>.json` there and open a pull request.
- **Contributing** by reporting bugs, improving documentation or opening a pull request

Thank you for your support!

## License

Licensed under the [Apache License, Version 2.0](./LICENSE).
