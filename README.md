# dsh-theme-triptych

DeepSeek Harness（DSH）外观主题插件包 —— 把 [keyshub.top](https://keyshub.top) 的三种主题色调与壁纸带进 DSH Web GUI。

三套主题逐字取自参考工程 `isolo-news/web/src/config/themes.ts`，三张壁纸与线上 Hero 背景图（`image_0/2/4_yi19x4.jpg`）SHA-256 完全一致。

| 主题 | 氛围 | 主色 / 次色 | 色系 |
| --- | --- | --- | --- |
| **NEXUS** | 赛博霓虹（暗色） | `#00f0ff` 青 / `#ff2d95` 品红 | 深蓝底 + 荧光点缀 |
| **COMIKET** | 温暖纸感（亮色） | `#ff6b2b` 橙 / `#3b9eff` 蓝 | 暖纸白底 |
| **IRONCORE** | 机械工业（暗色） | `#f0a030` 琥珀 / `#4ecdc4` 青绿 | 铁灰底 + 警示橙 |

## 特性

- 三套主题通过标准 `theme.register` 注册，与 DSH 内置 Light / Dark / System 完全互通（`theme.setTheme`）。
- 每套主题自带壁纸：自定义 token `--dsw-theme-wallpaper` 由主题 presenter 自动写入 `<body>` 内联变量，表面色（`bg-base / layer-1 / layer-2 / overlay / sidebar-fill`）改为半透明同色系，壁纸从底层透出，形成毛玻璃观感。
- 两处零侵入切换入口（均为 additive 槽位，`replaceRisk: none`）：
  - **设置 → 通用 → “外观主题 / Theme”**（order 11，紧跟系统 Appearance 行）：三张壁纸预览卡片 + “默认 System”；
  - **侧边栏底部 “主题外观” 调色板按钮**（order 10）：弹出四选项菜单，窄栏（rail）下自动收成纯图标。
- 卸载即还原：插件停用/更新时主题、样式、槽位全部自动清理。

## 工作原理（DSH 客户端插件格式）

这是一个标准 DSH **双面 `dsh.client` 包**：

- `package.json` 声明 `dsh.client: { platform: "web" }` 与 `exports["./client"]`；
- **Node 半部**（`lib/index.js`）：作为组合中的一个 loader 行挂载，用 `webServer` 注册三条精确路由（`/dsh-theme-triptych/*.jpg`），从包内 `assets/` 提供壁纸；
- **浏览器半部**（`lib/client.js`）：`__ModuleLoader__.load` 工厂包，注册主题、注入壁纸样式、挂载两个切换入口；
- 宿主扫描到该行后自动把客户端包编入 `window.__DSH_BOOT__`，浏览器按需加载 —— **无需重新构建 DSH Web 产物**。

## 安装（任选其一）

> 要求：本机已安装 DSH（`dsh` CLI 可用），并能访问 npm registry。

### 方式 A：官方安装脚本（推荐）

```bash
# Linux / macOS / Git Bash on Windows
bash install/install.sh            # 默认 profile: web；可传参: bash install/install.sh <profile>
# 或 PowerShell
powershell -ExecutionPolicy Bypass -File install/install.ps1   # 可传 -Profile <name>
```

脚本会：① 在 `$DSH_HOME/profiles/<profile>` 中 `pnpm add dsh-theme-triptych`（无 pnpm 则用 npm）；② 向 `cordis.patch.yml` 追加 loader 插入项；③ 提示重启。

### 方式 B：手动三步

```bash
# 1) 安装包（在 DSH 部署的 profile 目录下）
cd "$DSH_HOME/profiles/web"          # Windows: %USERPROFILE%\.dsh\profiles\web
pnpm add dsh-theme-triptych           # 或 npm install dsh-theme-triptych

# 2) 在 cordis.patch.yml 末尾追加（若文件内容是 []，整体替换为下面块）
```

```yaml
- insert:
    - id: dsh-theme-triptych
      name: dsh-theme-triptych
```

```bash
# 3) 重启 DSH
dsh --profile web
```

### 验证

```bash
# 壁纸路由（应返回 200 与 image/jpeg）
curl -I http://127.0.0.1:3080/dsh-theme-triptych/nexus.jpg
# 打开 Web GUI：侧边栏底部出现调色板按钮；设置 → 通用 出现“外观主题 / Theme”
```

## 卸载

```bash
cd "$DSH_HOME/profiles/web"
pnpm remove dsh-theme-triptych
# 并从 cordis.patch.yml 删除 installer 追加的 insert 块
```

## 从源码构建与测试

```bash
node scripts/build.mjs   # 生成 lib/client.js（__ModuleLoader__ 工厂包装）与 lib/index.js
node test/smoke.mjs      # 无 DSH 运行时依赖的冒烟测试（bundle 契约 + 壁纸路由）
```

## 发布（维护者）

DSH 插件没有独立的“提交审核”市场 —— 官方分发渠道就是 **npm**（见 deepseek-ai 官方文档 [`docs/user/develop/basic/publish.zh.md`](https://github.com/deepseek-ai/DeepSeek-Harness/blob/master/docs/user/develop/basic/publish.zh.md)），“能被搜到”取决于 npm 元数据与 GitHub 主题：

1. **发布到 npm**（官方渠道，`npm search` / `pnpm add` 可发现）：
   - 本地：`node scripts/build.mjs` 后 `npm publish --access public`（需 npm 账号）。
   - 自动：打 tag 触发 `.github/workflows/release.yml`（需在仓库 Secrets 配置 `NPM_TOKEN`）：
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
2. **优化 npm 可搜索性**：`description` 含 “DeepSeek Harness”，`keywords` 含 `deepseek-harness` / `dsh` / `dsh-plugin`（本包已配置）；补全 `repository` / `homepage` 字段让 npm 页面展示 GitHub 链接。
3. **让社区插件市场收录**（非官方，但覆盖面最广）：多数社区市场（如 [`DSH-Plugins-Marketplace`](https://github.com/bradeGithub/DSH-Plugins-Marketplace)、[`AwesomeHou/dsh-plugin-marketplace`](https://github.com/AwesomeHou/dsh-plugin-marketplace)）实时同步 GitHub **`dsh-plugin` topic** 下的仓库，或索引 npm 上 `dsh-plugin-*` 名称的包。在 GitHub 仓库页 **About → Topics** 添加 `dsh-plugin`（以及 `deepseek-harness`、`dsh`、`theme`），无需额外申请即可被这些市场自动收录。
4. 可选：向社区维护的 awesome 列表提交 PR（如 [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)）。

## 未经安装的试用（动态插件方式）

若只想在当前 DSH 会话里临时体验（无需改动部署），可在 GUI 会话中把 `src/index.js` / `src/client/index.js` 作为 `cordis_define` 的 `code.host` / `code.client` 声明一个动态插件并运行（需在 Run 卡片中允许）。重启后失效。

## 许可

MIT。壁纸图片来自 keyshub.top 项目（`isolo-news/web/public/images`），版权归原作者所有。

---

# English

`dsh-theme-triptych` brings the three appearance themes of [keyshub.top](https://keyshub.top) — **NEXUS** (neon cyan/pink, dark), **COMIKET** (warm paper, light) and **IRONCORE** (industrial amber/teal, dark) — to the DeepSeek Harness Web GUI, wallpapers included.

It is a standard DSH dual-face `dsh.client` package: the node half serves the three wallpapers over `webServer` routes (`/dsh-theme-triptych/*.jpg`), the browser half registers the themes (translucent surfaces over a wallpaper via the `--dsw-theme-wallpaper` token), and both a **Settings → General → 外观主题 row** and a **sidebar-footer palette button** switch themes. No web rebuild is required — the host serves the client bundle from disk (`/plugins/<id>/client.js`).

**Install:** `bash install/install.sh` (or manual: `pnpm add dsh-theme-triptych` inside `$DSH_HOME/profiles/<profile>`, append the `- insert:` block for `dsh-theme-triptych` to `cordis.patch.yml`, restart `dsh --profile web`).
