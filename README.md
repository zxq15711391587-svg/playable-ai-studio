# Playable AI Studio

Playable AI Studio 是一个 AI 可玩广告生产平台方案。它不追求让 AI 一次性生成商业级游戏，而是把 AI 放进可控流水线：需求整理、视频预演、原型工程、测试自测、创意发散、可玩制作、编辑微调和 HTML 导出。

## Repository Role

这个仓库是平台主仓库，负责沉淀：

- 平台总计划和阶段流程。
- 模型与服务设置方案。
- AI 任务续作与仓库协作机制。
- 后续平台代码、编辑器、导出器和任务系统。

具体游戏原型和 playable 项目放在工作仓库：

- https://github.com/zxq15711391587-svg/playable-ai-workspace

旧的 `playable-schema` 仓库保留为历史实验仓，不再作为正式主线。

## Documents

- [平台总计划](docs/platform-plan.md)
- [阶段流程](docs/stage-flow.md)
- [模型设置方案](docs/model-settings.md)
- [仓库协作与 AI 续作机制](docs/repo-collaboration.md)
- [阶段变更记录](docs/stage-change-log.md)

## Current Status

当前已经有第一版可运行平台原型：

- React + Vite 前端工作台。
- 项目接入、阶段流水线、AI 团队状态、创意候选、续作交接日志。
- 项目资料表单和文件接入，支持记录需求、效果图、效果视频和美术参考。
- 模型与服务设置面板，包含 Base URL、API Key、各阶段模型选择和测试按钮。
- 本地开发代理会代替浏览器向配置的 `Base URL /chat/completions` 发起真实请求，避免浏览器 CORS 和前端直连问题。
- 阶段执行会优先调用对应阶段模型生成结构化产物；未配置 API 时自动使用本地 fallback，保证流程能继续演示。
- 保存交接会把当前项目同步到 `playable-ai-workspace/projects/<project-id>`，生成项目级 `.ai/` 上下文包。
- playable 实时预览和编辑面板，支持文案、进度、CTA 时间和 UI 位置调整。
- 本地持久化项目、设置、编辑字段和 handoff log。
- HTML 导出入口，可生成单文件 HTML。

## Development

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```
