export const todos = [
  `i need to build a ext to translate page content`,
  `first i need to get page content from the page`,
  `i have a few questions about get content from the page: some page is lazy loaded, how to get content from the page? what is common industry practices to get content for this case?`,
  `chrome has its own translate tools, but the translation is too bad, i like to use models like gpt to translate.`,
  `save this plan.`,
  `use gemini models and url for envs for now.`,
  `try save cost for translation with models, using commmon industry practices like batch send requests to models to reduce cost.`,
  `make translation quicker, use pkg like happydom to replace jsdom. now it is much slower than chrome's built-in translate tools.`,
  `i do not need to transalte every thing on a page, just inside the main content area or body based on common industry practices. `,
  [`need to be much quicker, find bottle neccks and optimize them.`],
  [
    `handle this case: Translation request failed: HTTP 503`,
    `it stop translation on this error. retry or continue others`,
  ],
  [
    `for setting page, i filled fiedl like  base url, it does not save after click save button.`,
  ],
  [`it still quite slow to translate, find bottle necks and fix it`],
  [
    `quicker, but still slow for user perspective, even with gemini-2.5-flash-lite, continue find bottlenecks and optimize them, and record main stage time used, so i can check bottlenecks.`,
  ],
  [
    `set default gemini model to gemini-2.5-flash-lite, `,
    `apply them to current branch`,
    `<div data-block="headline" class="ssrcss-l7emlr-ComponentWrapper e1aon0op1"><div class="ssrcss-usmnse-Spacer e1aon0op0"><header data-testid="headline"><h1 id="main-heading" type="headline" tabindex="-1" class="ssrcss-8zqj65-Heading e10rt3ze0"><span role="text">I've changed my mind, we might actually be able to win this thing - Shearer</span></h1></header></div></div> `,
    `js path: document.querySelector("#main-content > article > div > div:nth-child(1)") `,
    `why this one is not translated? fix it.`,
  ],
  [`still slow, translate whole page.`],
  [
    `i like use a different way to translate zh-TW to zh-CN,  not by ai models, show common industry practices to translate zh-TW`,
  ],
  [
    `https://arstechnica.com/ page, the left list not translated(after long time), it should be i think. `,
    `show me the scope of elements collected for translation concisely.`,
  ],
  [
    `add new mode:translate all content in one or mininum batch , this save cost and qiucker(no multiple reqs for a page), but you need still translate new content after scroll(some page has new content some does not).user can read other page while current page is in translating. with a trade off(no quick translate for current page), but no much friction for user. still same content scope to collect.`,
    `set this mode as default, and let user to choose current(one by one translation mode) and new mode.`,
    `when in bulk mode and scroll to have new content, or just in progress mode, make it as quick as possible, may be smaller batch size or better ways.`,
    `add notes to user on select progress mode or bulk mode.`,
  ],
  [
    `allow more model providers by two main categories, api gateways and derect providers in settings`,
    `target lang do not show in popup since rarely configured, settings has it.`,
    `put as first one for context menu`,
    `add langguage names options(may need select ) not lang code`,
    `allow typing fo fillter langcode, use fusejs or better pkgs  `,
    `'Content script unavailable. Reload the page and try again. (No content script frames responded)' do not show for pages like chrome://extensions/`,
    `if Auto-recover missing content script (inject, then reload page), if checked, do not show 'Content script unavailable. Reload the page and try again. (No content script frames responded)', reload directly. if not checked, add a reload button to reload page so user do not have to reload manually then click this ext to translate(wasting time).`,
    `base url in settings should not exists i think, since a provider map to one base url no need to configure it. remove it if not necessary.`,
    `'Required for Custom. API root only — do not include /chat/completions.', ask user to fill api url with /chat/completions for custom provider since this is more general way to user.`,
    `remove notices: Persistent cache stores translated text in IndexedDB (max 500,000 entries). Oldest entries are evicted after the limit.
Fixes errors like “Receiving end does not exist” on tabs opened before the extension loaded.
Grouped as API gateways (routers/aggregators) and direct model providers. Choose Custom for any other OpenAI-compatible endpoint.
Default: gemini-2.5-flash-lite. Click Save after changing. Selected: Chinese (Simplified) (简体中文) · zh-CN
`,
    `API key filed remove placeholder text.`,
    `hide Concurrency, since every one need translation as quicker as possible. no need to configure it, use biggest value possible`,
    `deepseek provider corresponding model name is DeepSeek-V4-Flash`,
    `check api key is exists on popup, not after click translate button.`,
  ],
  [`截止`],
];
