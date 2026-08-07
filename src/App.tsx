import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Code2,
  Download,
  Eye,
  FileImage,
  Flame,
  FlaskConical,
  HelpCircle,
  KeyRound,
  Layers3,
  Link2,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  XCircle
} from "lucide-react";
import type { CompareError, CompareReport, Issue, Severity } from "./types";

type DesignMode = "figma" | "image";
type ViewerMode = "side" | "overlay" | "diff";
type IssueFilter = "all" | Severity;

interface CredentialCache {
  figmaToken: string;
  openaiKey: string;
  openaiApiUrl: string;
  openaiModel: string;
  useAi: boolean;
  aiModels: string[];
  modelsSourceUrl: string;
}

const CREDENTIAL_CACHE_KEY = "difflab.credentials.v1";
const emptyCredentialCache: CredentialCache = {
  figmaToken: "",
  openaiKey: "",
  openaiApiUrl: "",
  openaiModel: "",
  useAi: false,
  aiModels: [],
  modelsSourceUrl: ""
};

function readCredentialCache(): CredentialCache {
  try {
    const raw = window.localStorage.getItem(CREDENTIAL_CACHE_KEY);
    if (!raw) return emptyCredentialCache;
    const value = JSON.parse(raw) as Partial<CredentialCache>;
    return {
      figmaToken: typeof value.figmaToken === "string" ? value.figmaToken : "",
      openaiKey: typeof value.openaiKey === "string" ? value.openaiKey : "",
      openaiApiUrl: typeof value.openaiApiUrl === "string" ? value.openaiApiUrl : "",
      openaiModel: typeof value.openaiModel === "string" ? value.openaiModel : "",
      useAi: value.useAi === true,
      aiModels: Array.isArray(value.aiModels)
        ? value.aiModels.filter((model): model is string => typeof model === "string")
        : [],
      modelsSourceUrl: typeof value.modelsSourceUrl === "string" ? value.modelsSourceUrl : ""
    };
  } catch {
    return emptyCredentialCache;
  }
}

const steps = [
  { number: 1, label: "连接来源", hint: "设计稿与 H5" },
  { number: 2, label: "验收规则", hint: "阈值与门禁" },
  { number: 3, label: "比对报告", hint: "证据与建议" }
];

const severityMeta: Record<Severity, { label: string; icon: typeof XCircle }> = {
  error: { label: "错误", icon: XCircle },
  warning: { label: "警告", icon: AlertTriangle },
  pending: { label: "待确认", icon: HelpCircle },
  info: { label: "信息", icon: CheckCircle2 }
};

function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function StepRail({ step }: { step: number }) {
  return (
    <nav className="step-rail" aria-label="验收流程">
      {steps.map((item, index) => {
        const active = item.number === step;
        const complete = item.number < step;
        return (
          <div className={`step-item ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={item.number}>
            <span className="step-index">{complete ? <Check size={14} /> : item.number}</span>
            <span>
              <b>{item.label}</b>
              <small>{item.hint}</small>
            </span>
            {index < steps.length - 1 && <i />}
          </div>
        );
      })}
    </nav>
  );
}

function SourceStep(props: {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
  figmaUrl: string;
  setFigmaUrl: (value: string) => void;
  h5Url: string;
  setH5Url: (value: string) => void;
  designFile?: File;
  setDesignFile: (file?: File) => void;
  figmaToken: string;
  setFigmaToken: (value: string) => void;
  openaiKey: string;
  setOpenaiKey: (value: string) => void;
  openaiApiUrl: string;
  setOpenaiApiUrl: (value: string) => void;
  openaiModel: string;
  setOpenaiModel: (value: string) => void;
  aiModels: string[];
  setAiModels: (value: string[]) => void;
  modelsSourceUrl: string;
  setModelsSourceUrl: (value: string) => void;
  useAi: boolean;
  setUseAi: (value: boolean) => void;
  onClearCredentials: () => void;
  onContinue: () => void;
  onDemo: () => void;
  busy: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [modelMessage, setModelMessage] = useState<{ kind: "success" | "error"; text: string }>();
  const normalizedModel = props.openaiModel.trim().toLowerCase();
  const hasExactModel = props.aiModels.some((model) => model.toLowerCase() === normalizedModel);
  const filteredModels = normalizedModel && !hasExactModel
    ? props.aiModels.filter((model) => model.toLowerCase().includes(normalizedModel))
    : props.aiModels;
  const canContinue =
    Boolean(props.h5Url.trim()) &&
    (props.designMode === "figma" ? Boolean(props.figmaUrl.trim()) : Boolean(props.designFile));

  useEffect(() => {
    if (props.aiModels.length > 0 && props.openaiApiUrl.trim() !== props.modelsSourceUrl) {
      props.setAiModels([]);
      props.setModelsSourceUrl("");
      setModelPanelOpen(false);
      setModelMessage(undefined);
    }
  }, [props.openaiApiUrl]);

  const fetchModels = async () => {
    setFetchingModels(true);
    setModelMessage(undefined);
    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl: props.openaiApiUrl, apiKey: props.openaiKey })
      });
      const payload = (await response.json()) as { models?: string[]; defaultModel?: string; error?: string };
      if (!response.ok || !payload.models) throw new Error(payload.error || "无法获取模型列表。");
      props.setAiModels(payload.models);
      props.setModelsSourceUrl(props.openaiApiUrl.trim());
      if (!props.openaiModel && payload.defaultModel && payload.models.includes(payload.defaultModel)) {
        props.setOpenaiModel(payload.defaultModel);
      }
      setModelPanelOpen(true);
      setModelMessage({
        kind: "success",
        text: `已获取 ${payload.models.length} 个模型，请选择支持图像输入和 Responses API 的模型。`
      });
    } catch (caught) {
      props.setAiModels([]);
      props.setModelsSourceUrl("");
      setModelPanelOpen(false);
      setModelMessage({ kind: "error", text: caught instanceof Error ? caught.message : "无法获取模型列表。" });
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <section className="workspace setup-grid">
      <div className="intro-block">
        <span className="mono-label">Step 01 · Inputs</span>
        <h1>连接设计基准<br />与实际页面</h1>
        <p>一次只验收一个 Frame。截图视口自动跟随设计尺寸，凭据仅缓存在当前浏览器。</p>
        <button className="demo-button" onClick={props.onDemo} disabled={props.busy}>
          <FlaskConical size={17} />
          运行内置差异样本
          <ArrowRight size={16} />
        </button>
        <div className="prototype-note">
          <span>PROTOTYPE</span>
          内置样本包含已知的字号、位置、颜色、圆角和缺失元素差异。
        </div>
      </div>

      <div className="form-stack">
        <article className="form-card emphasis-card">
          <header className="card-heading">
            <span className="card-number">01</span>
            <div><h2>设计基准</h2><p>选择结构化 Figma 链接或图片基准。</p></div>
          </header>
          <div className="segmented" role="tablist" aria-label="设计稿来源">
            <button className={props.designMode === "figma" ? "selected" : ""} onClick={() => props.setDesignMode("figma")}>
              <Link2 size={15} /> Figma Frame
            </button>
            <button className={props.designMode === "image" ? "selected" : ""} onClick={() => props.setDesignMode("image")}>
              <FileImage size={15} /> 上传图片
            </button>
          </div>
          {props.designMode === "figma" ? (
            <label className="field">
              <span>Figma Frame 分享链接</span>
              <div className="input-shell"><Link2 size={17} /><input value={props.figmaUrl} onChange={(event) => props.setFigmaUrl(event.target.value)} placeholder="https://www.figma.com/design/...?...node-id=..." /></div>
              <small>链接必须包含具体 Frame 的 node-id。</small>
            </label>
          ) : (
            <div
              className={`upload-zone ${props.designFile ? "has-file" : ""}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                props.setDesignFile(event.dataTransfer.files[0]);
              }}
            >
              <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(event) => props.setDesignFile(event.target.files?.[0])} />
              <span className="upload-icon"><UploadCloud size={20} /></span>
              {props.designFile ? <><b>{props.designFile.name}</b><small>{(props.designFile.size / 1024 / 1024).toFixed(2)} MB · 点击替换</small></> : <><b>拖入 PNG / JPG / WebP</b><small>或点击选择，最大 25MB</small></>}
            </div>
          )}
        </article>

        <article className="form-card">
          <header className="card-heading">
            <span className="card-number">02</span>
            <div><h2>实际 H5</h2><p>页面无需登录，并能从本机网络直接访问。</p></div>
          </header>
          <label className="field">
            <span>线上地址</span>
            <div className="input-shell"><Eye size={17} /><input value={props.h5Url} onChange={(event) => props.setH5Url(event.target.value)} placeholder="https://example.com/page" /></div>
          </label>
        </article>

        <details className="credential-card">
          <summary><span><KeyRound size={17} />浏览器本地凭据</span><ChevronDown size={17} /></summary>
          <div className="credential-body">
            <label className="field"><span>Figma Access Token</span><div className="input-shell"><ShieldCheck size={17} /><input type="password" autoComplete="off" value={props.figmaToken} onChange={(event) => props.setFigmaToken(event.target.value)} placeholder="保存在当前浏览器" /></div></label>
            <label className="field"><span>AI API 请求地址（可选）</span><div className="input-shell"><Link2 size={17} /><input type="url" autoComplete="off" value={props.openaiApiUrl} onChange={(event) => props.setOpenaiApiUrl(event.target.value)} placeholder="默认 https://api.openai.com/v1" /></div><small>可填写基础地址或完整 /responses 地址；本地服务可不填写 API Key。</small></label>
            <label className="field"><span>AI API Key（可选）</span><div className="input-shell"><Sparkles size={17} /><input type="password" autoComplete="off" value={props.openaiKey} onChange={(event) => props.setOpenaiKey(event.target.value)} placeholder="官方地址需要；本地服务可留空" /></div></label>
            <div className="field">
              <span>AI 模型</span>
              <div className="model-picker-row">
                <div className="model-combobox">
                  <div className="input-shell">
                    <Sparkles size={17} />
                    <input
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="ai-model-listbox"
                      aria-expanded={modelPanelOpen}
                      value={props.openaiModel}
                      onChange={(event) => {
                        props.setOpenaiModel(event.target.value);
                        setModelPanelOpen(props.aiModels.length > 0);
                      }}
                      onFocus={() => setModelPanelOpen(props.aiModels.length > 0)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setModelPanelOpen(false);
                        if (event.key === "ArrowDown" && props.aiModels.length > 0) setModelPanelOpen(true);
                      }}
                      placeholder="先获取模型，或手动输入模型 ID"
                    />
                    <button
                      type="button"
                      className="model-expand-button"
                      aria-label={modelPanelOpen ? "收起模型列表" : "展开模型列表"}
                      aria-expanded={modelPanelOpen}
                      onClick={() => setModelPanelOpen((open) => props.aiModels.length > 0 && !open)}
                      disabled={props.aiModels.length === 0}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  {modelPanelOpen && (
                    <div className="model-options-panel" id="ai-model-listbox" role="listbox" aria-label="可用 AI 模型">
                      <div className="model-options-meta">可用模型 · {filteredModels.length}</div>
                      {filteredModels.length > 0 ? filteredModels.map((model) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={props.openaiModel === model}
                          className={props.openaiModel === model ? "selected" : ""}
                          onClick={() => {
                            props.setOpenaiModel(model);
                            setModelPanelOpen(false);
                          }}
                          key={model}
                        >
                          <span>{model}</span>
                          {props.openaiModel === model && <Check size={14} />}
                        </button>
                      )) : <div className="model-options-empty">没有匹配项，可继续手动输入模型 ID。</div>}
                    </div>
                  )}
                </div>
                <button type="button" className="fetch-models-button" onClick={fetchModels} disabled={fetchingModels}>
                  <RefreshCw className={fetchingModels ? "spinning" : ""} size={15} />
                  {fetchingModels ? "获取中" : "获取模型"}
                </button>
              </div>
              {modelMessage && <small className={`model-${modelMessage.kind}`} aria-live="polite">{modelMessage.text}</small>}
            </div>
            <label className="toggle-row"><span><b>生成 AI 改进建议</b><small>AI 只解释差异，不参与通过门禁。</small></span><input type="checkbox" checked={props.useAi} onChange={(event) => props.setUseAi(event.target.checked)} /></label>
            <div className="credential-cache-note">
              <ShieldCheck size={17} />
              <span><b>凭据已保存在此浏览器</b><small>仅适合可信设备；Token 与 API Key 以浏览器本地数据保存。</small></span>
              <button type="button" onClick={props.onClearCredentials}>清除本地缓存</button>
            </div>
          </div>
        </details>

        <button className="primary-button" onClick={props.onContinue} disabled={!canContinue || props.busy}>
          继续配置规则 <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

function RulesStep(props: {
  rulesYaml: string;
  setRulesYaml: (value: string) => void;
  defaultYaml: string;
  onBack: () => void;
  onRun: () => void;
  busy: boolean;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  return (
    <section className="workspace rules-layout">
      <aside className="rules-aside">
        <span className="mono-label">Step 02 · Gate rules</span>
        <h1>让“通过”<br />有明确依据</h1>
        <p>YAML 是唯一规则来源。每个结果都会记录规则、阈值、设计值与实际值。</p>
        <div className="principle-list">
          <div><XCircle size={17} /><span><b>Error</b>任意一项即不通过</span></div>
          <div><AlertTriangle size={17} /><span><b>Warning</b>建议修复但不阻断</span></div>
          <div><HelpCircle size={17} /><span><b>Pending</b>低置信度，等待人工确认</span></div>
        </div>
      </aside>
      <div className="editor-card">
        <header>
          <div><Code2 size={18} /><span><b>acceptance.yaml</b><small>规则会随本次报告一起导出</small></span></div>
          <div className="editor-actions">
            <input ref={importRef} hidden type="file" accept=".yaml,.yml,text/yaml" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) props.setRulesYaml(await file.text());
            }} />
            <button onClick={() => importRef.current?.click()}><UploadCloud size={14} />导入</button>
            <button onClick={() => props.setRulesYaml(props.defaultYaml)}><RotateCcw size={14} />恢复默认</button>
          </div>
        </header>
        <div className="code-editor-shell">
          <div className="line-rail" aria-hidden="true">{props.rulesYaml.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div>
          <textarea spellCheck={false} value={props.rulesYaml} onChange={(event) => props.setRulesYaml(event.target.value)} aria-label="YAML 验收规则" />
        </div>
        <footer>
          <div className="rule-hint"><ShieldCheck size={17} /><span><b>门禁可复现</b>AI 输出不会覆盖 YAML 结论。</span></div>
          <div className="footer-actions"><button className="ghost-button" onClick={props.onBack}><ArrowLeft size={16} />返回</button><button className="primary-button compact" onClick={props.onRun} disabled={props.busy}><Play size={16} />开始比对</button></div>
        </footer>
      </div>
    </section>
  );
}

function LoadingReport({ stage }: { stage: number }) {
  const labels = ["准备设计基准", "稳定并截取 H5", "匹配节点与 DOM", "执行门禁规则", "生成可视化报告"];
  return (
    <section className="loading-state">
      <div className="scan-orb"><span /><LoaderCircle size={34} /></div>
      <span className="mono-label">Comparison in progress</span>
      <h1>{labels[Math.min(stage, labels.length - 1)]}</h1>
      <p>凭据从浏览器本地读取，只随本次请求发送；不会写入报告或日志。</p>
      <div className="loading-steps">{labels.map((label, index) => <div className={index < stage ? "done" : index === stage ? "active" : ""} key={label}><span>{index < stage ? <Check size={13} /> : index + 1}</span>{label}</div>)}</div>
    </section>
  );
}

function IssueBox({ issue, viewport }: { issue?: Issue; viewport: CompareReport["viewport"] }) {
  if (!issue?.box) return null;
  const style = {
    left: `${(issue.box.x / viewport.width) * 100}%`,
    top: `${(issue.box.y / viewport.height) * 100}%`,
    width: `${(issue.box.width / viewport.width) * 100}%`,
    height: `${(issue.box.height / viewport.height) * 100}%`
  };
  return <span className={`issue-box ${issue.severity}`} style={style}><i>{issue.id.replace("issue-", "#")}</i></span>;
}

function ImageCanvas(props: { src: string; alt: string; report: CompareReport; issue?: Issue; className?: string }) {
  return <div className={`image-canvas ${props.className ?? ""}`} style={{ aspectRatio: `${props.report.viewport.width}/${props.report.viewport.height}` }}><img src={props.src} alt={props.alt} /><IssueBox issue={props.issue} viewport={props.report.viewport} /></div>;
}

function CompareViewer({ report, selectedIssue }: { report: CompareReport; selectedIssue?: Issue }) {
  const [mode, setMode] = useState<ViewerMode>("side");
  const [opacity, setOpacity] = useState(50);
  return (
    <section className="viewer-card">
      <header className="viewer-toolbar">
        <div className="segmented compact-segmented">
          <button className={mode === "side" ? "selected" : ""} onClick={() => setMode("side")}><Eye size={14} />左右对照</button>
          <button className={mode === "overlay" ? "selected" : ""} onClick={() => setMode("overlay")}><Layers3 size={14} />透明叠加</button>
          <button className={mode === "diff" ? "selected" : ""} onClick={() => setMode("diff")}><Flame size={14} />差异热图</button>
        </div>
        <span className="viewport-badge">{report.viewport.width} × {report.viewport.height} · DPR 1</span>
      </header>
      {mode === "side" && <div className="side-view"><div><label>设计基准</label><ImageCanvas src={report.images.reference} alt="设计基准" report={report} issue={selectedIssue} /></div><div><label>H5 实际截图</label><ImageCanvas src={report.images.actual} alt="H5 实际截图" report={report} issue={selectedIssue} /></div></div>}
      {mode === "overlay" && <div className="overlay-view"><div className="image-canvas" style={{ aspectRatio: `${report.viewport.width}/${report.viewport.height}` }}><img src={report.images.reference} alt="设计基准" /><img className="overlay-image" style={{ opacity: opacity / 100 }} src={report.images.actual} alt="H5 叠加截图" /><IssueBox issue={selectedIssue} viewport={report.viewport} /></div><label className="opacity-control"><span>设计稿</span><input type="range" min="0" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><span>H5 · {opacity}%</span></label></div>}
      {mode === "diff" && <div className="diff-view"><ImageCanvas src={report.images.diff} alt="差异热力图" report={report} issue={selectedIssue} /><p>透明区域表示未检测到显著像素变化；红色区域为差异。</p></div>}
    </section>
  );
}

function IssueList(props: { report: CompareReport; selected?: Issue; onSelect: (issue: Issue) => void }) {
  const [filter, setFilter] = useState<IssueFilter>("all");
  const counts = useMemo(() => ({
    all: props.report.issues.length,
    error: props.report.issues.filter((issue) => issue.severity === "error").length,
    warning: props.report.issues.filter((issue) => issue.severity === "warning").length,
    pending: props.report.issues.filter((issue) => issue.severity === "pending").length,
    info: props.report.issues.filter((issue) => issue.severity === "info").length
  }), [props.report]);
  const issues = filter === "all" ? props.report.issues : props.report.issues.filter((issue) => issue.severity === filter);
  return (
    <aside className="issue-panel">
      <header><div><span className="mono-label">Findings</span><h2>问题清单 <em>{props.report.issues.length}</em></h2></div><SlidersHorizontal size={17} /></header>
      <div className="filter-row">{(["all", "error", "warning", "pending"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "全部" : severityMeta[value].label}<span>{counts[value]}</span></button>)}</div>
      <div className="issue-scroll">
        {issues.length === 0 && <div className="empty-issues"><CheckCircle2 size={24} /><b>该分类暂无问题</b></div>}
        {issues.map((issue) => {
          const Icon = severityMeta[issue.severity].icon;
          return <button className={`issue-row ${issue.severity} ${props.selected?.id === issue.id ? "selected" : ""}`} key={issue.id} onClick={() => props.onSelect(issue)}><span className="severity-icon"><Icon size={16} /></span><span className="issue-copy"><small>{issue.category} · {issue.id.replace("issue-", "#")}</small><b>{issue.title}</b><p>{issue.summary}</p>{issue.selector && <code>{issue.selector}</code>}<span className="suggestion"><ArrowRight size={13} />{issue.suggestion}</span></span>{typeof issue.confidence === "number" && <span className="confidence">{Math.round(issue.confidence * 100)}%</span>}</button>;
        })}
      </div>
    </aside>
  );
}

function ReportStep({ report, onReset }: { report: CompareReport; onReset: () => void }) {
  const [selected, setSelected] = useState<Issue | undefined>(report.issues[0]);
  const exportJson = () => {
    const { reportHtml: _html, markdown: _markdown, images: _images, ...result } = report;
    downloadText(JSON.stringify(result, null, 2), `difflab-${report.id}.json`, "application/json");
  };
  return (
    <section className="report-workspace">
      <header className={`report-hero ${report.status}`}>
        <div className="report-verdict"><span className="verdict-icon">{report.status === "passed" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}</span><div><span className="mono-label">Acceptance result</span><h1>{report.status === "passed" ? "通过验收" : "未通过验收"}</h1><p>{report.source.design} · {report.source.h5}</p></div></div>
        <div className="report-actions"><button className="ghost-button" onClick={onReset}><RotateCcw size={15} />新建比对</button><div className="download-menu"><button className="primary-button compact"><Download size={15} />导出报告<ChevronDown size={14} /></button><div><button onClick={() => downloadText(report.reportHtml, `difflab-${report.id}.html`, "text/html")}>HTML 报告</button><button onClick={() => downloadText(report.markdown, `difflab-${report.id}.md`, "text/markdown")}>Markdown 摘要</button><button onClick={exportJson}>JSON 结果</button><button onClick={() => downloadDataUrl(report.images.diff, `difflab-${report.id}-diff.png`)}>差异图 PNG</button></div></div></div>
      </header>
      <div className="metrics-grid">
        <article className="metric-card score"><span>视觉相似度</span><strong>{(report.summary.similarity * 100).toFixed(2)}<small>%</small></strong><i style={{ "--score": `${report.summary.similarity * 100}%` } as React.CSSProperties} /></article>
        <article className="metric-card error"><span>错误</span><strong>{report.summary.errors}</strong><small>阻断验收</small></article>
        <article className="metric-card warning"><span>警告</span><strong>{report.summary.warnings}</strong><small>建议改进</small></article>
        <article className="metric-card pending"><span>待确认</span><strong>{report.summary.pending}</strong><small>低置信度</small></article>
        <article className="metric-card matched"><span>已匹配元素</span><strong>{report.summary.matchedElements}</strong><small>{(report.durationMs / 1000).toFixed(1)} 秒完成</small></article>
      </div>
      <div className="report-body"><div className="visual-column"><CompareViewer report={report} selectedIssue={selected} />{report.aiAdvice && <section className="ai-card"><header><Sparkles size={17} /><span><b>AI 改进建议</b><small>不参与门禁{report.aiAdvice.model ? ` · ${report.aiAdvice.model}` : ""}</small></span></header><p>{report.aiAdvice.summary}</p><ol>{report.aiAdvice.priorities.map((item) => <li key={item.title}><b>{item.title}</b><span>{item.reason}</span><strong>{item.action}</strong></li>)}</ol></section>}<details className="diagnostic-card"><summary>运行诊断信息 <span>{report.diagnostics.length}</span></summary><ul>{report.diagnostics.map((item) => <li key={item}>{item}</li>)}</ul></details></div><IssueList report={report} selected={selected} onSelect={setSelected} /></div>
    </section>
  );
}

export function App() {
  const [initialCredentials] = useState(readCredentialCache);
  const [step, setStep] = useState(1);
  const [designMode, setDesignMode] = useState<DesignMode>("figma");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [h5Url, setH5Url] = useState("");
  const [designFile, setDesignFile] = useState<File>();
  const [figmaToken, setFigmaToken] = useState(initialCredentials.figmaToken);
  const [openaiKey, setOpenaiKey] = useState(initialCredentials.openaiKey);
  const [openaiApiUrl, setOpenaiApiUrl] = useState(initialCredentials.openaiApiUrl);
  const [openaiModel, setOpenaiModel] = useState(initialCredentials.openaiModel);
  const [aiModels, setAiModels] = useState(initialCredentials.aiModels);
  const [modelsSourceUrl, setModelsSourceUrl] = useState(initialCredentials.modelsSourceUrl);
  const [useAi, setUseAi] = useState(initialCredentials.useAi);
  const [defaultYaml, setDefaultYaml] = useState("");
  const [rulesYaml, setRulesYaml] = useState("");
  const [report, setReport] = useState<CompareReport>();
  const [busy, setBusy] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.pathname === "/") history.replaceState(null, "", "/prototype/visual-qa");
    fetch("/api/default-rules").then((response) => response.text()).then((value) => { setDefaultYaml(value); setRulesYaml(value); }).catch(() => setError("无法读取默认验收规则，请确认本地服务已启动。"));
  }, []);

  useEffect(() => {
    try {
      const cache = {
        figmaToken,
        openaiKey,
        openaiApiUrl,
        openaiModel,
        useAi,
        aiModels,
        modelsSourceUrl
      } satisfies CredentialCache;
      const hasCachedValue = figmaToken || openaiKey || openaiApiUrl || openaiModel || useAi || aiModels.length > 0;
      if (hasCachedValue) window.localStorage.setItem(CREDENTIAL_CACHE_KEY, JSON.stringify(cache));
      else window.localStorage.removeItem(CREDENTIAL_CACHE_KEY);
    } catch {
      // 浏览器禁用本地存储时仍允许继续使用当前页面。
    }
  }, [figmaToken, openaiKey, openaiApiUrl, openaiModel, useAi, aiModels, modelsSourceUrl]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setLoadingStage((stage) => Math.min(4, stage + 1)), 1250);
    return () => window.clearInterval(timer);
  }, [busy]);

  const readResponse = async (response: Response): Promise<CompareReport> => {
    const payload = (await response.json()) as CompareReport | CompareError;
    if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "比对失败");
    return payload;
  };

  const run = async (demo = false) => {
    setBusy(true); setLoadingStage(0); setError(""); setStep(3); setReport(undefined);
    try {
      let response: Response;
      if (demo) {
        response = await fetch("/api/demo-compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rulesYaml, useAi, openaiKey, openaiApiUrl, openaiModel }) });
      } else {
        const body = new FormData();
        body.set("h5Url", h5Url); body.set("rulesYaml", rulesYaml); body.set("figmaToken", figmaToken); body.set("openaiKey", openaiKey); body.set("openaiApiUrl", openaiApiUrl); body.set("openaiModel", openaiModel); body.set("useAi", String(useAi));
        if (designMode === "figma") body.set("figmaUrl", figmaUrl);
        else if (designFile) body.set("designImage", designFile);
        response = await fetch("/api/compare", { method: "POST", body });
      }
      setReport(await readResponse(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "比对失败");
      setStep(demo ? 1 : 2);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setStep(1); setReport(undefined); setError(""); };
  const clearCredentials = () => {
    try {
      window.localStorage.removeItem(CREDENTIAL_CACHE_KEY);
    } catch {
      // 浏览器禁用本地存储时，仍清空当前页面中的凭据。
    }
    setFigmaToken("");
    setOpenaiKey("");
    setOpenaiApiUrl("");
    setOpenaiModel("");
    setAiModels([]);
    setModelsSourceUrl("");
    setUseAi(false);
  };

  return (
    <div className="app-shell">
      <header className="app-header"><a className="brand" href="/prototype/visual-qa"><span className="brand-mark"><i /><i /><i /><i /></span><span>DiffLab<small>视觉验收原型</small></span></a><StepRail step={step} /><span className="prototype-pill">Throwaway prototype</span></header>
      {error && <div className="error-banner"><XCircle size={17} /><span><b>无法完成比对</b>{error}</span><button onClick={() => setError("")}>关闭</button></div>}
      {step === 1 && <SourceStep designMode={designMode} setDesignMode={setDesignMode} figmaUrl={figmaUrl} setFigmaUrl={setFigmaUrl} h5Url={h5Url} setH5Url={setH5Url} designFile={designFile} setDesignFile={setDesignFile} figmaToken={figmaToken} setFigmaToken={setFigmaToken} openaiKey={openaiKey} setOpenaiKey={setOpenaiKey} openaiApiUrl={openaiApiUrl} setOpenaiApiUrl={setOpenaiApiUrl} openaiModel={openaiModel} setOpenaiModel={setOpenaiModel} aiModels={aiModels} setAiModels={setAiModels} modelsSourceUrl={modelsSourceUrl} setModelsSourceUrl={setModelsSourceUrl} useAi={useAi} setUseAi={setUseAi} onClearCredentials={clearCredentials} onContinue={() => setStep(2)} onDemo={() => run(true)} busy={busy} />}
      {step === 2 && <RulesStep rulesYaml={rulesYaml} setRulesYaml={setRulesYaml} defaultYaml={defaultYaml} onBack={() => setStep(1)} onRun={() => run(false)} busy={busy} />}
      {step === 3 && (busy || !report ? <LoadingReport stage={loadingStage} /> : <ReportStep report={report} onReset={reset} />)}
      <footer className="app-footer"><span>DiffLab / 0.0.0-prototype</span><span>浏览器本地凭据 · 单 Frame · 桌面优先</span></footer>
    </div>
  );
}
