# Plan: URL 结构辅助判断 article 页面

## 背景
- 例: `https://techcrunch.com/2026/07/23/how-ai-guardrails-.../`，日期型 permalink 强信号表明是 article 页。
- 现状: `isListingFeedRoot` 仅看 DOM h1/h2 数量，article 页若有多个相关推荐标题会被误判为 listing feed（影响 summarize 的分类与 prompt）。

## 方案
1. 新增 `src/features/dom/article-url.ts`：`isLikelyArticleUrl(url)` 纯函数，仅识别日期型 permalink（`/yyyy/mm/dd/slug`、`/yyyy/mm/slug`、`/yyyy-mm-dd-slug`）。ponytail 上限：不覆盖数字 ID 等其它 permalink 形式，按需扩展。
2. `collectPageTextForSummary` 增加 `pageUrl` 参数（默认 `doc.location?.href`）：URL 判定为 article 时不标记为 listing feed。
3. 测试先行：`article-url.test.ts` + `collect-page-text.test.ts` 补充用例，只跑这两个测试文件。
