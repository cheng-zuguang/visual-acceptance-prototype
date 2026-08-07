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
  Globe2,
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
import { useI18n } from "./i18n";
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

const severityIcons: Record<Severity, typeof XCircle> = {
  error: XCircle,
  warning: AlertTriangle,
  pending: HelpCircle,
  info: CheckCircle2
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
  const { t } = useI18n();
  const steps = [
    { number: 1, label: t("steps.source.label"), hint: t("steps.source.hint") },
    { number: 2, label: t("steps.rules.label"), hint: t("steps.rules.hint") },
    { number: 3, label: t("steps.report.label"), hint: t("steps.report.hint") }
  ];
  return (
    <nav className="step-rail" aria-label={t("steps.aria")}>
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
  const { locale, t } = useI18n();
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
        body: JSON.stringify({ apiUrl: props.openaiApiUrl, apiKey: props.openaiKey, locale })
      });
      const payload = (await response.json()) as { models?: string[]; defaultModel?: string; error?: string };
      if (!response.ok || !payload.models) throw new Error(payload.error || t("credentials.model.fetchError"));
      props.setAiModels(payload.models);
      props.setModelsSourceUrl(props.openaiApiUrl.trim());
      if (!props.openaiModel && payload.defaultModel && payload.models.includes(payload.defaultModel)) {
        props.setOpenaiModel(payload.defaultModel);
      }
      setModelPanelOpen(true);
      setModelMessage({
        kind: "success",
        text: t("credentials.model.fetchSuccess", { count: payload.models.length })
      });
    } catch (caught) {
      props.setAiModels([]);
      props.setModelsSourceUrl("");
      setModelPanelOpen(false);
      setModelMessage({ kind: "error", text: caught instanceof Error ? caught.message : t("credentials.model.fetchError") });
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <section className="workspace setup-grid">
      <div className="intro-block">
        <span className="mono-label">{t("source.eyebrow")}</span>
        <h1>{t("source.title1")}<br />{t("source.title2")}</h1>
        <p>{t("source.description")}</p>
        <button className="demo-button" onClick={props.onDemo} disabled={props.busy}>
          <FlaskConical size={17} />
          {t("source.demo")}
          <ArrowRight size={16} />
        </button>
        <div className="prototype-note">
          <span>PROTOTYPE</span>
          {t("source.prototypeNote")}
        </div>
      </div>

      <div className="form-stack">
        <article className="form-card emphasis-card">
          <header className="card-heading">
            <span className="card-number">01</span>
            <div><h2>{t("source.design.title")}</h2><p>{t("source.design.description")}</p></div>
          </header>
          <div className="segmented" role="tablist" aria-label={t("source.design.aria")}>
            <button className={props.designMode === "figma" ? "selected" : ""} onClick={() => props.setDesignMode("figma")}>
              <Link2 size={15} /> Figma Frame
            </button>
            <button className={props.designMode === "image" ? "selected" : ""} onClick={() => props.setDesignMode("image")}>
              <FileImage size={15} /> {t("source.design.upload")}
            </button>
          </div>
          {props.designMode === "figma" ? (
            <label className="field">
              <span>{t("source.figma.label")}</span>
              <div className="input-shell"><Link2 size={17} /><input value={props.figmaUrl} onChange={(event) => props.setFigmaUrl(event.target.value)} placeholder="https://www.figma.com/design/...?...node-id=..." /></div>
              <small>{t("source.figma.help")}</small>
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
              {props.designFile ? <><b>{props.designFile.name}</b><small>{(props.designFile.size / 1024 / 1024).toFixed(2)} MB · {t("source.upload.replace")}</small></> : <><b>{t("source.upload.drop")}</b><small>{t("source.upload.help")}</small></>}
            </div>
          )}
        </article>

        <article className="form-card">
          <header className="card-heading">
            <span className="card-number">02</span>
            <div><h2>{t("source.h5.title")}</h2><p>{t("source.h5.description")}</p></div>
          </header>
          <label className="field">
            <span>{t("source.h5.url")}</span>
            <div className="input-shell"><Eye size={17} /><input value={props.h5Url} onChange={(event) => props.setH5Url(event.target.value)} placeholder="https://example.com/page" /></div>
          </label>
        </article>

        <details className="credential-card">
          <summary><span><KeyRound size={17} />{t("credentials.title")}</span><ChevronDown size={17} /></summary>
          <div className="credential-body">
            <label className="field"><span>Figma Access Token</span><div className="input-shell"><ShieldCheck size={17} /><input type="password" autoComplete="off" value={props.figmaToken} onChange={(event) => props.setFigmaToken(event.target.value)} placeholder={t("credentials.figma.placeholder")} /></div></label>
            <label className="field"><span>{t("credentials.apiUrl.label")}</span><div className="input-shell"><Link2 size={17} /><input type="url" autoComplete="off" value={props.openaiApiUrl} onChange={(event) => props.setOpenaiApiUrl(event.target.value)} placeholder={t("credentials.apiUrl.placeholder")} /></div><small>{t("credentials.apiUrl.help")}</small></label>
            <label className="field"><span>{t("credentials.apiKey.label")}</span><div className="input-shell"><Sparkles size={17} /><input type="password" autoComplete="off" value={props.openaiKey} onChange={(event) => props.setOpenaiKey(event.target.value)} placeholder={t("credentials.apiKey.placeholder")} /></div></label>
            <div className="field">
              <span>{t("credentials.model.label")}</span>
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
                      placeholder={t("credentials.model.placeholder")}
                    />
                    <button
                      type="button"
                      className="model-expand-button"
                      aria-label={modelPanelOpen ? t("credentials.model.collapse") : t("credentials.model.expand")}
                      aria-expanded={modelPanelOpen}
                      onClick={() => setModelPanelOpen((open) => props.aiModels.length > 0 && !open)}
                      disabled={props.aiModels.length === 0}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  {modelPanelOpen && (
                    <div className="model-options-panel" id="ai-model-listbox" role="listbox" aria-label={t("credentials.model.availableAria")}>
                      <div className="model-options-meta">{t("credentials.model.available", { count: filteredModels.length })}</div>
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
                      )) : <div className="model-options-empty">{t("credentials.model.empty")}</div>}
                    </div>
                  )}
                </div>
                <button type="button" className="fetch-models-button" onClick={fetchModels} disabled={fetchingModels}>
                  <RefreshCw className={fetchingModels ? "spinning" : ""} size={15} />
                  {fetchingModels ? t("credentials.model.fetching") : t("credentials.model.fetch")}
                </button>
              </div>
              {modelMessage && <small className={`model-${modelMessage.kind}`} aria-live="polite">{modelMessage.text}</small>}
            </div>
            <label className="toggle-row"><span><b>{t("credentials.ai.title")}</b><small>{t("credentials.ai.help")}</small></span><input type="checkbox" checked={props.useAi} onChange={(event) => props.setUseAi(event.target.checked)} /></label>
            <div className="credential-cache-note">
              <ShieldCheck size={17} />
              <span><b>{t("credentials.cache.title")}</b><small>{t("credentials.cache.help")}</small></span>
              <button type="button" onClick={props.onClearCredentials}>{t("credentials.cache.clear")}</button>
            </div>
          </div>
        </details>

        <button className="primary-button" onClick={props.onContinue} disabled={!canContinue || props.busy}>
          {t("source.continue")} <ArrowRight size={17} />
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
  const { t } = useI18n();
  const importRef = useRef<HTMLInputElement>(null);
  return (
    <section className="workspace rules-layout">
      <aside className="rules-aside">
        <span className="mono-label">{t("rules.eyebrow")}</span>
        <h1>{t("rules.title1")}<br />{t("rules.title2")}</h1>
        <p>{t("rules.description")}</p>
        <div className="principle-list">
          <div><XCircle size={17} /><span><b>Error</b>{t("rules.error")}</span></div>
          <div><AlertTriangle size={17} /><span><b>Warning</b>{t("rules.warning")}</span></div>
          <div><HelpCircle size={17} /><span><b>Pending</b>{t("rules.pending")}</span></div>
        </div>
      </aside>
      <div className="editor-card">
        <header>
          <div><Code2 size={18} /><span><b>acceptance.yaml</b><small>{t("rules.exportHelp")}</small></span></div>
          <div className="editor-actions">
            <input ref={importRef} hidden type="file" accept=".yaml,.yml,text/yaml" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) props.setRulesYaml(await file.text());
            }} />
            <button onClick={() => importRef.current?.click()}><UploadCloud size={14} />{t("rules.import")}</button>
            <button onClick={() => props.setRulesYaml(props.defaultYaml)}><RotateCcw size={14} />{t("rules.reset")}</button>
          </div>
        </header>
        <div className="code-editor-shell">
          <div className="line-rail" aria-hidden="true">{props.rulesYaml.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</div>
          <textarea spellCheck={false} value={props.rulesYaml} onChange={(event) => props.setRulesYaml(event.target.value)} aria-label={t("rules.editorAria")} />
        </div>
        <footer>
          <div className="rule-hint"><ShieldCheck size={17} /><span><b>{t("rules.reproducible")}</b>{t("rules.reproducibleHelp")}</span></div>
          <div className="footer-actions"><button className="ghost-button" onClick={props.onBack}><ArrowLeft size={16} />{t("actions.back")}</button><button className="primary-button compact" onClick={props.onRun} disabled={props.busy}><Play size={16} />{t("actions.run")}</button></div>
        </footer>
      </div>
    </section>
  );
}

function LoadingReport({ stage }: { stage: number }) {
  const { t } = useI18n();
  const labels = [t("loading.prepare"), t("loading.capture"), t("loading.match"), t("loading.rules"), t("loading.report")];
  return (
    <section className="loading-state">
      <div className="scan-orb"><span /><LoaderCircle size={34} /></div>
      <span className="mono-label">{t("loading.eyebrow")}</span>
      <h1>{labels[Math.min(stage, labels.length - 1)]}</h1>
      <p>{t("loading.description")}</p>
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
  const { t } = useI18n();
  const [mode, setMode] = useState<ViewerMode>("side");
  const [opacity, setOpacity] = useState(50);
  return (
    <section className="viewer-card">
      <header className="viewer-toolbar">
        <div className="segmented compact-segmented">
          <button className={mode === "side" ? "selected" : ""} onClick={() => setMode("side")}><Eye size={14} />{t("viewer.side")}</button>
          <button className={mode === "overlay" ? "selected" : ""} onClick={() => setMode("overlay")}><Layers3 size={14} />{t("viewer.overlay")}</button>
          <button className={mode === "diff" ? "selected" : ""} onClick={() => setMode("diff")}><Flame size={14} />{t("viewer.diff")}</button>
        </div>
        <span className="viewport-badge">{report.viewport.width} × {report.viewport.height} · DPR 1</span>
      </header>
      {mode === "side" && <div className="side-view"><div><label>{t("viewer.reference")}</label><ImageCanvas src={report.images.reference} alt={t("viewer.reference")} report={report} issue={selectedIssue} /></div><div><label>{t("viewer.actual")}</label><ImageCanvas src={report.images.actual} alt={t("viewer.actual")} report={report} issue={selectedIssue} /></div></div>}
      {mode === "overlay" && <div className="overlay-view"><div className="image-canvas" style={{ aspectRatio: `${report.viewport.width}/${report.viewport.height}` }}><img src={report.images.reference} alt={t("viewer.reference")} /><img className="overlay-image" style={{ opacity: opacity / 100 }} src={report.images.actual} alt={t("viewer.overlayAlt")} /><IssueBox issue={selectedIssue} viewport={report.viewport} /></div><label className="opacity-control"><span>{t("viewer.design")}</span><input type="range" min="0" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><span>H5 · {opacity}%</span></label></div>}
      {mode === "diff" && <div className="diff-view"><ImageCanvas src={report.images.diff} alt={t("viewer.diffAlt")} report={report} issue={selectedIssue} /><p>{t("viewer.diffHelp")}</p></div>}
    </section>
  );
}

function IssueList(props: { report: CompareReport; selected?: Issue; onSelect: (issue: Issue) => void }) {
  const { t } = useI18n();
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
      <header><div><span className="mono-label">{t("issues.eyebrow")}</span><h2>{t("issues.title")} <em>{props.report.issues.length}</em></h2></div><SlidersHorizontal size={17} /></header>
      <div className="filter-row">{(["all", "error", "warning", "pending"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? t("issues.all") : t(`severity.${value}`)}<span>{counts[value]}</span></button>)}</div>
      <div className="issue-scroll">
        {issues.length === 0 && <div className="empty-issues"><CheckCircle2 size={24} /><b>{t("issues.empty")}</b></div>}
        {issues.map((issue) => {
          const Icon = severityIcons[issue.severity];
          return <button className={`issue-row ${issue.severity} ${props.selected?.id === issue.id ? "selected" : ""}`} key={issue.id} onClick={() => props.onSelect(issue)}><span className="severity-icon"><Icon size={16} /></span><span className="issue-copy"><small>{issue.category} · {issue.id.replace("issue-", "#")}</small><b>{issue.title}</b><p>{issue.summary}</p>{issue.selector && <code>{issue.selector}</code>}<span className="suggestion"><ArrowRight size={13} />{issue.suggestion}</span></span>{typeof issue.confidence === "number" && <span className="confidence">{Math.round(issue.confidence * 100)}%</span>}</button>;
        })}
      </div>
    </aside>
  );
}

function ReportStep({ report, onReset }: { report: CompareReport; onReset: () => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Issue | undefined>(report.issues[0]);
  const exportJson = () => {
    const { reportHtml: _html, markdown: _markdown, images: _images, ...result } = report;
    downloadText(JSON.stringify(result, null, 2), `difflab-${report.id}.json`, "application/json");
  };
  return (
    <section className="report-workspace">
      <header className={`report-hero ${report.status}`}>
        <div className="report-verdict"><span className="verdict-icon">{report.status === "passed" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}</span><div><span className="mono-label">{t("report.eyebrow")}</span><h1>{report.status === "passed" ? t("report.passed") : t("report.failed")}</h1><p>{report.source.design} · {report.source.h5}</p></div></div>
        <div className="report-actions"><button className="ghost-button" onClick={onReset}><RotateCcw size={15} />{t("report.new")}</button><div className="download-menu"><button className="primary-button compact"><Download size={15} />{t("report.export")}<ChevronDown size={14} /></button><div><button onClick={() => downloadText(report.reportHtml, `difflab-${report.id}.html`, "text/html")}>{t("report.export.html")}</button><button onClick={() => downloadText(report.markdown, `difflab-${report.id}.md`, "text/markdown")}>{t("report.export.markdown")}</button><button onClick={exportJson}>{t("report.export.json")}</button><button onClick={() => downloadDataUrl(report.images.diff, `difflab-${report.id}-diff.png`)}>{t("report.export.diff")}</button></div></div></div>
      </header>
      <div className="metrics-grid">
        <article className="metric-card score"><span>{t("report.similarity")}</span><strong>{(report.summary.similarity * 100).toFixed(2)}<small>%</small></strong><i style={{ "--score": `${report.summary.similarity * 100}%` } as React.CSSProperties} /></article>
        <article className="metric-card error"><span>{t("severity.error")}</span><strong>{report.summary.errors}</strong><small>{t("report.errorHelp")}</small></article>
        <article className="metric-card warning"><span>{t("severity.warning")}</span><strong>{report.summary.warnings}</strong><small>{t("report.warningHelp")}</small></article>
        <article className="metric-card pending"><span>{t("severity.pending")}</span><strong>{report.summary.pending}</strong><small>{t("report.pendingHelp")}</small></article>
        <article className="metric-card matched"><span>{t("report.matched")}</span><strong>{report.summary.matchedElements}</strong><small>{t("report.duration", { seconds: (report.durationMs / 1000).toFixed(1) })}</small></article>
      </div>
      <div className="report-body"><div className="visual-column"><CompareViewer report={report} selectedIssue={selected} />{report.aiAdvice && <section className="ai-card"><header><Sparkles size={17} /><span><b>{t("report.ai.title")}</b><small>{t("report.ai.help")}{report.aiAdvice.model ? ` · ${report.aiAdvice.model}` : ""}</small></span></header><p>{report.aiAdvice.summary}</p><ol>{report.aiAdvice.priorities.map((item) => <li key={item.title}><b>{item.title}</b><span>{item.reason}</span><strong>{item.action}</strong></li>)}</ol></section>}<details className="diagnostic-card"><summary>{t("report.diagnostics")} <span>{report.diagnostics.length}</span></summary><ul>{report.diagnostics.map((item) => <li key={item}>{item}</li>)}</ul></details></div><IssueList report={report} selected={selected} onSelect={setSelected} /></div>
    </section>
  );
}

export function App() {
  const { locale, setLocale, t } = useI18n();
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
  const rulesEdited = useRef(false);

  useEffect(() => {
    if (location.pathname === "/") history.replaceState(null, "", "/prototype/visual-qa");
    const controller = new AbortController();
    fetch(`/api/default-rules?locale=${locale}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(t("error.defaultRules"));
        return response.text();
      })
      .then((value) => {
        setDefaultYaml(value);
        if (!rulesEdited.current) setRulesYaml(value);
      })
      .catch((caught) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(t("error.defaultRules"));
      });
    return () => controller.abort();
  }, [locale, t]);

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
    if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : t("error.compare"));
    return payload;
  };

  const run = async (demo = false) => {
    setBusy(true); setLoadingStage(0); setError(""); setStep(3); setReport(undefined);
    try {
      let response: Response;
      if (demo) {
        response = await fetch("/api/demo-compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rulesYaml, useAi, openaiKey, openaiApiUrl, openaiModel, locale }) });
      } else {
        const body = new FormData();
        body.set("h5Url", h5Url); body.set("rulesYaml", rulesYaml); body.set("figmaToken", figmaToken); body.set("openaiKey", openaiKey); body.set("openaiApiUrl", openaiApiUrl); body.set("openaiModel", openaiModel); body.set("useAi", String(useAi)); body.set("locale", locale);
        if (designMode === "figma") body.set("figmaUrl", figmaUrl);
        else if (designFile) body.set("designImage", designFile);
        response = await fetch("/api/compare", { method: "POST", body });
      }
      setReport(await readResponse(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("error.compare"));
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
      <header className="app-header"><a className="brand" href="/prototype/visual-qa"><span className="brand-mark"><i /><i /><i /><i /></span><span>DiffLab<small>{t("app.subtitle")}</small></span></a><StepRail step={step} /><div className="header-tools"><span className="prototype-pill">{t("app.prototype")}</span><div className="language-switch" role="group" aria-label={t("language.label")}><Globe2 size={14} /><button type="button" className={locale === "zh-CN" ? "active" : ""} aria-pressed={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>{t("language.zh")}</button><button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>{t("language.en")}</button></div></div></header>
      {error && <div className="error-banner"><XCircle size={17} /><span><b>{t("error.title")}</b>{error}</span><button onClick={() => setError("")}>{t("error.close")}</button></div>}
      {step === 1 && <SourceStep designMode={designMode} setDesignMode={setDesignMode} figmaUrl={figmaUrl} setFigmaUrl={setFigmaUrl} h5Url={h5Url} setH5Url={setH5Url} designFile={designFile} setDesignFile={setDesignFile} figmaToken={figmaToken} setFigmaToken={setFigmaToken} openaiKey={openaiKey} setOpenaiKey={setOpenaiKey} openaiApiUrl={openaiApiUrl} setOpenaiApiUrl={setOpenaiApiUrl} openaiModel={openaiModel} setOpenaiModel={setOpenaiModel} aiModels={aiModels} setAiModels={setAiModels} modelsSourceUrl={modelsSourceUrl} setModelsSourceUrl={setModelsSourceUrl} useAi={useAi} setUseAi={setUseAi} onClearCredentials={clearCredentials} onContinue={() => setStep(2)} onDemo={() => run(true)} busy={busy} />}
      {step === 2 && <RulesStep rulesYaml={rulesYaml} setRulesYaml={(value) => { rulesEdited.current = true; setRulesYaml(value); }} defaultYaml={defaultYaml} onBack={() => setStep(1)} onRun={() => run(false)} busy={busy} />}
      {step === 3 && (busy || !report ? <LoadingReport stage={loadingStage} /> : <ReportStep report={report} onReset={reset} />)}
      <footer className="app-footer"><span>DiffLab / 0.0.0-prototype</span><span>{t("app.footer")}</span></footer>
    </div>
  );
}
