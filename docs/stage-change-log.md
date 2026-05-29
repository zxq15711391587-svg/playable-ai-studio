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
