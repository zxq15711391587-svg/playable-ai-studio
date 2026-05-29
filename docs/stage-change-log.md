# 阶段变更记录

## 2026-05-29：阶段 0 - 新主仓库初始化

### 改动内容

- 创建 `playable-ai-studio` 作为正式平台主仓库。
- 写入平台总计划、阶段流程、模型设置方案和仓库协作机制。
- 明确 `playable-ai-workspace` 为具体游戏/playable 工作仓库。
- 明确旧 `playable-schema` 仓库保留为历史实验仓。

### 目的

- 将正式比赛/平台主线从旧实验仓中拆出来。
- 为后续平台实现提供干净、可持续的文档基线。
- 建立每个阶段记录变更并 push 的机制。

### 验证方式

- `gh repo view zxq15711391587-svg/playable-ai-studio --json name,visibility,url,defaultBranchRef` 确认仓库为 public，默认分支为 main。
- `git clone https://github.com/zxq15711391587-svg/playable-ai-studio.git /private/tmp/playable-ai-studio-verify` 确认公开 clone 可用。
- `git status --short --branch` 确认本地分支跟踪 `origin/main`。
- `rg` 扫描确认没有 `.env`、API key 或敏感素材进入仓库。
- README 已说明：本仓库负责平台系统，`playable-ai-workspace` 负责具体项目。

### 推送状态

- 已提交并推送到 GitHub。

## 2026-05-30：阶段 2 - 接入、持久化和模型测试

### 改动内容

- 新增项目资料接入表单：项目名称、玩法类型、游戏需求描述、本轮目标。
- 新增真实文件接入入口：游戏需求、效果图、效果视频和美术参考可上传，平台记录文件名、类型、大小和文本预览。
- 新增本地持久化：项目、设置、编辑字段和 handoff log 写入 `localStorage`，刷新后不丢。
- 模型测试从模拟 `setTimeout` 改为真实请求 `Base URL + /chat/completions`，使用 API Key 和策划模型发送测试消息。
- 阶段执行会生成结构化阶段产物摘要，并保存到当前项目。
- 创意卡片的“选择制作”会进入单条 playable 制作阶段。
- HTML 导出按钮会生成并下载当前预览配置对应的单文件 HTML。

### 目的

- 让平台从“可看的流程 UI”进入“能实际接入项目和验证模型”的工作状态。
- 为后续 AI 策划、美术、视频预演和原型生成接真实接口打基础。

### 验证方式

- `npm run build` 通过 TypeScript 与 Vite 生产构建。
- `npm audit --audit-level=high` 确认 0 vulnerabilities。
- 使用本机 Chrome headless 打开 `http://127.0.0.1:5175/` 并截图检查资料接入、模型测试结果和编辑器布局。

### 推送状态

- 待提交并推送。

## 2026-05-29：阶段 1 - 可运行平台原型

### 改动内容

- 新增 React + Vite 前端应用。
- 实现平台主工作台：项目列表、生产流水线、阶段产物、AI 团队、创意候选、续作交接日志。
- 实现设置中心：API Base URL、API Key、各阶段模型选择和测试按钮。
- 实现 playable 预览与编辑面板：文案、进度、CTA 时间、UI 位置和导出入口。
- 更新 README，说明本仓库是可运行平台仓库。

### 目的

- 将平台从文档方案推进到可操作的第一版产品界面。
- 让用户能看到完整流程如何在一个工具中串起来。
- 为后续真实 AI 接口、项目持久化、视频预演、原型生成和 HTML 导出接入打基础。

### 验证方式

- `npm install` 安装依赖并完成 npm audit。
- `npm run build` 完成 TypeScript 与 Vite 生产构建。
- `npm audit --audit-level=high` 确认 0 vulnerabilities。
- 使用本机 Chrome headless 打开 `http://127.0.0.1:5175/` 并截图检查桌面和移动端主界面。

### 推送状态

- 已提交并推送到 GitHub。
