# ChordFlow Open Source Checklist

这份清单用于把项目发布到 GitHub 前做最后核对。

## 建议上传

- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `OPEN_SOURCE.md`
- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `scripts/`
- `src/`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/`
- `src-tauri/icons/`
- `src-tauri/src/`

## 不要上传

- `.env`
- `.env.local`
- 任何真实 API key、token、密码、证书或签名私钥
- `node_modules/`
- `dist/`
- `src-tauri/target/`
- `src-tauri/gen/`
- `icon-qa/`
- `*.tsbuildinfo`
- `vite-dev.*.log`
- `vite.config.js`
- `vite.config.d.ts`
- `*.p12`
- `*.pfx`
- `*.key`
- `*.pem`

## 发布前检查

1. 确认 `.env.example` 只有占位符，没有真实密钥。
2. 确认 README 使用的是 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`。
3. 确认图标资源 `src-tauri/icons/` 你有权公开使用。
4. 运行 `npm run build`，确认前端构建通过。
5. 如需验证桌面打包，运行 `npm run desktop:build`。
6. 初始化 Git 仓库后，用 `git status --short` 检查将要提交的文件。
