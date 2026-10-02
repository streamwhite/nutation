# Plan: 稳健判断 article(详情页) / listing(列表页)

## 背景与现状问题

消费者有两处：
- `summarize`: `isListingFeed` 决定是否提示「列表页内容可能不完整」。
- `page-translator`: progressive 模式下 `isListingFeedRoot` 决定是否只收集视口附近内容。

现状判定过于脆弱：
1. `isLikelyArticleUrl` 只认日期型 permalink，`/news/some-slug`、`/23843319/apple-review` 等主流新闻/博客 URL 全部漏判。
2. `isListingFeedRoot` 只看 DOM 里 h1/h2 数量 ≥ 3。长文（多个 h2 小节）或正文里带「相关阅读」标题的 article 会被误判为 listing feed。
3. 只看 DOM 数量，忽略「列表页标题通常是链接」这一强信号。

## 行业最佳实践（分层信号，高精度优先）

按置信度从高到低叠加，任一层给出结论即短路：
1. **结构化元数据**（最可靠）：Open Graph `og:type=article`、`article:published_time/modified_time`、JSON-LD `@type ∈ {Article, NewsArticle, BlogPosting, ...}`。
2. **URL 负信号**：`/category/`、`/tag/`、`/author/`、`/page/`、`?page=`/`?paged=`/`?q=` 等分页或聚合路径。
3. **URL 正信号**：日期 permalink、数字 ID + slug、`/article|story|post|news|blog/<slug>`。
4. **DOM 形态**：多个 h1/h2 且多数标题本身是链接（Readability 类算法把 anchor 作为负权重）→ feed；否则视为 article。

## 实施

1. `src/shared/constants.ts`: 新增 `ARTICLE_SCHEMA_TYPES`、`ARTICLE_PATH_SEGMENTS`、`LISTING_PATH_SEGMENTS`、`LISTING_QUERY_PARAMS`、`MIN_LINKED_HEADLINE_RATIO`。
2. `src/features/dom/article-url.ts`: 扩展 `isLikelyArticleUrl`（日期 / 数字 ID / 关键字），新增 `isLikelyListingUrl`。
3. 新增 `src/features/dom/article-metadata.ts`: `hasArticleMetadata(doc)`（og / article:* / JSON-LD）。
4. `src/features/dom/content-root.ts`: `isListingFeedRoot` 改为「标题数量 ≥ N 且多数标题是链接」。
5. 新增 `src/features/dom/page-kind.ts`: `isLikelyListingFeed(doc, url)` 按上文优先级组合信号。
6. 接入消费者：`collect-page-text.ts`、`page-translator.ts`（在 `start()` 只算一次，避免滚动时重复解析 JSON-LD）。
7. 测试先行：`article-url.test.ts`、`article-metadata.test.ts`、`page-kind.test.ts`，更新 `collect-page-text.test.ts` 的列表用例为真实「标题链接」结构。
