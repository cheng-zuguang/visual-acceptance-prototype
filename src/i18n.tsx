import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeLocale, type Locale } from "./locale";

const LOCALE_STORAGE_KEY = "difflab.locale.v1";

const zhCN = {
  "app.title": "DiffLab · 视觉验收原型",
  "app.subtitle": "视觉验收原型",
  "app.prototype": "可抛弃原型",
  "app.footer": "浏览器本地凭据 · 单 Frame · 桌面优先",
  "language.label": "语言",
  "language.zh": "中文",
  "language.en": "EN",
  "error.title": "无法完成比对",
  "error.close": "关闭",
  "error.defaultRules": "无法读取默认验收规则，请确认本地服务已启动。",
  "error.compare": "比对失败",
  "steps.aria": "验收流程",
  "steps.source.label": "连接来源",
  "steps.source.hint": "设计稿与 H5",
  "steps.rules.label": "验收规则",
  "steps.rules.hint": "阈值与门禁",
  "steps.report.label": "比对报告",
  "steps.report.hint": "证据与建议",
  "source.eyebrow": "第 01 步 · 输入",
  "source.title1": "连接设计基准",
  "source.title2": "与实际页面",
  "source.description": "一次只验收一个 Frame。截图视口自动跟随设计尺寸，凭据仅缓存在当前浏览器。",
  "source.demo": "运行内置差异样本",
  "source.prototypeNote": "内置样本包含已知的字号、位置、颜色、圆角和缺失元素差异。",
  "source.design.title": "设计基准",
  "source.design.description": "选择结构化 Figma 链接或图片基准。",
  "source.design.aria": "设计稿来源",
  "source.design.upload": "上传图片",
  "source.figma.label": "Figma Frame 分享链接",
  "source.figma.help": "链接必须包含具体 Frame 的 node-id。",
  "source.upload.replace": "点击替换",
  "source.upload.drop": "拖入 PNG / JPG / WebP",
  "source.upload.help": "或点击选择，最大 25MB",
  "source.h5.title": "实际 H5",
  "source.h5.description": "页面无需登录，并能从本机网络直接访问。",
  "source.h5.url": "线上地址",
  "credentials.title": "浏览器本地凭据",
  "credentials.figma.placeholder": "保存在当前浏览器",
  "credentials.apiUrl.label": "AI API 请求地址（可选）",
  "credentials.apiUrl.placeholder": "默认 https://api.openai.com/v1",
  "credentials.apiUrl.help": "可填写基础地址或完整 /responses 地址；本地服务可不填写 API Key。",
  "credentials.apiKey.label": "AI API Key（可选）",
  "credentials.apiKey.placeholder": "官方地址需要；本地服务可留空",
  "credentials.model.label": "AI 模型",
  "credentials.model.placeholder": "先获取模型，或手动输入模型 ID",
  "credentials.model.collapse": "收起模型列表",
  "credentials.model.expand": "展开模型列表",
  "credentials.model.availableAria": "可用 AI 模型",
  "credentials.model.available": "可用模型 · {count}",
  "credentials.model.empty": "没有匹配项，可继续手动输入模型 ID。",
  "credentials.model.fetching": "获取中",
  "credentials.model.fetch": "获取模型",
  "credentials.model.fetchError": "无法获取模型列表。",
  "credentials.model.fetchSuccess": "已获取 {count} 个模型，请选择支持图像输入和 Responses API 的模型。",
  "credentials.ai.title": "生成 AI 改进建议",
  "credentials.ai.help": "AI 只解释差异，不参与通过门禁。",
  "credentials.cache.title": "凭据已保存在此浏览器",
  "credentials.cache.help": "仅适合可信设备；Token 与 API Key 以浏览器本地数据保存。",
  "credentials.cache.clear": "清除本地缓存",
  "source.continue": "继续配置规则",
  "rules.eyebrow": "第 02 步 · 门禁规则",
  "rules.title1": "让“通过”",
  "rules.title2": "有明确依据",
  "rules.description": "YAML 是唯一规则来源。每个结果都会记录规则、阈值、设计值与实际值。",
  "rules.error": "任意一项即不通过",
  "rules.warning": "建议修复但不阻断",
  "rules.pending": "低置信度，等待人工确认",
  "rules.exportHelp": "规则会随本次报告一起导出",
  "rules.import": "导入",
  "rules.reset": "恢复默认",
  "rules.editorAria": "YAML 验收规则",
  "rules.reproducible": "门禁可复现",
  "rules.reproducibleHelp": "AI 输出不会覆盖 YAML 结论。",
  "actions.back": "返回",
  "actions.run": "开始比对",
  "loading.eyebrow": "正在比对",
  "loading.description": "凭据从浏览器本地读取，只随本次请求发送；不会写入报告或日志。",
  "loading.prepare": "准备设计基准",
  "loading.capture": "稳定并截取 H5",
  "loading.match": "匹配节点与 DOM",
  "loading.rules": "执行门禁规则",
  "loading.report": "生成可视化报告",
  "viewer.side": "左右对照",
  "viewer.overlay": "透明叠加",
  "viewer.diff": "差异热图",
  "viewer.reference": "设计基准",
  "viewer.actual": "H5 实际截图",
  "viewer.design": "设计稿",
  "viewer.overlayAlt": "H5 叠加截图",
  "viewer.diffAlt": "差异热力图",
  "viewer.diffHelp": "透明区域表示未检测到显著像素变化；红色区域为差异。",
  "severity.error": "错误",
  "severity.warning": "警告",
  "severity.pending": "待确认",
  "severity.info": "信息",
  "issues.eyebrow": "检查结果",
  "issues.title": "问题清单",
  "issues.all": "全部",
  "issues.empty": "该分类暂无问题",
  "report.eyebrow": "验收结果",
  "report.passed": "通过验收",
  "report.failed": "未通过验收",
  "report.new": "新建比对",
  "report.export": "导出报告",
  "report.export.html": "HTML 报告",
  "report.export.markdown": "Markdown 摘要",
  "report.export.json": "JSON 结果",
  "report.export.diff": "差异图 PNG",
  "report.similarity": "视觉相似度",
  "report.errorHelp": "阻断验收",
  "report.warningHelp": "建议改进",
  "report.pendingHelp": "低置信度",
  "report.matched": "已匹配元素",
  "report.duration": "{seconds} 秒完成",
  "report.ai.title": "AI 改进建议",
  "report.ai.help": "不参与门禁",
  "report.diagnostics": "运行诊断信息"
} as const;

type MessageKey = keyof typeof zhCN;

const en: Record<MessageKey, string> = {
  "app.title": "DiffLab · Visual acceptance prototype",
  "app.subtitle": "Visual acceptance prototype",
  "app.prototype": "Throwaway prototype",
  "app.footer": "Browser-local credentials · Single frame · Desktop first",
  "language.label": "Language",
  "language.zh": "中文",
  "language.en": "EN",
  "error.title": "Unable to complete comparison",
  "error.close": "Close",
  "error.defaultRules": "Unable to load the default acceptance rules. Make sure the local server is running.",
  "error.compare": "Comparison failed",
  "steps.aria": "Acceptance workflow",
  "steps.source.label": "Connect sources",
  "steps.source.hint": "Design & H5",
  "steps.rules.label": "Acceptance rules",
  "steps.rules.hint": "Thresholds & gate",
  "steps.report.label": "Comparison report",
  "steps.report.hint": "Evidence & advice",
  "source.eyebrow": "Step 01 · Inputs",
  "source.title1": "Connect the design",
  "source.title2": "to the live page",
  "source.description": "Validate one frame at a time. The screenshot viewport follows the design size, and credentials stay in this browser.",
  "source.demo": "Run the built-in diff sample",
  "source.prototypeNote": "The sample includes known typography, position, color, corner-radius, and missing-element differences.",
  "source.design.title": "Design reference",
  "source.design.description": "Choose a structured Figma link or an image reference.",
  "source.design.aria": "Design source",
  "source.design.upload": "Upload image",
  "source.figma.label": "Figma Frame share link",
  "source.figma.help": "The link must include the node-id of a specific frame.",
  "source.upload.replace": "Click to replace",
  "source.upload.drop": "Drop a PNG / JPG / WebP",
  "source.upload.help": "or click to choose, up to 25 MB",
  "source.h5.title": "Live H5",
  "source.h5.description": "The page must not require sign-in and must be reachable from this machine.",
  "source.h5.url": "Page URL",
  "credentials.title": "Browser-local credentials",
  "credentials.figma.placeholder": "Stored in this browser",
  "credentials.apiUrl.label": "AI API endpoint (optional)",
  "credentials.apiUrl.placeholder": "Default: https://api.openai.com/v1",
  "credentials.apiUrl.help": "Enter a base URL or a full /responses URL. A local service may not require an API key.",
  "credentials.apiKey.label": "AI API key (optional)",
  "credentials.apiKey.placeholder": "Required for the official API; optional for local services",
  "credentials.model.label": "AI model",
  "credentials.model.placeholder": "Fetch models first, or enter a model ID",
  "credentials.model.collapse": "Collapse model list",
  "credentials.model.expand": "Expand model list",
  "credentials.model.availableAria": "Available AI models",
  "credentials.model.available": "Available models · {count}",
  "credentials.model.empty": "No matches. You can still enter a model ID manually.",
  "credentials.model.fetching": "Fetching",
  "credentials.model.fetch": "Fetch models",
  "credentials.model.fetchError": "Unable to fetch the model list.",
  "credentials.model.fetchSuccess": "Fetched {count} models. Choose one that supports image input and the Responses API.",
  "credentials.ai.title": "Generate AI improvement advice",
  "credentials.ai.help": "AI explains differences but never determines the gate result.",
  "credentials.cache.title": "Credentials are saved in this browser",
  "credentials.cache.help": "Use only on a trusted device. Tokens and API keys are stored in browser-local data.",
  "credentials.cache.clear": "Clear local cache",
  "source.continue": "Continue to rules",
  "rules.eyebrow": "Step 02 · Gate rules",
  "rules.title1": "Make every pass",
  "rules.title2": "fully explainable",
  "rules.description": "YAML is the single source of truth. Every result records the rule, threshold, expected value, and actual value.",
  "rules.error": "Any occurrence fails the gate",
  "rules.warning": "Should be fixed but does not block",
  "rules.pending": "Low confidence; needs human review",
  "rules.exportHelp": "Rules are exported with this report",
  "rules.import": "Import",
  "rules.reset": "Restore defaults",
  "rules.editorAria": "YAML acceptance rules",
  "rules.reproducible": "Reproducible gate",
  "rules.reproducibleHelp": "AI output never overrides the YAML result.",
  "actions.back": "Back",
  "actions.run": "Start comparison",
  "loading.eyebrow": "Comparison in progress",
  "loading.description": "Credentials are read from this browser and sent only with this request; they are never written to reports or logs.",
  "loading.prepare": "Preparing the design reference",
  "loading.capture": "Stabilizing and capturing the H5 page",
  "loading.match": "Matching design nodes to the DOM",
  "loading.rules": "Evaluating gate rules",
  "loading.report": "Generating the visual report",
  "viewer.side": "Side by side",
  "viewer.overlay": "Overlay",
  "viewer.diff": "Diff heatmap",
  "viewer.reference": "Design reference",
  "viewer.actual": "H5 screenshot",
  "viewer.design": "Design",
  "viewer.overlayAlt": "H5 overlay screenshot",
  "viewer.diffAlt": "Difference heatmap",
  "viewer.diffHelp": "Transparent areas have no significant pixel changes; red areas indicate differences.",
  "severity.error": "Errors",
  "severity.warning": "Warnings",
  "severity.pending": "Pending",
  "severity.info": "Info",
  "issues.eyebrow": "Findings",
  "issues.title": "Issue list",
  "issues.all": "All",
  "issues.empty": "No issues in this category",
  "report.eyebrow": "Acceptance result",
  "report.passed": "Acceptance passed",
  "report.failed": "Acceptance failed",
  "report.new": "New comparison",
  "report.export": "Export report",
  "report.export.html": "HTML report",
  "report.export.markdown": "Markdown summary",
  "report.export.json": "JSON result",
  "report.export.diff": "Diff image PNG",
  "report.similarity": "Visual similarity",
  "report.errorHelp": "Blocks acceptance",
  "report.warningHelp": "Improvement suggested",
  "report.pendingHelp": "Low confidence",
  "report.matched": "Matched elements",
  "report.duration": "Completed in {seconds}s",
  "report.ai.title": "AI improvement advice",
  "report.ai.help": "Not part of the gate",
  "report.diagnostics": "Run diagnostics"
};

type TranslationValues = Record<string, string | number>;
type Translate = (key: MessageKey, values?: TranslationValues) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    // Browser language remains a safe fallback when local storage is unavailable.
  }
  return normalizeLocale(window.navigator.language);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = useMemo<Translate>(() => (key, values = {}) => {
    const template = (locale === "en" ? en : zhCN)[key] ?? zhCN[key];
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      template
    );
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("app.title");
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // The selected language still applies for this session.
    }
  }, [locale, t]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

