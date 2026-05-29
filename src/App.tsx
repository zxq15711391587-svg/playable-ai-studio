import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileDown,
  Film,
  FlaskConical,
  Gauge,
  Image,
  Layers3,
  LayoutPanelLeft,
  MonitorPlay,
  Palette,
  Play,
  Plus,
  RadioTower,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';

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

type StageStatus = 'done' | 'active' | 'waiting';

type MaterialKind = 'requirement' | 'effectImage' | 'effectVideo' | 'artReference' | 'artDoc';

type ProjectMaterial = {
  id: string;
  kind: MaterialKind;
  name: string;
  type: string;
  size: number;
  textPreview?: string;
};

type StageOutput = {
  title: string;
  createdAt: string;
  summary: string;
  bullets: string[];
};

type Project = {
  id: string;
  name: string;
  gameplay: string;
  source: string;
  stage: StageId;
  status: string;
  updated: string;
  brief: string;
  target: string;
  materials: ProjectMaterial[];
  outputs: Partial<Record<StageId, StageOutput>>;
  selectedCreative?: string;
};

type ModelKey =
  | 'planner'
  | 'art'
  | 'video'
  | 'developer'
  | 'tester'
  | 'director'
  | 'playable'
  | 'qa';

type ModelSettings = {
  baseUrl: string;
  apiKey: string;
  models: Record<ModelKey, string>;
};

type ModelTestState = 'idle' | 'testing' | 'passed' | 'failed';

type ModelTestResult = {
  status: ModelTestState;
  message: string;
  latencyMs?: number;
};

type StageRunState = 'idle' | 'running' | 'failed';
type HandoffSaveState = 'idle' | 'saving' | 'saved' | 'failed';

type ModelTestApiResponse = {
  ok: boolean;
  model?: string;
  latencyMs?: number;
  message?: string;
};

type StageApiResponse = {
  ok: boolean;
  source?: 'provider' | 'fallback';
  output?: StageOutput;
  message?: string;
};

type HandoffApiResponse = {
  ok: boolean;
  projectId?: string;
  projectPath?: string;
  files?: string[];
  message?: string;
};

type Artifact = {
  title: string;
  meta: string;
  items: string[];
};

const stages: Array<{
  id: StageId;
  title: string;
  short: string;
  owner: string;
  icon: typeof ClipboardList;
}> = [
  { id: 'intake', title: '资料接入', short: '需求/图/视频', owner: 'Producer', icon: UploadCloud },
  { id: 'plan', title: '策划美术定案', short: '规则/风格', owner: 'AI 策划 + 美术', icon: Brain },
  { id: 'previz', title: '视频预演', short: '分镜/Prompt', owner: 'AI 编导', icon: Film },
  { id: 'prototype', title: '原型工程', short: '可玩底座', owner: 'AI 研发', icon: Code2 },
  { id: 'selfTest', title: 'AI 自测', short: '规则/风险', owner: 'AI 测试', icon: TestTube2 },
  { id: 'creative', title: '创意发散', short: '多条方向', owner: 'AI 编导', icon: WandSparkles },
  { id: 'playable', title: '单条可玩', short: '逐条制作', owner: 'AI 研发', icon: MonitorPlay },
  { id: 'editor', title: '编辑确认', short: '预览/调参', owner: 'Human + AI', icon: SlidersHorizontal },
  { id: 'export', title: 'HTML 导出', short: 'QA/交付', owner: 'Exporter', icon: FileDown },
];

const seedProjects: Project[] = [
  {
    id: 'screw-match-demo',
    name: '螺丝三消试玩',
    gameplay: '螺丝拆解 + 三消',
    source: '效果视频 + 美术参考',
    stage: 'creative',
    status: '等待选择创意',
    updated: '今天 21:48',
    brief: '基于螺丝拆解与三消反馈做一个 15 秒试玩，前 3 秒让用户理解“拧下螺丝并消除”的核心操作。',
    target: '先确认多条 playable 创意，再选择一条进入单条制作。',
    materials: [],
    outputs: {},
  },
  {
    id: 'wool-untangle-demo',
    name: '毛线解结试玩',
    gameplay: '路径解谜 + 消除反馈',
    source: '游戏需求 + 参考图',
    stage: 'previz',
    status: '视频预演待确认',
    updated: '今天 20:16',
    brief: '整理毛线解结玩法的操作路径、失败反馈和消除爽点，先做研发前视频预演。',
    target: '确认画面节奏和 UI overlay 后再进入原型工程。',
    materials: [],
    outputs: {},
  },
  {
    id: 'tile-stack-demo',
    name: '羊了个羊类叠牌',
    gameplay: '堆叠点击消除',
    source: '玩法说明',
    stage: 'prototype',
    status: 'AI 研发进行中',
    updated: '昨天 18:30',
    brief: '堆叠牌点击消除，突出找牌、卡点和差一步成功。',
    target: '生成可配置原型工程底座。',
    materials: [],
    outputs: {},
  },
];

const stageArtifacts: Record<StageId, Artifact> = {
  intake: {
    title: '项目接入包',
    meta: '把资料变成 AI 团队可读取的统一输入',
    items: ['游戏需求、效果图、效果视频和美术参考统一归档', '自动提取玩法关键词、素材类型和待确认问题', '生成 project-id 与当前任务入口'],
  },
  plan: {
    title: '原型需求与美术方案',
    meta: 'AI 策划和 AI 美术先把游戏做清楚',
    items: ['核心规则、胜负条件、玩家操作和关卡流程', '视觉风格、资源拆分、UI/特效/动画需求', '可配置参数、研发验收和测试验收标准'],
  },
  previz: {
    title: '研发前视频预演',
    meta: '先看画面和节奏，再决定是否开工',
    items: ['分镜脚本与每镜头视频 prompt', 'UI overlay 配置：文字、进度条、手势、CTA', 'AI 评审报告：是否表达核心玩法'],
  },
  prototype: {
    title: '可改造成 playable 的原型工程底座',
    meta: '不做一次性 demo，做可配置工程',
    items: ['核心玩法可运行、可试玩', 'gameConfig / levelConfig / uiConfig / guideConfig', '为后续编辑面板暴露可编辑字段'],
  },
  selfTest: {
    title: 'AI 测试自测',
    meta: '先由 AI 自查，再交给你试玩',
    items: ['规则正确性、操作手感、关卡可完成性', '移动端适配、性能、加载和资源风险', '修复建议和是否建议人工试玩'],
  },
  creative: {
    title: 'Playable 创意发散',
    meta: '从一个原型发散多条可投放方向',
    items: ['前 3 秒钩子、第一步操作、爽点和卡点', 'CTA 时机、画面表现和文案方案', '每条创意声明可编辑字段和制作风险'],
  },
  playable: {
    title: '单条 playable 制作',
    meta: '先做你选中的一条，确认 OK 再开放编辑',
    items: ['可运行 playable 版本', '创意实现说明和自测结果', '可编辑字段初稿'],
  },
  editor: {
    title: '预览与编辑面板',
    meta: '只编辑已声明字段，不直接改工程代码',
    items: ['实时手机预览', '文案、进度、位置、关卡、引导和 CTA 调整', '多版本保存和对比'],
  },
  export: {
    title: 'HTML playable 导出',
    meta: '自动 QA 后输出交付包',
    items: ['index.html、资源、配置、埋点和版本信息', '包体、首屏、CTA、横竖屏和控制台检查', 'HTML zip、录屏视频和 QA 报告'],
  },
};

const aiTeam = [
  { role: 'AI 策划', task: '玩法规则、关卡流程、验收标准', status: 'Ready', icon: Brain },
  { role: 'AI 美术', task: '视觉风格、资源拆分、特效需求', status: 'Ready', icon: Palette },
  { role: 'AI 编导', task: '视频预演、多条创意、节奏脚本', status: 'Ready', icon: Film },
  { role: 'AI 研发', task: '原型工程、单条 playable、编辑字段', status: 'Queued', icon: Code2 },
  { role: 'AI 测试', task: '自测报告、风险清单、导出 QA', status: 'Ready', icon: FlaskConical },
];

const creativeCards = [
  {
    name: '差一步成功版',
    hook: '开局展示几乎完成的局面，诱导玩家补最后一步',
    editable: ['开局文案', '目标进度', '失败触发时间', 'CTA 文案'],
    risk: '低',
  },
  {
    name: '高压倒计时版',
    hook: '进度条和倒计时压迫，强化紧张感',
    editable: ['倒计时秒数', '进度条位置', '提示强度', '音效开关'],
    risk: '中',
  },
  {
    name: '强爽感连击版',
    hook: '前 5 秒连续触发反馈，突出解压和奖励',
    editable: ['连击阈值', '粒子强度', '镜头震动', '奖励文案'],
    risk: '中',
  },
];

const modelOptions = [
  'gpt-5.4',
  'claude-sonnet-4-6',
  'deepseek-v4-pro',
  'gemini-3.1-flash-image-preview',
  'kling-3.0-omni-1080p-ref-audio',
  'internal-playable-agent',
];

const stageOrder = stages.map((stage) => stage.id);
const storageKeys = {
  projects: 'playable-ai-studio.projects.v1',
  settings: 'playable-ai-studio.settings.v1',
  editor: 'playable-ai-studio.editor.v1',
  logs: 'playable-ai-studio.logs.v1',
};

const defaultSettings: ModelSettings = {
  baseUrl: 'https://api.example.com/v1',
  apiKey: '',
  models: {
    planner: 'gpt-5.4',
    art: 'gemini-3.1-flash-image-preview',
    video: 'kling-3.0-omni-1080p-ref-audio',
    developer: 'claude-sonnet-4-6',
    tester: 'gpt-5.4',
    director: 'gpt-5.4',
    playable: 'claude-sonnet-4-6',
    qa: 'deepseek-v4-pro',
  },
};

const materialLabels: Record<MaterialKind, string> = {
  requirement: '游戏需求',
  effectImage: '效果图',
  effectVideo: '效果视频',
  artReference: '美术参考',
  artDoc: '美术需求',
};

function getStageStatus(projectStage: StageId, stageId: StageId): StageStatus {
  const current = stageOrder.indexOf(projectStage);
  const target = stageOrder.indexOf(stageId);
  if (target < current) return 'done';
  if (target === current) return 'active';
  return 'waiting';
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function projectIdFromName(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `project-${Date.now()}`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function nowLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function nextStageAfterRun(stage: StageId) {
  if (stage === 'creative') return 'creative';
  return stageOrder[Math.min(stageOrder.indexOf(stage) + 1, stageOrder.length - 1)];
}

function statusAfterRun(stage: StageId, nextStage: StageId) {
  if (stage === 'creative') return '等待选择创意';
  if (stage === 'selfTest') return '等待人工试玩确认';
  if (stage === 'playable') return '等待人工试玩确认单条 playable';
  if (stage === 'editor') return '等待导出 HTML';
  if (stage === 'export') return '已完成 HTML 导出检查';
  return `${stages.find((item) => item.id === nextStage)?.title ?? '下一阶段'}待处理`;
}

function buildStageOutput(stage: StageId, project: Project): StageOutput {
  const materialSummary =
    project.materials.length > 0
      ? project.materials.map((item) => `${materialLabels[item.kind]}:${item.name}`).join('；')
      : '尚未上传素材，基于文字需求生成占位产物。';
  const brief = project.brief.trim() || '未填写详细需求。';
  const target = project.target.trim() || '未填写本轮目标。';
  const createdAt = new Date().toISOString();

  const outputs: Record<StageId, StageOutput> = {
    intake: {
      title: '项目接入摘要',
      createdAt,
      summary: `已整理 ${project.name} 的接入信息，玩法类型为「${project.gameplay}」。`,
      bullets: [`资料：${materialSummary}`, `需求：${brief.slice(0, 88)}`, `目标：${target.slice(0, 88)}`],
    },
    plan: {
      title: '游戏原型需求与美术方向草案',
      createdAt,
      summary: '已将输入资料拆成 AI 策划、AI 美术、AI 研发和 AI 测试可执行的方案入口。',
      bullets: ['提炼核心规则、胜负条件和用户第一步操作。', '建立资源拆分、UI、特效和动画需求清单。', '列出可配置参数和验收标准。'],
    },
    previz: {
      title: '研发前视频预演包',
      createdAt,
      summary: '已准备分镜、视频 prompt 和 UI overlay 配置，用于研发前确认画面节奏。',
      bullets: ['拆成 5 个短镜头，降低视频模型失控风险。', '文字、按钮、进度条和 CTA 走程序叠加。', '生成 AI 评审项：玩法表达、风格一致、首 3 秒吸引点。'],
    },
    prototype: {
      title: '原型工程底座任务',
      createdAt,
      summary: '已生成 AI 研发任务说明，目标是可运行且可继续改造成 playable 的工程底座。',
      bullets: ['拆出 gameConfig、levelConfig、uiConfig 和 guideConfig。', '要求核心玩法可试玩，关键参数不写死。', '预留编辑器读取可编辑字段。'],
    },
    selfTest: {
      title: 'AI 自测清单',
      createdAt,
      summary: '已生成自测维度，交给人工试玩前先检查规则、手感、资源和风险。',
      bullets: ['核心规则、关卡完成性和首屏可交互。', '移动端适配、性能和加载风险。', '后续 playable 改造风险与修复建议。'],
    },
    creative: {
      title: 'Playable 创意发散包',
      createdAt,
      summary: '已生成多条创意候选，每条声明广告节奏、可编辑字段和制作风险。',
      bullets: creativeCards.map((card) => `${card.name}：${card.hook}`),
    },
    playable: {
      title: '单条 Playable 制作任务',
      createdAt,
      summary: `已选择「${project.selectedCreative ?? '未选择创意'}」，准备进入单条 playable 制作。`,
      bullets: ['生成可运行 playable。', '整理创意实现说明和自测报告。', '形成可编辑字段初稿。'],
    },
    editor: {
      title: '编辑字段配置',
      createdAt,
      summary: '已根据当前 playable 声明编辑字段，允许在预览旁边安全调参。',
      bullets: ['开局文案、进度值、CTA 时间和 UI 位置已可编辑。', '后续接入资源替换、关卡参数、引导步骤和版本保存。', '编辑器不直接暴露工程代码。'],
    },
    export: {
      title: 'HTML 导出检查',
      createdAt,
      summary: '已准备导出当前 playable 的 HTML 文件，并记录 QA 检查目标。',
      bullets: ['生成单文件 HTML。', '后续加入 zip、资源完整性、包体和控制台错误检查。', '导出结果可作为投放包基础。'],
    },
  };

  return outputs[stage];
}

function buildExportHtml(
  project: Project,
  editorState: { headline: string; progress: number; ctaTime: number; overlayPosition: 'top' | 'bottom' },
) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name}</title>
  <style>
    body{margin:0;background:#101816;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}
    .phone{width:min(390px,100vw);aspect-ratio:9/16;background:#dfe8e5;border:12px solid #17211f;border-radius:32px;position:relative;overflow:hidden}
    .overlay{position:absolute;left:20px;right:20px;${editorState.overlayPosition === 'top' ? 'top:24px' : 'bottom:104px'};background:#26342f;color:#fff;border-radius:10px;padding:14px;font-weight:700}
    .overlay span{display:block;font-size:12px;color:#bcd0ca;margin-top:5px}
    .board{position:absolute;left:30px;right:30px;top:160px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .tile{height:92px;border-radius:16px;border:3px solid rgba(255,255,255,.7)}
    .a{background:#e2a33a}.b{background:#42b7a6}.c{background:#d47479}.d{background:#7878ce}
    .bar{position:absolute;left:30px;right:30px;bottom:82px;height:12px;background:rgba(23,33,31,.2);border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;width:${editorState.progress}%;background:#1a9b8f}
    button{position:absolute;left:56px;right:56px;bottom:28px;height:46px;border:0;border-radius:99px;background:#17211f;color:#fff;font-size:18px;font-weight:700}
  </style>
</head>
<body>
  <main class="phone">
    <div class="overlay">${editorState.headline}<span>CTA at ${editorState.ctaTime}s</span></div>
    <section class="board"><div class="tile a"></div><div class="tile b"></div><div class="tile c"></div><div class="tile d"></div></section>
    <div class="bar"><i></i></div>
    <button onclick="console.log('cta_click')">Play Now</button>
  </main>
</body>
</html>`;
}

function App() {
  const [projects, setProjects] = useState<Project[]>(() => readStorage(storageKeys.projects, seedProjects));
  const [selectedProjectId, setSelectedProjectId] = useState(() => readStorage('playable-ai-studio.selectedProject.v1', seedProjects[0].id));
  const [activeStage, setActiveStage] = useState<StageId>('creative');
  const [settings, setSettings] = useState<ModelSettings>(() => readStorage(storageKeys.settings, defaultSettings));
  const [testState, setTestState] = useState<ModelTestState>('idle');
  const [testResult, setTestResult] = useState<ModelTestResult>({ status: 'idle', message: '尚未测试模型连接。' });
  const [stageRunState, setStageRunState] = useState<StageRunState>('idle');
  const [stageRunError, setStageRunError] = useState('');
  const [handoffSaveState, setHandoffSaveState] = useState<HandoffSaveState>('idle');
  const [editorState, setEditorState] = useState(() =>
    readStorage(storageKeys.editor, {
      headline: 'Only 1% can solve this',
      progress: 68,
      ctaTime: 13,
      overlayPosition: 'top' as 'top' | 'bottom',
    }),
  );
  const [log, setLog] = useState<string[]>(() => readStorage(storageKeys.logs, [
    '21:55  AI 窗口恢复项目上下文：读取 README、project-index、handoff。',
    '21:58  编导生成 3 条创意卡片，并声明可编辑字段。',
    '22:03  等待人工选择单条创意进入 playable 制作。',
  ]));

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const artifact = stageArtifacts[activeStage];
  const activeOutput = selectedProject.outputs[activeStage];

  const completedCount = useMemo(
    () => stageOrder.filter((stage) => getStageStatus(selectedProject.stage, stage) === 'done').length,
    [selectedProject.stage],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKeys.projects, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.editor, JSON.stringify(editorState));
  }, [editorState]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.logs, JSON.stringify(log));
  }, [log]);

  useEffect(() => {
    window.localStorage.setItem('playable-ai-studio.selectedProject.v1', JSON.stringify(selectedProjectId));
  }, [selectedProjectId]);

  useEffect(() => {
    const project = projects.find((item) => item.id === selectedProjectId);
    if (project) {
      setActiveStage(project.stage);
    }
  }, [selectedProjectId]);

  function appendLog(message: string) {
    setLog((items) => [`${nowLabel()}  ${message}`, ...items].slice(0, 12));
  }

  function addProject() {
    const nextName = `新玩法项目 ${projects.length + 1}`;
    const newProject: Project = {
      id: projectIdFromName(nextName),
      name: nextName,
      gameplay: '待识别玩法',
      source: '需求 / 效果图 / 视频',
      stage: 'intake',
      status: '等待资料接入',
      updated: '刚刚',
      brief: '',
      target: '生成可改造成 playable 的原型游戏工程底座。',
      materials: [],
      outputs: {},
    };
    setProjects([newProject, ...projects]);
    setSelectedProjectId(newProject.id);
    setActiveStage('intake');
    appendLog(`创建新项目接入入口：${newProject.id}`);
  }

  async function runStage() {
    if (stageRunState === 'running') return;

    setStageRunState('running');
    setStageRunError('');
    const stageToRun = activeStage;
    const nextStage = nextStageAfterRun(stageToRun);
    const nextStatus = statusAfterRun(stageToRun, nextStage);

    try {
      const response = await fetch('/api/run-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          stage: stageToRun,
          project: selectedProject,
        }),
      });
      const payload = (await response.json()) as StageApiResponse;
      if (!response.ok || !payload.ok || !payload.output) {
        throw new Error(payload.message || `${response.status} ${response.statusText}`);
      }

      setProjects((items) =>
        items.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                stage: nextStage,
                status: nextStatus,
                updated: '刚刚',
                outputs: {
                  ...project.outputs,
                  [stageToRun]: payload.output,
                },
              }
            : project,
        ),
      );
      setActiveStage(nextStage);
      setStageRunState('idle');
      appendLog(
        nextStage === stageToRun
          ? `执行 ${artifact.title}，生成《${payload.output.title}》，等待人工确认（${payload.source === 'provider' ? '模型' : '本地 fallback'}）。`
          : `执行 ${artifact.title}，生成《${payload.output.title}》并推进到下一阶段（${payload.source === 'provider' ? '模型' : '本地 fallback'}）。`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      const output = buildStageOutput(stageToRun, selectedProject);
      setProjects((items) =>
        items.map((project) =>
          project.id === selectedProject.id
            ? {
                ...project,
                stage: nextStage,
                status: nextStatus,
                updated: '刚刚',
                outputs: {
                  ...project.outputs,
                  [stageToRun]: output,
                },
              }
            : project,
        ),
      );
      setActiveStage(nextStage);
      setStageRunState('failed');
      setStageRunError(`AI 代理调用失败，已使用前端 fallback 继续流程：${message}`);
      appendLog(`阶段代理失败，使用前端 fallback 生成《${output.title}》${nextStage === stageToRun ? '，等待人工确认' : '并推进到下一阶段'}：${message}`);
    }
  }

  async function testModels() {
    setTestState('testing');
    setTestResult({ status: 'testing', message: '正在通过本地代理测试策划模型。' });
    try {
      const response = await fetch('/api/model-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
        }),
      });
      const payload = (await response.json()) as ModelTestApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || `${response.status} ${response.statusText}`);
      }
      setTestState('passed');
      setTestResult({
        status: 'passed',
        latencyMs: payload.latencyMs,
        message: `连接正常：${payload.model ?? settings.models.planner}${payload.message ? `，返回 ${payload.message}` : ''}。`,
      });
      appendLog(`模型连接测试通过：${payload.model ?? settings.models.planner}，${payload.latencyMs ?? 0}ms。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setTestState('failed');
      setTestResult({
        status: 'failed',
        message: `连接失败：${message}`,
      });
      appendLog(`模型测试失败：${message}`);
    }
  }

  function updateModel(key: ModelKey, value: string) {
    setSettings((current) => ({
      ...current,
      models: {
        ...current.models,
        [key]: value,
      },
    }));
  }

  function updateSelectedProject(patch: Partial<Project>) {
    setProjects((items) =>
      items.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              ...patch,
              updated: '刚刚',
            }
          : project,
      ),
    );
  }

  async function handleMaterialUpload(kind: MaterialKind, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const isText = file.type.startsWith('text/') || /\.(md|txt|json)$/i.test(file.name);
        const textPreview = isText ? (await file.text()).slice(0, 400) : undefined;
        return {
          id: `${kind}-${file.name}-${file.lastModified}`,
          kind,
          name: file.name,
          type: file.type || 'unknown',
          size: file.size,
          textPreview,
        };
      }),
    );
    updateSelectedProject({
      source: Array.from(new Set([...selectedProject.materials.map((item) => materialLabels[item.kind]), materialLabels[kind]])).join(' + '),
      materials: [...selectedProject.materials, ...uploaded],
    });
    appendLog(`接入 ${materialLabels[kind]}：${uploaded.map((file) => file.name).join('、')}`);
    event.currentTarget.value = '';
  }

  function chooseCreative(name: string) {
    setProjects((items) =>
      items.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              selectedCreative: name,
              stage: 'playable',
              status: '已选择创意，等待单条 playable 制作',
              updated: '刚刚',
            }
          : project,
      ),
    );
    setActiveStage('playable');
    appendLog(`选择创意《${name}》，进入单条 playable 制作。`);
  }

  async function saveHandoff() {
    if (handoffSaveState === 'saving') return;

    setHandoffSaveState('saving');
    try {
      const response = await fetch('/api/save-handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: selectedProject,
          activeStage,
          editorState,
          logs: log,
        }),
      });
      const payload = (await response.json()) as HandoffApiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || `${response.status} ${response.statusText}`);
      }

      setHandoffSaveState('saved');
      appendLog(`交接已写入 workspace：${payload.projectPath ?? `projects/${payload.projectId}`}，${payload.files?.length ?? 0} 个文件。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setHandoffSaveState('failed');
      appendLog(`交接保存失败：${message}`);
    }
  }

  function exportPlayableHtml() {
    const html = buildExportHtml(selectedProject, editorState);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedProject.id || 'playable'}-index.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActiveStage('export');
    appendLog(`导出 HTML：${selectedProject.id}-index.html。`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>Playable AI Studio</strong>
            <span>AI 可玩生产平台</span>
          </div>
        </div>

        <button className="new-project" type="button" onClick={addProject}>
          <Plus size={16} />
          新项目接入
        </button>

        <div className="search-box">
          <Search size={15} />
          <span>搜索项目 / 阶段</span>
        </div>

        <nav className="project-list" aria-label="项目列表">
          {projects.map((project) => (
            <button
              className={`project-row ${project.id === selectedProject.id ? 'selected' : ''}`}
              key={project.id}
              type="button"
              onClick={() => {
                setSelectedProjectId(project.id);
                setActiveStage(project.stage);
              }}
            >
              <span className="project-name">{project.name}</span>
              <span className="project-meta">{project.gameplay}</span>
              <span className="project-status">{project.status}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <RadioTower size={15} />
          <span>GitHub handoff active</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{selectedProject.name}</h1>
            <p>
              {selectedProject.gameplay} · {selectedProject.source} · {selectedProject.updated}
            </p>
          </div>
          <div className="topbar-actions">
            <button className={`ghost-button ${handoffSaveState}`} type="button" onClick={saveHandoff} disabled={handoffSaveState === 'saving'}>
              <Save size={16} />
              {handoffSaveState === 'saving' ? '保存中...' : '保存交接'}
            </button>
            <button className="primary-button" type="button" onClick={runStage} disabled={stageRunState === 'running'}>
              <Play size={16} />
              {stageRunState === 'running' ? '执行中...' : '执行当前阶段'}
            </button>
          </div>
        </header>

        <section className="pipeline" aria-label="生产流水线">
          {stages.map((stage, index) => {
            const status = getStageStatus(selectedProject.stage, stage.id);
            const StageIcon = stage.icon;
            return (
              <button
                className={`stage-node ${status} ${activeStage === stage.id ? 'focused' : ''}`}
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
              >
                <span className="stage-index">{index + 1}</span>
                <span className="stage-icon">
                  <StageIcon size={17} />
                </span>
                <span className="stage-copy">
                  <strong>{stage.title}</strong>
                  <em>{stage.short}</em>
                </span>
              </button>
            );
          })}
        </section>

        <div className="main-grid">
          <section className="panel stage-panel">
            <div className="panel-heading">
              <div>
                <span className="label">当前阶段</span>
                <h2>{artifact.title}</h2>
                <p>{artifact.meta}</p>
              </div>
              <div className="stage-progress">
                <Gauge size={18} />
                <strong>{completedCount}/9</strong>
              </div>
            </div>

            <div className="artifact-list">
              {artifact.items.map((item) => (
                <div className="artifact-row" key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="output-box">
              <div>
                <span className="label">阶段产物</span>
                <h3>{activeOutput?.title ?? '等待生成'}</h3>
                <p>{activeOutput?.summary ?? '点击“执行当前阶段”后，这里会生成当前阶段的结构化产物摘要。'}</p>
              </div>
              {activeOutput && (
                <ul>
                  {activeOutput.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            {stageRunError && <div className="stage-error">{stageRunError}</div>}

            <div className="intake-grid">
              <label className="input-block">
                <span>游戏需求</span>
                <strong>上传文档 / 粘贴描述</strong>
                <input type="file" accept=".md,.txt,.json,.pdf,.doc,.docx" onChange={(event) => handleMaterialUpload('requirement', event)} />
              </label>
              <label className="input-block">
                <span>效果图</span>
                <strong>视觉目标 / 最终画面</strong>
                <input type="file" accept="image/*" multiple onChange={(event) => handleMaterialUpload('effectImage', event)} />
              </label>
              <label className="input-block">
                <span>效果视频</span>
                <strong>玩法节奏 / 动态反馈</strong>
                <input type="file" accept="video/*" multiple onChange={(event) => handleMaterialUpload('effectVideo', event)} />
              </label>
              <label className="input-block">
                <span>美术参考</span>
                <strong>风格 / UI / 角色道具</strong>
                <input type="file" accept="image/*,.md,.txt,.pdf" multiple onChange={(event) => handleMaterialUpload('artReference', event)} />
              </label>
            </div>

            <div className="intake-form">
              <label className="field">
                <span>项目名称</span>
                <input value={selectedProject.name} onChange={(event) => updateSelectedProject({ name: event.target.value })} />
              </label>
              <label className="field">
                <span>玩法类型</span>
                <input value={selectedProject.gameplay} onChange={(event) => updateSelectedProject({ gameplay: event.target.value })} />
              </label>
              <label className="field full">
                <span>游戏需求描述</span>
                <textarea
                  value={selectedProject.brief}
                  placeholder="粘贴游戏需求、原游戏规则、效果视频说明或你希望 AI 团队理解的信息。"
                  onChange={(event) => updateSelectedProject({ brief: event.target.value })}
                />
              </label>
              <label className="field full">
                <span>本轮目标</span>
                <textarea
                  value={selectedProject.target}
                  placeholder="例如：先生成研发前视频预演；或先做可改造成 playable 的原型工程底座。"
                  onChange={(event) => updateSelectedProject({ target: event.target.value })}
                />
              </label>
            </div>

            <div className="material-list">
              {selectedProject.materials.length === 0 ? (
                <span>尚未接入资料。</span>
              ) : (
                selectedProject.materials.map((file) => (
                  <div className="material-chip" key={file.id}>
                    <Box size={14} />
                    <strong>{materialLabels[file.kind]}</strong>
                    <span>{file.name}</span>
                    <em>{formatFileSize(file.size)}</em>
                  </div>
                ))
              )}
            </div>

            <div className="ai-team">
              {aiTeam.map((agent) => {
                const AgentIcon = agent.icon;
                return (
                  <div className="agent-row" key={agent.role}>
                    <div className="agent-icon">
                      <AgentIcon size={18} />
                    </div>
                    <div>
                      <strong>{agent.role}</strong>
                      <span>{agent.task}</span>
                    </div>
                    <em>{agent.status}</em>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel previz-panel">
            <div className="panel-heading compact">
              <div>
                <span className="label">实时预览</span>
                <h2>Playable Preview</h2>
              </div>
              <button className="icon-button" type="button" aria-label="播放预览">
                <Play size={16} />
              </button>
            </div>

            <div className="phone-preview">
              <div className="phone-screen">
                <div className={`preview-overlay ${editorState.overlayPosition}`}>
                  <strong>{editorState.headline}</strong>
                  <span>CTA at {editorState.ctaTime}s</span>
                </div>
                <div className="game-board">
                  <div className="tile screw" />
                  <div className="tile amber" />
                  <div className="tile teal" />
                  <div className="tile rose" />
                  <div className="tile bolt" />
                  <div className="tile violet" />
                </div>
                <div className="gesture-path">
                  <span />
                  <ArrowRight size={22} />
                </div>
                <div className="progress-shell">
                  <div className="progress-fill" style={{ width: `${editorState.progress}%` }} />
                </div>
                <button className="cta-preview" type="button">Play Now</button>
              </div>
            </div>
          </section>
        </div>

        <div className="lower-grid">
          <section className="panel creative-panel">
            <div className="panel-heading compact">
              <div>
                <span className="label">AI 编导</span>
                <h2>创意候选</h2>
              </div>
              <span className="count-chip">3 条</span>
            </div>
            <div className="creative-list">
              {creativeCards.map((card) => (
                <article className="creative-card" key={card.name}>
                  <div>
                    <h3>{card.name}</h3>
                    <p>{card.hook}</p>
                  </div>
                  <div className="editable-tags">
                    {card.editable.map((field) => (
                      <span key={field}>{field}</span>
                    ))}
                  </div>
                  <footer>
                    <span>制作风险：{card.risk}</span>
                    <button type="button" onClick={() => chooseCreative(card.name)}>选择制作</button>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <section className="panel log-panel">
            <div className="panel-heading compact">
              <div>
                <span className="label">续作交接</span>
                <h2>Handoff Log</h2>
              </div>
              <BadgeCheck size={19} />
            </div>
            <div className="log-list">
              {log.map((item) => (
                <div className="log-item" key={item}>
                  <span />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <aside className="inspector">
        <section className="panel settings-panel">
          <div className="panel-heading compact">
            <div>
              <span className="label">设置</span>
              <h2>模型与服务</h2>
            </div>
            <Settings size={18} />
          </div>

          <label className="field">
            <span>Base URL</span>
            <input
              value={settings.baseUrl}
              onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })}
            />
          </label>
          <label className="field">
            <span>API Key</span>
            <input
              value={settings.apiKey}
              type="password"
              placeholder="输入 API Key 后可测试"
              onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
            />
          </label>

          <div className="model-grid">
            {Object.entries(settings.models).map(([key, value]) => (
              <label className="field" key={key}>
                <span>{modelLabel(key as ModelKey)}</span>
                <select value={value} onChange={(event) => updateModel(key as ModelKey, event.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <button className={`test-button ${testState}`} type="button" onClick={testModels} disabled={testState === 'testing'}>
            {testState === 'testing' ? <RadioTower size={16} /> : <TestTube2 size={16} />}
            {testState === 'idle' && '测试模型'}
            {testState === 'testing' && '测试中...'}
            {testState === 'passed' && '连接正常'}
            {testState === 'failed' && '测试失败'}
          </button>
          <div className={`test-result ${testResult.status}`}>
            <span>{testResult.message}</span>
            {testResult.latencyMs && <em>{testResult.latencyMs}ms</em>}
          </div>
        </section>

        <section className="panel editor-panel">
          <div className="panel-heading compact">
            <div>
              <span className="label">编辑面板</span>
              <h2>可编辑字段</h2>
            </div>
            <LayoutPanelLeft size={18} />
          </div>

          <label className="field">
            <span>开局文案</span>
            <input
              value={editorState.headline}
              onChange={(event) => setEditorState({ ...editorState, headline: event.target.value })}
            />
          </label>

          <label className="slider-field">
            <span>进度值 {editorState.progress}%</span>
            <input
              min="0"
              max="100"
              type="range"
              value={editorState.progress}
              onChange={(event) => setEditorState({ ...editorState, progress: Number(event.target.value) })}
            />
          </label>

          <label className="slider-field">
            <span>CTA 出现 {editorState.ctaTime}s</span>
            <input
              min="6"
              max="20"
              type="range"
              value={editorState.ctaTime}
              onChange={(event) => setEditorState({ ...editorState, ctaTime: Number(event.target.value) })}
            />
          </label>

          <div className="segmented">
            <button
              className={editorState.overlayPosition === 'top' ? 'selected' : ''}
              type="button"
              onClick={() => setEditorState({ ...editorState, overlayPosition: 'top' })}
            >
              顶部
            </button>
            <button
              className={editorState.overlayPosition === 'bottom' ? 'selected' : ''}
              type="button"
              onClick={() => setEditorState({ ...editorState, overlayPosition: 'bottom' })}
            >
              底部
            </button>
          </div>

          <button className="export-button" type="button" onClick={exportPlayableHtml}>
            <FileDown size={16} />
            导出 HTML 包
          </button>
        </section>
      </aside>
    </div>
  );
}

function modelLabel(key: ModelKey) {
  const labels: Record<ModelKey, string> = {
    planner: '策划模型',
    art: '美术模型',
    video: '视频模型',
    developer: '研发模型',
    tester: '测试模型',
    director: '编导模型',
    playable: '可玩制作',
    qa: 'QA 模型',
  };
  return labels[key];
}

export default App;
