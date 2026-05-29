import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ViteDevServer } from 'vite';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type StageId =
  | 'intake'
  | 'plan'
  | 'previz'
  | 'prototype'
  | 'selfTest'
  | 'creative'
  | 'playable'
  | 'editor'
  | 'export';

type ProjectPayload = {
  id: string;
  name: string;
  gameplay: string;
  source: string;
  stage?: StageId;
  status?: string;
  updated?: string;
  brief?: string;
  target?: string;
  selectedCreative?: string;
  outputs?: Partial<Record<StageId, {
    title: string;
    createdAt: string;
    summary: string;
    bullets: string[];
  }>>;
  materials?: Array<{
    kind: string;
    name: string;
    type: string;
    size: number;
    textPreview?: string;
  }>;
};

type ProviderSettings = {
  baseUrl?: string;
  apiKey?: string;
  models?: Record<string, string>;
};

type ApiRequest = {
  settings?: ProviderSettings;
  stage?: StageId;
  activeStage?: StageId;
  project?: ProjectPayload;
  editorState?: {
    headline: string;
    progress: number;
    ctaTime: number;
    overlayPosition: 'top' | 'bottom';
  };
  logs?: string[];
};

const studioRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(studioRoot, '..', 'playable-ai-workspace');

const stageTitles: Record<StageId, string> = {
  intake: '项目接入摘要',
  plan: '游戏原型需求与美术方向',
  previz: '研发前视频预演包',
  prototype: '原型工程底座任务',
  selfTest: 'AI 自测报告',
  creative: 'Playable 创意发散包',
  playable: '单条 Playable 制作任务',
  editor: '编辑字段配置',
  export: 'HTML 导出检查',
};

export default defineConfig({
  plugins: [react(), playableAiApiPlugin()],
});

function playableAiApiPlugin() {
  return {
    name: 'playable-ai-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/model-test', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, message: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody<ApiRequest>(req);
          const settings = body.settings;
          const model = settings?.models?.planner ?? 'gpt-5.4';
          assertProviderSettings(settings);
          const startedAt = performance.now();
          const content = await callChatCompletion(settings, model, [
            {
              role: 'user',
              content: '请只回复 OK，用于测试 Playable AI Studio 模型连接。',
            },
          ]);
          sendJson(res, 200, {
            ok: true,
            model,
            latencyMs: Math.round(performance.now() - startedAt),
            message: content || 'OK',
          });
        } catch (error) {
          sendJson(res, 400, {
            ok: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      server.middlewares.use('/api/run-stage', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, message: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody<ApiRequest>(req);
          const stage = body.stage;
          const project = body.project;
          if (!stage || !project) {
            throw new Error('Missing stage or project payload.');
          }

          const settings = body.settings;
          const model = modelForStage(stage, settings);

          if (settings?.baseUrl && settings.apiKey) {
            const content = await callChatCompletion(settings, model, [
              {
                role: 'system',
                content:
                  '你是一个可玩广告生产平台的阶段执行 Agent。只输出 JSON，不要输出 markdown。JSON 字段为 title, summary, bullets。',
              },
              {
                role: 'user',
                content: buildStagePrompt(stage, project),
              },
            ]);
            const parsed = parseStageJson(content);
            sendJson(res, 200, {
              ok: true,
              source: 'provider',
              output: {
                ...parsed,
                createdAt: new Date().toISOString(),
              },
            });
            return;
          }

          sendJson(res, 200, {
            ok: true,
            source: 'fallback',
            output: {
              ...fallbackStageOutput(stage, project),
              createdAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          sendJson(res, 400, {
            ok: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      server.middlewares.use('/api/save-handoff', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, message: 'Method not allowed' });
          return;
        }

        try {
          const body = await readJsonBody<ApiRequest>(req);
          if (!body.project) {
            throw new Error('Missing project payload.');
          }

          const result = await saveWorkspaceHandoff(body);
          sendJson(res, 200, {
            ok: true,
            ...result,
          });
        } catch (error) {
          sendJson(res, 400, {
            ok: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    },
  };
}

function readJsonBody<T>(req: IncomingMessage) {
  return new Promise<T>((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function assertProviderSettings(settings?: ProviderSettings) {
  if (!settings?.baseUrl?.trim()) {
    throw new Error('请先填写 Base URL。');
  }
  if (!settings.apiKey?.trim()) {
    throw new Error('请先填写 API Key。');
  }
}

async function callChatCompletion(settings: ProviderSettings, model: string, messages: ChatMessage[]) {
  assertProviderSettings(settings);
  const endpoint = `${settings.baseUrl!.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 900,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
  }

  const payload = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? '';
}

function modelForStage(stage: StageId, settings?: ProviderSettings) {
  const keyByStage: Record<StageId, string> = {
    intake: 'planner',
    plan: 'planner',
    previz: 'video',
    prototype: 'developer',
    selfTest: 'tester',
    creative: 'director',
    playable: 'playable',
    editor: 'qa',
    export: 'qa',
  };
  return settings?.models?.[keyByStage[stage]] ?? 'gpt-5.4';
}

function buildStagePrompt(stage: StageId, project: ProjectPayload) {
  const materials = project.materials?.length
    ? project.materials.map((item) => `${item.kind}: ${item.name} (${item.type}, ${item.size} bytes) ${item.textPreview ?? ''}`).join('\n')
    : '未上传资料。';
  return [
    `阶段：${stageTitles[stage]}`,
    `项目：${project.name}`,
    `玩法：${project.gameplay}`,
    `来源：${project.source}`,
    `需求：${project.brief || '未填写'}`,
    `目标：${project.target || '未填写'}`,
    `已选创意：${project.selectedCreative || '未选择'}`,
    `资料：\n${materials}`,
    '请输出 JSON：{"title":"...","summary":"...","bullets":["...","...","..."]}',
  ].join('\n');
}

function parseStageJson(content: string) {
  const cleaned = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as {
    title?: string;
    summary?: string;
    bullets?: string[];
  };
  return {
    title: parsed.title || '阶段产物',
    summary: parsed.summary || 'AI 已生成阶段摘要。',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 6) : [],
  };
}

function fallbackStageOutput(stage: StageId, project: ProjectPayload) {
  const materialCount = project.materials?.length ?? 0;
  const common = [`项目：${project.name}`, `玩法：${project.gameplay}`, `资料数量：${materialCount}`];
  const byStage: Record<StageId, string[]> = {
    intake: ['已建立项目接入包。', '已记录需求、目标和素材清单。', '下一步进入策划与美术定案。'],
    plan: ['提炼核心规则、胜负条件和第一步操作。', '整理资源拆分、UI、特效和动画方向。', '生成研发与测试验收标准。'],
    previz: ['生成 5 镜头视频预演结构。', 'UI 文字、进度条、手势和 CTA 由程序叠加。', '等待人工确认风格和节奏。'],
    prototype: ['拆出 gameConfig、levelConfig、uiConfig 和 guideConfig。', '要求核心玩法可运行可试玩。', '预留后续 playable 编辑字段。'],
    selfTest: ['检查规则正确性、操作手感和关卡完成性。', '检查移动端适配、加载和性能风险。', '输出是否建议人工试玩。'],
    creative: ['生成差一步成功、高压倒计时和强爽感连击方向。', '每条创意声明可编辑字段。', '等待人工选择单条制作。'],
    playable: ['生成单条 playable 制作任务。', '记录创意实现说明和自测要求。', '整理可编辑字段初稿。'],
    editor: ['暴露文案、进度、CTA 时间和 UI 位置。', '保存编辑配置。', '准备多版本对比能力。'],
    export: ['生成单文件 HTML。', '记录 QA 检查项。', '后续补充 zip、录屏和渠道适配。'],
  };
  return {
    title: stageTitles[stage],
    summary: `${stageTitles[stage]} 已由本地 fallback 生成。配置 API 后可切换为真实模型生成。`,
    bullets: [...common, ...byStage[stage]].slice(0, 6),
  };
}

async function saveWorkspaceHandoff(body: ApiRequest) {
  const project = body.project!;
  const projectId = sanitizeProjectId(project.id || project.name);
  const currentStage = body.activeStage ?? project.stage ?? 'intake';
  const projectRoot = join(workspaceRoot, 'projects', projectId);
  const aiDir = join(projectRoot, '.ai');
  const timestamp = new Date().toISOString();

  await Promise.all([
    mkdir(aiDir, { recursive: true }),
    mkdir(join(projectRoot, 'requirements'), { recursive: true }),
    mkdir(join(projectRoot, 'previz'), { recursive: true }),
    mkdir(join(projectRoot, 'prototype'), { recursive: true }),
    mkdir(join(projectRoot, 'playable'), { recursive: true }),
    mkdir(join(projectRoot, 'exports'), { recursive: true }),
  ]);

  const files: string[] = [
    `projects/${projectId}/README.md`,
    `projects/${projectId}/.ai/current-task.md`,
    `projects/${projectId}/.ai/handoff.md`,
    `projects/${projectId}/.ai/decisions.md`,
    `projects/${projectId}/.ai/stage-log.md`,
    `projects/${projectId}/.ai/verification.md`,
    `projects/${projectId}/requirements/game-requirement.md`,
    `projects/${projectId}/requirements/art-direction.md`,
    '.ai/project-index.md',
  ];

  await writeFile(join(projectRoot, 'README.md'), renderProjectReadme(projectId, project, currentStage), 'utf8');
  await writeFile(join(aiDir, 'current-task.md'), renderCurrentTask(project, currentStage), 'utf8');
  await writeFile(join(aiDir, 'handoff.md'), renderHandoff(project, currentStage, body, timestamp), 'utf8');
  await writeFile(join(aiDir, 'decisions.md'), renderDecisions(project, body, timestamp), 'utf8');
  await writeFile(join(aiDir, 'verification.md'), renderVerification(project, timestamp), 'utf8');
  await writeFile(join(projectRoot, 'requirements', 'game-requirement.md'), renderGameRequirement(project), 'utf8');
  await writeFile(join(projectRoot, 'requirements', 'art-direction.md'), renderArtDirection(project), 'utf8');
  await appendStageLog(join(aiDir, 'stage-log.md'), project, currentStage, body, timestamp);
  await upsertProjectIndex(projectId, project, currentStage);

  return {
    projectId,
    projectPath: `projects/${projectId}`,
    files,
  };
}

function sanitizeProjectId(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return `project-${Date.now()}`;
  }
  return sanitized;
}

function markdownList(items?: string[]) {
  if (!items?.length) return '- 暂无。';
  return items.map((item) => `- ${item}`).join('\n');
}

function materialList(project: ProjectPayload) {
  if (!project.materials?.length) return '- 尚未接入资料。';
  return project.materials
    .map((item) => `- ${item.kind}: ${item.name} (${item.type || 'unknown'}, ${item.size} bytes)`)
    .join('\n');
}

function renderProjectReadme(projectId: string, project: ProjectPayload, currentStage: StageId) {
  return `# ${project.name}

## Project ID

\`${projectId}\`

## Current Goal

${project.target || '等待补充本轮目标。'}

## Current Stage

- 阶段：${stageTitles[currentStage]}
- 状态：${project.status || 'Synced from Playable AI Studio'}
- 玩法：${project.gameplay || '未填写'}
- 来源：${project.source || '未填写'}

## Context Package

新 AI 窗口必须先读：

- \`.ai/current-task.md\`
- \`.ai/handoff.md\`
- \`.ai/decisions.md\`
- \`.ai/stage-log.md\`
- \`.ai/verification.md\`
`;
}

function renderCurrentTask(project: ProjectPayload, currentStage: StageId) {
  return `# Current Task

## Stage

${stageTitles[currentStage]}

## Task

${project.target || '继续根据平台同步的项目上下文推进当前阶段。'}

## Project Summary

- 项目：${project.name}
- 玩法：${project.gameplay || '未填写'}
- 来源：${project.source || '未填写'}
- 当前状态：${project.status || 'Synced from Playable AI Studio'}

## Acceptance Criteria

- 先读取本项目 \`.ai/\` 上下文包。
- 不依赖聊天窗口记忆，所有关键结论写回项目目录。
- 阶段完成后更新 handoff、stage-log、verification 和 decisions。
- 不提交 API Key、公司敏感素材或私有素材。

## Next Planned Task

${nextStageTask(currentStage)}
`;
}

function renderHandoff(project: ProjectPayload, currentStage: StageId, body: ApiRequest, timestamp: string) {
  const latestOutput = project.outputs?.[currentStage];
  return `# Handoff

## Current State

- 当前阶段：${stageTitles[currentStage]}
- 当前任务：${project.target || '未填写'}
- 当前项目：${project.name}
- 玩法：${project.gameplay || '未填写'}
- 同步时间：${timestamp}

## What Changed This Round

- 从 Playable AI Studio 保存当前项目上下文。
- 同步项目需求、资料索引、编辑字段和最近阶段产物。
- 为下一个 AI 窗口准备可恢复上下文包。

## Latest Stage Output

${latestOutput ? renderStageOutput(latestOutput) : '- 当前阶段尚未生成阶段产物。'}

## Editor State

- 开局文案：${body.editorState?.headline || '未同步'}
- 进度值：${body.editorState?.progress ?? '未同步'}
- CTA 时间：${body.editorState?.ctaTime ?? '未同步'}
- UI 位置：${body.editorState?.overlayPosition || '未同步'}

## Recent Studio Log

${markdownList(body.logs?.slice(0, 6))}

## Known Issues

- 当前同步只保存元数据和文字需求，不复制本机上传的原始文件内容。
- 真实公司项目应切换到私有仓库。

## Next AI Window Should Start Here

1. 读取根目录 README、\`.ai/ai-rules.md\` 和 \`.ai/project-index.md\`。
2. 读取本项目 \`.ai/current-task.md\`、\`.ai/handoff.md\`、\`.ai/decisions.md\`、\`.ai/stage-log.md\` 和 \`.ai/verification.md\`。
3. 从 ${stageTitles[currentStage]} 继续推进，完成后写回交接并提交。
`;
}

function renderDecisions(project: ProjectPayload, body: ApiRequest, timestamp: string) {
  const selectedCreative = project.selectedCreative || '尚未选择';
  return `# Decisions

## ${timestamp}

- 项目通过 Playable AI Studio 同步到 workspace。
- 当前目标：${project.target || '未填写'}
- 已选创意：${selectedCreative}
- 编辑字段：文案 ${body.editorState?.headline || '未同步'}；进度 ${body.editorState?.progress ?? '未同步'}；CTA ${body.editorState?.ctaTime ?? '未同步'}s；位置 ${body.editorState?.overlayPosition || '未同步'}。
- 公开仓库只保存 Demo 文字与文件元数据，不保存 API Key 和原始敏感素材。
`;
}

function renderVerification(project: ProjectPayload, timestamp: string) {
  return `# Verification

## ${timestamp}

- Playable AI Studio 已生成本项目上下文包。
- 已写入项目 README、current-task、handoff、decisions、stage-log、verification 和需求文档。
- 已同步 ${project.materials?.length ?? 0} 个资料元数据。
- 未同步 API Key。

## Pending

- 下一轮 AI 需要根据具体阶段补充真实构建、测试或导出验证结果。
`;
}

function renderGameRequirement(project: ProjectPayload) {
  return `# Game Requirement

## Project

- 名称：${project.name}
- 玩法：${project.gameplay || '未填写'}
- 来源：${project.source || '未填写'}

## Brief

${project.brief || '未填写详细需求。'}

## Goal

${project.target || '未填写本轮目标。'}

## Materials

${materialList(project)}

## Expected Output

- 可提炼玩法规则。
- 可形成研发前视频预演。
- 可生成可改造成最终 playable 的工程底座。
- 可声明后续编辑字段和 QA 标准。
`;
}

function renderArtDirection(project: ProjectPayload) {
  const artMaterials = project.materials?.filter((item) => ['effectImage', 'effectVideo', 'artReference', 'artDoc'].includes(item.kind)) ?? [];
  return `# Art Direction

## Source Materials

${artMaterials.length ? artMaterials.map((item) => `- ${item.kind}: ${item.name} (${item.type || 'unknown'})`).join('\n') : '- 尚未同步美术参考、效果图或效果视频。'}

## Direction

- 根据上传参考提炼最终画面、UI、动效、特效和视频预演风格。
- 视频模型产物中的文字、进度条、按钮和 CTA 建议由程序叠加，避免模型生成文字不可控。
- 进入研发前，先输出可确认的视频预演或分镜。
`;
}

async function appendStageLog(path: string, project: ProjectPayload, currentStage: StageId, body: ApiRequest, timestamp: string) {
  let existing = '';
  try {
    existing = await readFile(path, 'utf8');
  } catch {
    existing = '# Stage Log\n';
  }

  const latestOutput = project.outputs?.[currentStage];
  const entry = `

## ${timestamp}：${stageTitles[currentStage]}

### Goal

- ${project.target || '继续推进当前阶段。'}

### Changes

- Playable AI Studio 保存交接上下文。
- 同步项目资料元数据、编辑器状态和最近日志。
${latestOutput ? `- 同步阶段产物：《${latestOutput.title}》。` : '- 当前阶段暂无阶段产物。'}

### Decisions

- 使用 workspace 项目目录作为下一个 AI 窗口的上下文来源。
- 不保存 API Key。

### Verification

- 平台端完成 handoff 文件写入。
- 下一轮 AI 需补充阶段内真实验证。

### Push Status

- 待提交并推送。
`;

  await writeFile(path, `${existing.trimEnd()}\n${entry}`, 'utf8');
}

async function upsertProjectIndex(projectId: string, project: ProjectPayload, currentStage: StageId) {
  const path = join(workspaceRoot, '.ai', 'project-index.md');
  const row = `| ${escapeTable(projectId)} | ${escapeTable(project.gameplay || '未填写玩法')} | ${escapeTable(stageTitles[currentStage])} | ${escapeTable(project.status || 'Synced')} | \`projects/${projectId}\` |`;
  let content = await readFile(path, 'utf8');
  const lines = content.split('\n');
  const existingIndex = lines.findIndex((line) => line.startsWith(`| ${projectId} |`));
  if (existingIndex >= 0) {
    lines[existingIndex] = row;
    content = lines.join('\n');
  } else {
    const usageIndex = lines.findIndex((line) => line.trim() === '## Usage');
    if (usageIndex >= 0) {
      lines.splice(usageIndex - 1, 0, row);
      content = lines.join('\n');
    } else {
      content = `${content.trimEnd()}\n${row}\n`;
    }
  }
  await writeFile(path, content, 'utf8');
}

function renderStageOutput(output: { title: string; summary: string; bullets: string[] }) {
  return [`- 标题：${output.title}`, `- 摘要：${output.summary}`, ...output.bullets.map((item) => `- ${item}`)].join('\n');
}

function nextStageTask(stage: StageId) {
  const nextByStage: Record<StageId, string> = {
    intake: '继续整理项目资料并进入策划美术定案。',
    plan: '补齐玩法规则、美术方向、研发验收和测试验收标准。',
    previz: '生成研发前视频预演分镜、视频 prompt 和 UI overlay 配置。',
    prototype: '生成可改造成最终 playable 的原型工程底座。',
    selfTest: '执行 AI 自测并写入验证结论。',
    creative: '发散多条 playable 创意，并声明每条可编辑字段。',
    playable: '制作用户选择的单条 playable。',
    editor: '同步编辑字段并确认预览效果。',
    export: '执行 QA 并输出 HTML playable 交付包。',
  };
  return nextByStage[stage];
}

function escapeTable(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
