# 仓库协作与 AI 续作机制

## 目标

长链路 AI 任务不能依赖单个聊天窗口。每个 AI 窗口都是一次短任务执行者，真正连续的是仓库里的上下文包、阶段产物、提交记录和推送历史。

## 双仓库方案

- `playable-ai-studio`：平台主仓库。
- `playable-ai-workspace`：具体游戏/playable 工作仓库。

第一版不为每个游戏单独建仓，而是在 workspace 仓库中按 `projects/<project-id>` 分目录管理。后续某个项目变大或要独立交付时，再拆成单独仓库。

## AI 窗口开始协议

每个新 AI 窗口开始时必须读取：

- 仓库根目录 `README.md`。
- `.ai/ai-rules.md`。
- `.ai/project-index.md`。
- 当前项目的 `README.md`。
- 当前项目的 `.ai/current-task.md`。
- 当前项目的 `.ai/handoff.md`。
- 当前项目的 `.ai/decisions.md`。
- 当前项目的 `.ai/stage-log.md`。
- `git status`。
- 最近的 `git log`。

## AI 窗口结束协议

每个 AI 窗口结束前必须更新：

- `.ai/handoff.md`：本轮做了什么、下一轮从哪里继续。
- `.ai/stage-log.md`：本阶段改动记录。
- `.ai/verification.md`：运行过什么检查、结果如何。
- `.ai/decisions.md`：新增关键决策。

然后必须：

- 提交 commit。
- push 到 GitHub。

## 记录原则

- 事实写进文件，不依赖聊天记忆。
- 决策写进 `decisions.md`，不要只写在总结里。
- 每个阶段只做一组明确任务，避免上下文无限膨胀。
- 公开仓库不提交 `.env`、API key、公司敏感素材和未授权参考资料。

