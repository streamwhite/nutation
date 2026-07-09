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
  [
    `need to be much quicker, find bottle neccks and optimize them.`,
    `always open popup until user close it.`,
  ],
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
  [`set default gemini model to gemini-2.5-flash-lite, `],
];
