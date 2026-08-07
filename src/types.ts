export type Severity = "error" | "warning" | "pending" | "info";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  boxShadow?: string;
}

export interface DesignElement {
  id: string;
  name: string;
  type: string;
  text?: string;
  box: Box;
  style: ElementStyle;
}

export interface DomElement {
  selector: string;
  tag: string;
  dataFigmaId?: string;
  text?: string;
  box: Box;
  style: ElementStyle;
}

export interface AcceptanceConfig {
  viewport: "auto" | { width: number; height: number };
  thresholds: {
    visualSimilarityMin: number;
    pixelThreshold: number;
    positionTolerancePx: number;
    sizeTolerancePx: number;
    fontSizeTolerancePx: number;
    colorDeltaE: number;
    matchConfidenceMin: number;
    highConfidenceMin: number;
  };
  rules: Record<string, Severity | "ignore">;
  ignore: string[];
  criticalFigmaNodes: string[];
  capture: {
    timeoutMs: number;
    settleMs: number;
    waitForSelector?: string;
  };
}

export interface Issue {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  summary: string;
  expected?: string;
  actual?: string;
  suggestion: string;
  selector?: string;
  figmaNodeId?: string;
  confidence?: number;
  box?: Box;
  rule: string;
}

export interface AiAdvice {
  model?: string;
  summary: string;
  priorities: Array<{
    title: string;
    reason: string;
    action: string;
  }>;
}

export interface CompareReport {
  id: string;
  createdAt: string;
  durationMs: number;
  status: "passed" | "failed";
  summary: {
    errors: number;
    warnings: number;
    pending: number;
    similarity: number;
    matchedElements: number;
  };
  viewport: { width: number; height: number };
  source: {
    design: string;
    h5: string;
  };
  images: {
    reference: string;
    actual: string;
    diff: string;
  };
  issues: Issue[];
  rules: AcceptanceConfig;
  diagnostics: string[];
  aiAdvice?: AiAdvice;
  markdown: string;
  reportHtml: string;
}

export interface CompareError {
  error: string;
  details?: string;
}
