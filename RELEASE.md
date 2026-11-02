# Nutation 发布打包

发布产物统一输出到 `release/`，文件名格式：

```
nutation-<version>-<market>.zip
```

同时会生成不带版本号的别名，供 README 中的 `releases/latest/download/...` 直链使用：

```
nutation-chrome.zip
nutation-edge.zip
nutation-safari.zip
nutation-firefox.zip
nutation-firefox-sources.zip
```

## 命令

```bash
pnpm release           # 打包全部市场
pnpm release:chrome    # Chrome Web Store
pnpm release:edge      # Microsoft Edge Add-ons
pnpm release:firefox   # Firefox Add-ons (AMO)
pnpm release:safari    # Safari Extensions (App Store)
```

也可以直接指定多个目标：

```bash
node scripts/package-extensions.mjs chrome firefox
```

## 市场对应关系

| 市场 | 上传文件 | 说明 |
| --- | --- | --- |
| Chrome Web Store | `nutation-<version>-chrome.zip` | Chromium MV3 |
| Microsoft Edge Add-ons | `nutation-<version>-edge.zip` | 与 Chrome 包相同 |
| Safari Extensions (App Store) | `nutation-<version>-safari.zip` | Safari MV2 包，需用 Xcode 转换后提交 |
| Firefox Add-ons (AMO) | `nutation-<version>-firefox.zip` | 另附 `nutation-<version>-firefox-sources.zip` |
| Brave / Vivaldi 等 Chromium 浏览器 | Chrome 包 | 通过 Chrome Web Store 安装 |

Firefox 首次提交可让 AMO 自动分配扩展 ID；如果希望固定 ID 以便后续更新，可在
`wxt.config.ts` 的 manifest 中补充 `browser_specific_settings.gecko.id`。

## 发布到 GitHub Release

把 `release/` 下所有 zip 上传到同一个 GitHub Release，并保留不带版本号的别名，README 中的直链才能持续指向最新安装包。

```bash
# 第一次发布（tag 建议与 package.json 版本一致）
gh release create v0.1.0 release/*.zip \
  --title "Nutation v0.1.0" \
  --generate-notes

# 已存在 Release 时追加/覆盖
gh release upload v0.1.0 release/*.zip --clobber
```

## 发布前检查

1. 修改 `package.json` 的 `version`
2. 确认 `wxt.config.ts` 中的 `manifest.name` / `description`
3. 运行 `pnpm test` 和 `pnpm compile`
4. 运行对应的 `pnpm release:*`
5. 上传 `release/` 中对应市场的 zip

## Safari

`pnpm release:safari` 会生成 `nutation-<version>-safari.zip`。Safari 扩展不能直接把这个 zip 上传到 App Store：
需要在 macOS 上用 Xcode 的 `safari-web-extension-converter` 转换，再通过 App Store Connect 提交。
