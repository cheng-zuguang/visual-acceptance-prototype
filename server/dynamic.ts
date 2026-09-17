import type {
  ActualEvidenceElement,
  AgentHypothesis,
  AgentHypothesisOutcome,
  AgentHypothesisRequest,
  Box,
  DynamicRegion,
  DynamicNormalizationSummary,
  EvidenceConfidence,
  LiveActualEvidence
} from "../src/types";
import { localText, type Locale } from "./i18n";

export interface DynamicCandidateBinding {
  figmaNodeId: string;
  designName: string;
  designText?: string;
  designContextTexts: string[];
  actualContextTexts: string[];
  designBox: Box;
  actual: ActualEvidenceElement;
  matchMethod: "exact-id" | "stable-text" | "structure-geometry" | "visual-inference" | "verified-region" | "verified-template";
}

type DetectedNormalization = Omit<DynamicNormalizationSummary, "stableSimilarity">;
type DynamicBindingBasis = "exact-id" | "structure-geometry" | "visual-inference";

export type DynamicHypothesisAgent = (
  request: AgentHypothesisRequest
) => Promise<unknown>;

function evidenceBasisForBinding(binding: DynamicCandidateBinding): DynamicBindingBasis {
  if (binding.matchMethod === "exact-id") return "exact-id";
  if (binding.matchMethod === "visual-inference") return "visual-inference";
  return "structure-geometry";
}

function isMarketValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .trim()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "");
  return /^(?:[¥￥$€£]|HK\$)?[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:%|‰|bp|bps|[KMBT]|万(?:手|股|元)?|亿(?:手|股|元)?|手|股|元)?$/i.test(normalized);
}

function isMarketLikeValue(value: string | undefined): boolean {
  if (!value) return false;
  if (isMarketValue(value)) return true;
  return /^\s*[¥￥$€£]?[+-]?\d[\d,.]*\s*(?:%|‰|点|倍|元|万|亿|手|股|bps?|K|M|B|T)?\s*(?:[-–—~～]\s*[¥￥$€£]?[+-]?\d[\d,.]*\s*(?:%|‰|点|倍|元|万|亿|手|股|bps?|K|M|B|T)?)?\s*$/i.test(value);
}

function hasMarketSemantics(name: string): boolean {
  return /价|率|行情|指数|收益|利率|资产|负债|市值|成交|价格|涨跌|幅|price|rate|index|yield|market|change/i.test(name);
}

function semanticContext(binding: DynamicCandidateBinding): string {
  return [binding.designName, ...binding.designContextTexts, ...binding.actualContextTexts].join(" ");
}

function isCountdownValue(value: string | undefined): boolean {
  if (!value) return false;
  return /^\s*\d+\s*(?:天|日|小时|时|分钟|分|秒|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\s*$/i.test(value);
}

function dateTemplate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let found = false;
  const template = value.replace(/(?:\d{4}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*日?|\d{1,2}\s*月\s*\d{1,2}\s*日|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g, () => { found = true; return "{value}"; });
  return found ? template.replace(/\s+/g, "").replace(/：/g, ":").toLowerCase() : undefined;
}
function isDateTimeValue(value: string | undefined): boolean { return dateTemplate(value) !== undefined; }
function sameDateField(expected: string | undefined, actual: string | undefined): boolean {
  return isDateTimeValue(expected) && dateTemplate(expected) === dateTemplate(actual);
}

function isProbabilityValue(value: string | undefined): boolean {
  if (!value) return false;
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*%$/);
  if (!match) return false;
  const numeric = Number(match[1]);
  return numeric >= 0 && numeric <= 100;
}

export function isPotentialDynamicTextPair(input: {
  designName: string;
  designContextTexts?: string[];
  designText?: string;
  actualText?: string;
}): boolean {
  const context = [input.designName, ...(input.designContextTexts ?? [])].join(" ");
  if (sameDateField(input.designText, input.actualText)) return true;
  if (
    /概率|可能性|probab|chance|likelihood/i.test(context) &&
    isProbabilityValue(input.designText) &&
    isProbabilityValue(input.actualText)
  ) {
    return true;
  }
  if (
    hasMarketSemantics(context) &&
    isMarketLikeValue(input.designText) &&
    isMarketLikeValue(input.actualText)
  ) {
    return true;
  }
  return /倒计时|countdown|(?:^|\s)(?:天|日|小时|时|分钟|分|秒)(?:\s|$)/i.test(context) &&
    /^\s*\d+\s*$/.test(input.designText ?? "") &&
    /^\s*\d+\s*$/.test(input.actualText ?? "");
}

const strategyForKind = {
  "market-value": "normalize-market-value-text",
  "date-time": "normalize-date-time-text",
  countdown: "normalize-countdown-text",
  probability: "normalize-probability-text"
} as const;

function isCountdownForBinding(binding: DynamicCandidateBinding, value: string | undefined): boolean {
  return isCountdownValue(value) || (
    /倒计时|countdown|(?:^|\s)(?:天|日|小时|时|分钟|分|秒)(?:\s|$)/i.test(semanticContext(binding)) &&
    /^\s*\d+\s*$/.test(value ?? "")
  );
}

function isSupportedStableCandidate(
  binding: DynamicCandidateBinding,
  observedTexts: string[]
): boolean {
  if (observedTexts.length > 0 && observedTexts.every(value => sameDateField(binding.designText, value))) return true;
  if (
    /概率|可能性|probab|chance|likelihood/i.test(semanticContext(binding)) &&
    isProbabilityValue(binding.designText) &&
    observedTexts.every(isProbabilityValue)
  ) return true;
  if (
    hasMarketSemantics(semanticContext(binding)) &&
    isMarketLikeValue(binding.designText) &&
    observedTexts.every(isMarketLikeValue)
  ) return true;
  return isCountdownForBinding(binding, binding.designText) &&
    observedTexts.every((value) => isCountdownForBinding(binding, value));
}

function verifiesDynamicKind(
  hypothesis: AgentHypothesis,
  binding: DynamicCandidateBinding,
  observedTexts: string[]
): boolean {
  if (hypothesis.strategy !== strategyForKind[hypothesis.candidateType]) return false;
  if (hypothesis.candidateType === "countdown") {
    return isCountdownForBinding(binding, binding.designText) &&
      observedTexts.every((value) => isCountdownForBinding(binding, value));
  }
  if (hypothesis.candidateType === "date-time") {
    return observedTexts.length > 0 && observedTexts.every(value => sameDateField(binding.designText, value));
  }
  if (hypothesis.candidateType === "probability") {
    return /概率|可能性|probab|chance|likelihood/i.test(semanticContext(binding)) &&
      isProbabilityValue(binding.designText) &&
      observedTexts.every(isProbabilityValue);
  }
  if (hypothesis.candidateType === "market-value") {
    return hasMarketSemantics(semanticContext(binding)) &&
      isMarketLikeValue(binding.designText) &&
      observedTexts.every(isMarketLikeValue);
  }
  return false;
}

function clippedArea(box: Box, viewport: { width: number; height: number }): number {
  const left = Math.max(0, box.x);
  const top = Math.max(0, box.y);
  const right = Math.min(viewport.width, box.x + box.width);
  const bottom = Math.min(viewport.height, box.y + box.height);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function confidenceFor(
  binding: DynamicCandidateBinding,
  locale: Locale
): EvidenceConfidence {
  const visual = binding.matchMethod === "visual-inference";
  return {
    score: binding.matchMethod === "exact-id" ? 0.97 : visual ? 0.82 : 0.92,
    level: visual ? "medium" : "high",
    basis: [
      evidenceBasisForBinding(binding),
      "temporal-consistency",
      "market-format"
    ],
    reasons: [
      localText(
        locale,
        "至少三个样本中元素身份、几何和样式稳定，只有行情数值文字变化。",
        "Across at least three samples, element identity, geometry, and style stay stable while only market-value text changes."
      ),
      localText(
        locale,
        "数值格式仅作为时间一致性与元素绑定之外的辅助证据。",
        "The numeric format is supporting evidence in addition to temporal consistency and element binding."
      )
    ]
  };
}

export function detectMarketValueNormalization(
  evidence: LiveActualEvidence,
  bindings: DynamicCandidateBinding[],
  viewport: { width: number; height: number },
  locale: Locale
): DetectedNormalization {
  if (evidence.samples.length < 3) {
    return {
      dynamicRegionAreaRatio: 0,
      strategies: [],
      regions: [],
      agentHypotheses: []
    };
  }

  const changes = new Map(
    evidence.elementChanges.map((change) => [change.fingerprintKey, change])
  );
  const regions = bindings.flatMap((binding) => {
    const change = changes.get(binding.actual.fingerprint.key);
    if (
      !change ||
      !change.presentInAllSamples ||
      change.observedSampleIndexes.length < 3 ||
      !change.textChanged ||
      change.geometryChanged ||
      change.styleChanged ||
      change.observedTexts.length < 2 ||
      !change.observedTexts.every(isMarketValue) ||
      !isMarketValue(binding.designText) ||
      !hasMarketSemantics(semanticContext(binding))
    ) {
      return [];
    }

    return [{
      kind: "market-value" as const,
      strategy: "normalize-market-value-text" as const,
      source: "deterministic" as const,
      normalizedProperties: ["text"] as ["text"],
      figmaNodeId: binding.figmaNodeId,
      fingerprintKey: binding.actual.fingerprint.key,
      selector: binding.actual.selector,
      designBox: binding.designBox,
      actualBox: binding.actual.box,
      sampleCount: change.observedSampleIndexes.length,
      evidenceConfidence: confidenceFor(binding, locale)
    }];
  });
  const pageArea = Math.max(1, viewport.width * viewport.height);
  const dynamicArea = regions.reduce(
    (sum, region) => sum + clippedArea(region.actualBox, viewport),
    0
  );

  return {
    dynamicRegionAreaRatio: Math.min(1, dynamicArea / pageArea),
    strategies: regions.length ? ["normalize-market-value-text"] : [],
    regions,
    agentHypotheses: []
  };
}

function readHypothesis(value: unknown): AgentHypothesis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const binding = record.binding;
  const reasons = record.reasons;
  const properties = record.normalizedProperties;
  if (
    !Object.hasOwn(strategyForKind, String(record.candidateType)) ||
    !Object.values(strategyForKind).includes(record.strategy as never) ||
    !binding ||
    typeof binding !== "object" ||
    typeof (binding as Record<string, unknown>).figmaNodeId !== "string" ||
    typeof (binding as Record<string, unknown>).fingerprintKey !== "string" ||
    !Array.isArray(properties) ||
    properties.length !== 1 ||
    properties[0] !== "text" ||
    !Array.isArray(reasons) ||
    reasons.length === 0 ||
    reasons.some((reason) => typeof reason !== "string" || !reason.trim())
  ) {
    return undefined;
  }
  return value as AgentHypothesis;
}

function hypothesisRequest(
  binding: DynamicCandidateBinding,
  change: LiveActualEvidence["elementChanges"][number],
  locale: Locale,
  conflict?: string
): AgentHypothesisRequest {
  return {
    locale,
    candidate: {
      design: {
        figmaNodeId: binding.figmaNodeId,
        name: binding.designName,
        text: binding.designText,
        contextTexts: binding.designContextTexts,
        box: binding.designBox
      },
      actual: {
        fingerprintKey: binding.actual.fingerprint.key,
        selector: binding.actual.selector,
        observedTexts: change.observedTexts,
        contextTexts: binding.actualContextTexts,
        box: binding.actual.box
      },
      observations: {
        sampleCount: change.observedSampleIndexes.length,
        presentInAllSamples: change.presentInAllSamples,
        textChanged: change.textChanged,
        geometryChanged: change.geometryChanged,
        styleChanged: change.styleChanged
      }
    },
    ...(conflict ? { conflict } : {})
  };
}

function hypothesisConflict(
  hypothesis: AgentHypothesis,
  binding: DynamicCandidateBinding
): string | undefined {
  if (hypothesis.binding.figmaNodeId !== binding.figmaNodeId) {
    return "figmaNodeId does not match the declared candidate";
  }
  if (hypothesis.binding.fingerprintKey !== binding.actual.fingerprint.key) {
    return "fingerprintKey does not match the declared candidate";
  }
  return undefined;
}

export async function resolveDynamicNormalization(
  evidence: LiveActualEvidence,
  bindings: DynamicCandidateBinding[],
  viewport: { width: number; height: number },
  locale: Locale,
  agent?: DynamicHypothesisAgent
): Promise<DetectedNormalization> {
  const deterministic = detectMarketValueNormalization(
    evidence,
    bindings,
    viewport,
    locale
  );
  if (evidence.samples.length >= 3) {
    for (const binding of bindings) {
      if (binding.matchMethod !== "exact-id" && binding.matchMethod !== "stable-text" && binding.matchMethod !== "verified-template") continue;
      if (evidence.elementChanges.some(change => change.fingerprintKey === binding.actual.fingerprint.key &&
        (change.geometryChanged || change.styleChanged))) continue;
      if (deterministic.regions.some(region => region.fingerprintKey === binding.actual.fingerprint.key)) continue;
      const observations = evidence.samples.map(sample => sample.elements.filter(element => element.fingerprint.key === binding.actual.fingerprint.key));
      if (observations.some(elements => elements.length !== 1)) continue;
      const elements = observations.map(items => items[0]);
      if (elements.some(element => JSON.stringify(element.box) !== JSON.stringify(elements[0].box) ||
        JSON.stringify(element.style) !== JSON.stringify(elements[0].style))) continue;
      const kind = (["date-time", "probability", "countdown", "market-value"] as const).find(candidateType =>
        verifiesDynamicKind({ candidateType, strategy: strategyForKind[candidateType] } as AgentHypothesis, binding, elements.map(element => element.text ?? "")));
      if (!kind) continue;
      const strategy = strategyForKind[kind];
      deterministic.regions.push({ kind, strategy, source: "deterministic", normalizedProperties: ["text"],
        figmaNodeId: binding.figmaNodeId, fingerprintKey: binding.actual.fingerprint.key, selector: binding.actual.selector,
        designBox: binding.designBox, actualBox: binding.actual.box, sampleCount: elements.length,
        evidenceConfidence: { score: 0.95, level: "high", basis: [evidenceBasisForBinding(binding), "semantic-format", "temporal-consistency"],
          reasons: [localText(locale, "已验证字段对应及设计/实际语义格式，至少三帧身份、几何和样式稳定；不要求值发生变化。",
            "Verified field correspondence and design/actual semantic format with stable identity, geometry and style across at least three samples; changing values are not required.")] } });
    }
    deterministic.strategies = [...new Set(deterministic.regions.map(region => region.strategy))];
    deterministic.dynamicRegionAreaRatio = Math.min(1, deterministic.regions.reduce((sum, region) => sum + clippedArea(region.actualBox, viewport), 0) / Math.max(1, viewport.width * viewport.height));
  }
  if (!agent || evidence.samples.length < 3) return deterministic;

  const normalizedKeys = new Set(
    deterministic.regions.map((region) => region.fingerprintKey)
  );
  const changes = new Map(
    evidence.elementChanges.map((change) => [change.fingerprintKey, change])
  );
  const agentRegions: DynamicRegion[] = [];
  const outcomes: AgentHypothesisOutcome[] = [];

  for (const binding of bindings) {
    if (normalizedKeys.has(binding.actual.fingerprint.key)) continue;
    const change = changes.get(binding.actual.fingerprint.key);
    if (
      !change ||
      !change.presentInAllSamples ||
      change.observedSampleIndexes.length < 3 ||
      change.geometryChanged ||
      change.styleChanged ||
      (!change.textChanged && binding.designText?.trim() === binding.actual.text?.trim()) ||
      (!change.textChanged && !isSupportedStableCandidate(binding, change.observedTexts))
    ) {
      continue;
    }

    let attempts = 1;
    let firstResponse: unknown;
    try {
      firstResponse = await agent(hypothesisRequest(binding, change, locale));
    } catch (error) {
      outcomes.push({
        figmaNodeId: binding.figmaNodeId,
        fingerprintKey: binding.actual.fingerprint.key,
        status: "pending",
        attempts,
        reason: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    let hypothesis = readHypothesis(firstResponse);
    if (!hypothesis) {
      outcomes.push({
        figmaNodeId: binding.figmaNodeId,
        fingerprintKey: binding.actual.fingerprint.key,
        status: "pending",
        attempts,
        reason: "AgentHypothesis Schema validation failed"
      });
      continue;
    }
    let conflict = hypothesisConflict(hypothesis, binding);
    if (!conflict && !verifiesDynamicKind(hypothesis, binding, change.observedTexts)) {
      conflict = "candidateType or strategy is not supported by the deterministic evidence";
    }
    if (conflict) {
      attempts = 2;
      let correctionResponse: unknown;
      try {
        correctionResponse = await agent(
          hypothesisRequest(binding, change, locale, conflict)
        );
      } catch (error) {
        outcomes.push({
          figmaNodeId: binding.figmaNodeId,
          fingerprintKey: binding.actual.fingerprint.key,
          status: "pending",
          attempts,
          hypothesis,
          reason: error instanceof Error ? error.message : String(error)
        });
        continue;
      }
      hypothesis = readHypothesis(correctionResponse);
      if (!hypothesis) {
        outcomes.push({
          figmaNodeId: binding.figmaNodeId,
          fingerprintKey: binding.actual.fingerprint.key,
          status: "pending",
          attempts,
          reason: "Corrected AgentHypothesis Schema validation failed"
        });
        continue;
      }
      conflict = hypothesisConflict(hypothesis, binding);
      if (!conflict && !verifiesDynamicKind(hypothesis, binding, change.observedTexts)) {
        conflict = "candidateType or strategy is not supported by the deterministic evidence";
      }
    }
    if (conflict) {
      outcomes.push({
        figmaNodeId: binding.figmaNodeId,
        fingerprintKey: binding.actual.fingerprint.key,
        status: "pending",
        attempts,
        hypothesis,
        reason: conflict
      });
      continue;
    }

    const visual = binding.matchMethod === "visual-inference";
    const evidenceConfidence: EvidenceConfidence = {
      score: binding.matchMethod === "exact-id" ? 0.95 : visual ? 0.82 : 0.9,
      level: visual ? "medium" : "high",
      basis: [
        evidenceBasisForBinding(binding),
        ...(change.textChanged ? ["temporal-consistency" as const] : ["semantic-format" as const]),
        "agent-hypothesis"
      ],
      reasons: [
        localText(
          locale,
          change.textChanged
            ? "Agent 只提出候选；确定性验证确认至少三帧内元素身份、几何和样式稳定且文字变化。"
            : "Agent 只提出候选；确定性验证确认设计值与实际值属于同一动态语义格式，且至少三帧内元素身份、几何和样式稳定。",
          change.textChanged
            ? "The Agent only proposed the candidate; deterministic verification confirmed stable identity, geometry, and style with changing text across at least three frames."
            : "The Agent only proposed the candidate; deterministic verification confirmed matching dynamic semantic formats in design and actual values with stable identity, geometry, and style across at least three frames."
        )
      ]
    };
    agentRegions.push({
      kind: hypothesis.candidateType,
      strategy: hypothesis.strategy,
      source: "agent-verified",
      normalizedProperties: ["text"],
      figmaNodeId: binding.figmaNodeId,
      fingerprintKey: binding.actual.fingerprint.key,
      selector: binding.actual.selector,
      designBox: binding.designBox,
      actualBox: binding.actual.box,
      sampleCount: change.observedSampleIndexes.length,
      evidenceConfidence
    });
    outcomes.push({
      figmaNodeId: binding.figmaNodeId,
      fingerprintKey: binding.actual.fingerprint.key,
      status: attempts === 1 ? "verified" : "corrected",
      attempts,
      hypothesis,
      reason: evidenceConfidence.reasons[0]
    });
  }

  const regions = [...deterministic.regions, ...agentRegions];
  const pageArea = Math.max(1, viewport.width * viewport.height);
  const dynamicArea = regions.reduce(
    (sum, region) => sum + clippedArea(region.actualBox, viewport),
    0
  );
  return {
    dynamicRegionAreaRatio: Math.min(1, dynamicArea / pageArea),
    strategies: [...new Set(regions.map((region) => region.strategy))],
    regions,
    agentHypotheses: outcomes
  };
}
