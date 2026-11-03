# Nutation

[English](./README.md) | **简体中文**

Nutation（章动）是一个浏览器网页翻译扩展。它只翻译真正需要阅读的内容：**详情页翻主体正文，列表页翻标题和描述**，从而减少无效翻译和 API 消耗。

支持 Chrome、Edge、Firefox、Safari，以及任意 OpenAI 兼容接口。

## 下载

从 [GitHub Releases](../../releases/latest) 获取最新安装包。

## 功能

- **页面翻译**：在原文位置直接替换为目标语言，支持“全页优先”和“视口优先”两种模式。
- **多标签同时翻译**：一次翻译多个选中的标签页。
- **滚动自动翻译**：页面滚动时自动翻译新加载的内容。
- **翻译很快**：并发批处理与缓存命中，长页面也能快速完成。
- **智能内容范围**：
  - 文章/详情页只翻译标题和主体内容
  - 列表/信息流页只翻译标题和描述
  - 自动跳过导航、侧栏、评论、相关推荐、订阅、广告、分页等非正文区域
- **多服务商**：OpenAI、Anthropic、Google Gemini、DeepSeek、xAI、Mistral、OpenRouter、Vercel AI Gateway，或自定义 OpenAI 兼容端点。
- **个性化配置**：可配置服务商、模型、目标语言、翻译模式、摘要面板位置、缓存上限和站点自动翻译规则。
- **AI 页面总结**：在侧边浮层中生成当前页面摘要。
- **复制页面信息**：一键复制翻译后的标题、描述和清理过跟踪参数的链接。
- **翻译缓存**：相同文本不会重复请求，降低费用。
- **完全隐私**：所有个人信息只保留在本地。
- **打开即翻译**：按 URL 前缀、域名或正则规则自动翻译指定网站。

## 支持的服务商

| 类型 | 服务商 |
| --- | --- |
| API 网关 | OpenRouter、Vercel AI Gateway |
| 直连服务商 | OpenAI、Anthropic、Google Gemini、DeepSeek、xAI、Mistral |
| 自定义 | 任意 OpenAI 兼容 `/chat/completions` 端点 |

## 快速开始

1. 安装 Nutation（见下方“安装”）。
2. 打开扩展的 **设置 / Options**。
3. 选择服务商，填写对应的 **API Key**（请自行通过互联网搜索对应供应商的官方文档获取 API Key）。
4. 选择模型，并设置默认目标语言。
5. 点击 **保存设置**。
6. 打开任意网页，点击工具栏中的 Nutation 图标。
7. 点击 **翻译页面**；需要恢复原文时点击 **恢复原文**。

> API Key 只保存在浏览器本地存储中。网页文本会直接发送给你选择的服务商，Nutation 不经过自己的服务器。Nutation 不提供或转售 API Key，请从对应服务商官网自行申请。

## 推荐模型（cost effective）

| 服务商 | 模型 ID | 说明 |
| --- | --- | --- |
| OpenAI | `gpt-6-luna` | 速度快、成本低，适合日常网页翻译 |
| DeepSeek | `deepseek-v4.1-flash` | DeepSeek V4.1 Flash，成本很低，适合长页面和批量文本 |
| OpenRouter | `deepseek/deepseek-v4.1-flash` | 想用一个 Key 切换多家模型时使用 |
| Vercel AI Gateway | `deepseek/deepseek-v4.1-flash` | 需要统一网关、额度或团队管理时使用 |

模型 ID 请以服务商控制台实际显示的 ID 为准；不同网关的模型前缀可能不同。

推荐综合考虑以下因素：**性能**、**成本**、**准确度**和**实际体验**。

## 安装

### 从商店安装

暂不支持从商店直接安装（正在上架）。上架后会支持：

- Chrome Web Store
- Microsoft Edge Add-ons
- Firefox Add-ons
- Safari 扩展（App Store）

### 离线安装

从 GitHub Releases 下载对应浏览器的安装包；如果你是从源码运行，执行 `pnpm release` 后，同样的文件会生成在 `release/` 目录。

#### Chrome / Edge

1. 从 GitHub Releases 下载对应安装包，例如 `nutation-chrome.zip`（也可以使用 `nutation-edge.zip`）。
2. 解压到一个固定目录，安装后不要删除该目录。
3. 打开扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
4. 打开右上角的 **开发者模式**。
5. 点击 **加载已解压的扩展程序**，选择解压后的目录。

#### Firefox

临时加载：

1. 下载并解压 `nutation-firefox.zip`。
2. 打开 `about:debugging#/runtime/this-firefox`。
3. 点击 **临时载入附加组件**，选择解压目录中的 `manifest.json`。

> Firefox 正式版默认只允许安装已签名的扩展。临时加载会在浏览器重启后失效；长期使用请通过 Firefox Add-ons 安装，或使用 AMO 签名后的 XPI。

#### Safari

Safari 扩展通过 App Store 分发。开发时运行 `pnpm release:safari`，用 Xcode 的 `safari-web-extension-converter` 转换生成的安装包，然后在 Safari 中运行生成的应用。

### 从源码构建

```bash
pnpm install
pnpm dev          # Chrome 开发模式
pnpm dev:firefox  # Firefox 开发模式
pnpm build        # 生产构建
pnpm release      # 打包各市场 zip 到 release/
```

详细发布说明见 [RELEASE.md](./RELEASE.md)。

## 使用建议

- 列表页只翻标题和描述，适合快速浏览新闻、博客、论坛和搜索结果。
- 详情页只翻正文，适合阅读文章、文档和教程。
- 如果页面结构特殊，可以在设置中选择 **Custom**，填入自己的 OpenAI 兼容端点。
- 对成本敏感时，优先使用 `gpt-6-luna` 或 `deepseek-v4.1-flash`；先用列表页/短文章测试效果。
- 翻译只修改当前页面的 DOM 显示，不会改动网站源文件；点击 **恢复原文** 可还原。

## 开发

技术栈：WXT + React + Tailwind CSS + TypeScript。

项目内置默认配置，不需要 `.env` 或 `.env.production`。用户只需在扩展设置中配置服务商和 API Key。

```bash
pnpm test       # 单元测试
pnpm compile    # TypeScript 类型检查
```

## 支持这个项目

如果这个项目对你有帮助，欢迎通过以下方式支持它：

- **赞助或捐赠**：支持项目持续维护和更新（可使用仓库主页的 Sponsor 入口，或联系维护者获取当前捐赠方式）
- **分享工具**：把 Nutation 推荐给朋友、同事或社区
- **Star 项目**：在 GitHub 上给项目点一个 Star
- **翻译这个项目**：帮助把 Nutation 的界面和文档翻译成更多语言。文档翻译在 [`README.md`](./README.md)、[`README.zh-CN.md`](./README.zh-CN.md) 中；界面文案在 [`src/i18n/messages/`](./src/i18n/messages/) 下的 JSON 文件中。新增语言时，在这里添加 `<locale>.json`，然后提交 PR 即可。
- **参与贡献**：提交 Issue、改进文档、报告 Bug 或发起 Pull Request

感谢你的支持！

## 许可证

本项目采用 [Apache License 2.0](./LICENSE) 协议授权。
