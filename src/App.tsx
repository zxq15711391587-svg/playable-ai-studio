import { useMemo, useState } from 'react';
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

type Project = {
  id: string;
  name: string;
  gameplay: string;
  source: string;
  stage: StageId;
  status: string;
  updated: string;
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
  },
  {
    id: 'wool-untangle-demo',
    name: '毛线解结试玩',
    gameplay: '路径解谜 + 消除反馈',
    source: '游戏需求 + 参考图',
    stage: 'previz',
    status: '视频预演待确认',
    updated: '今天 20:16',
  },
  {
    id: 'tile-stack-demo',
    name: '羊了个羊类叠牌',
    gameplay: '堆叠点击消除',
    source: '玩法说明',
    stage: 'prototype',
    status: 'AI 研发进行中',
    updated: '昨天 18:30',
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

function getStageStatus(projectStage: StageId, stageId: StageId): StageStatus {
  const current = stageOrder.indexOf(projectStage);
  const target = stageOrder.indexOf(stageId);
  if (target < current) return 'done';
  if (target === current) return 'active';
  return 'waiting';
}

function App() {
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(seedProjects[0].id);
  const [activeStage, setActiveStage] = useState<StageId>('creative');
  const [settings, setSettings] = useState<ModelSettings>({
    baseUrl: 'https://api.example.com/v1',
    apiKey: '••••••••••••••••',
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
  });
  const [testState, setTestState] = useState<'idle' | 'testing' | 'passed'>('idle');
  const [headline, setHeadline] = useState('Only 1% can solve this');
  const [progress, setProgress] = useState(68);
  const [ctaTime, setCtaTime] = useState(13);
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'bottom'>('top');
  const [log, setLog] = useState([
    '21:55  AI 窗口恢复项目上下文：读取 README、project-index、handoff。',
    '21:58  编导生成 3 条创意卡片，并声明可编辑字段。',
    '22:03  等待人工选择单条创意进入 playable 制作。',
  ]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const artifact = stageArtifacts[activeStage];

  const completedCount = useMemo(
    () => stageOrder.filter((stage) => getStageStatus(selectedProject.stage, stage) === 'done').length,
    [selectedProject.stage],
  );

  function addProject() {
    const newProject: Project = {
      id: `project-${projects.length + 1}`,
      name: '新玩法项目',
      gameplay: '待识别玩法',
      source: '需求 / 效果图 / 视频',
      stage: 'intake',
      status: '等待资料接入',
      updated: '刚刚',
    };
    setProjects([newProject, ...projects]);
    setSelectedProjectId(newProject.id);
    setActiveStage('intake');
    setLog((items) => [`现在  创建新项目接入入口：${newProject.id}`, ...items]);
  }

  function runStage() {
    const nextIndex = Math.min(stageOrder.indexOf(activeStage) + 1, stageOrder.length - 1);
    const nextStage = stageOrder[nextIndex];
    setProjects((items) =>
      items.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              stage: nextStage,
              status: `${stages.find((stage) => stage.id === nextStage)?.title ?? '下一阶段'}待处理`,
              updated: '刚刚',
            }
          : project,
      ),
    );
    setActiveStage(nextStage);
    setLog((items) => [`现在  执行 ${artifact.title}，生成阶段产物并推进到下一阶段。`, ...items]);
  }

  function testModels() {
    setTestState('testing');
    window.setTimeout(() => {
      setTestState('passed');
      setLog((items) => [`现在  模型连接测试通过：8 个阶段模型可用，平均响应 842ms。`, ...items]);
    }, 700);
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
            <button className="ghost-button" type="button">
              <Save size={16} />
              保存交接
            </button>
            <button className="primary-button" type="button" onClick={runStage}>
              <Play size={16} />
              执行当前阶段
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

            <div className="intake-grid">
              <div className="input-block">
                <span>游戏需求</span>
                <strong>上传文档 / 粘贴描述</strong>
              </div>
              <div className="input-block">
                <span>效果图</span>
                <strong>视觉目标 / 最终画面</strong>
              </div>
              <div className="input-block">
                <span>效果视频</span>
                <strong>玩法节奏 / 动态反馈</strong>
              </div>
              <div className="input-block">
                <span>美术参考</span>
                <strong>风格 / UI / 角色道具</strong>
              </div>
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
                <div className={`preview-overlay ${overlayPosition}`}>
                  <strong>{headline}</strong>
                  <span>CTA at {ctaTime}s</span>
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
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
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
                    <button type="button">选择制作</button>
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

          <button className={`test-button ${testState}`} type="button" onClick={testModels}>
            {testState === 'testing' ? <RadioTower size={16} /> : <TestTube2 size={16} />}
            {testState === 'idle' && '测试模型'}
            {testState === 'testing' && '测试中...'}
            {testState === 'passed' && '连接正常 · 842ms'}
          </button>
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
            <input value={headline} onChange={(event) => setHeadline(event.target.value)} />
          </label>

          <label className="slider-field">
            <span>进度值 {progress}%</span>
            <input
              min="0"
              max="100"
              type="range"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
          </label>

          <label className="slider-field">
            <span>CTA 出现 {ctaTime}s</span>
            <input
              min="6"
              max="20"
              type="range"
              value={ctaTime}
              onChange={(event) => setCtaTime(Number(event.target.value))}
            />
          </label>

          <div className="segmented">
            <button
              className={overlayPosition === 'top' ? 'selected' : ''}
              type="button"
              onClick={() => setOverlayPosition('top')}
            >
              顶部
            </button>
            <button
              className={overlayPosition === 'bottom' ? 'selected' : ''}
              type="button"
              onClick={() => setOverlayPosition('bottom')}
            >
              底部
            </button>
          </div>

          <button className="export-button" type="button" onClick={() => setActiveStage('export')}>
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

