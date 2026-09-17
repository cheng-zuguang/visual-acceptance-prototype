import type {
  ActualEvidenceElement,
  DesignTruth,
  DesignTruthNode,
  MarketSemantic,
  MarketVariantDefinition,
  MarketVariantSignal,
  MarketVariantSummary
} from "../src/types";
import { localText, type Locale } from "./i18n";

export interface MarketVariantBinding {
  design: DesignTruthNode;
  actual: ActualEvidenceElement;
}

function flatten(root: DesignTruthNode): DesignTruthNode[] {
  const nodes: DesignTruthNode[] = [];
  const visit = (node: DesignTruthNode): void => {
    nodes.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

function semanticHint(value: string): MarketSemantic | undefined {
  const normalized = value.toLocaleLowerCase().replace(/\s+/g, "");
  if (/(上涨|看涨|升|向上|\bup\b|rise|rising|bull|positive)/i.test(normalized)) {
    return "market.up";
  }
  if (/(下跌|看跌|降|向下|\bdown\b|fall|falling|bear|negative)/i.test(normalized)) {
    return "market.down";
  }
  if (/(平盘|持平|不变|横线|\bflat\b|neutral|unchanged)/i.test(normalized)) {
    return "market.flat";
  }
  return undefined;
}

function textSign(value: string | undefined): MarketSemantic | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/[−–—]/g, "-").replace(/[,\s]/g, "");
  if (/^[¥￥$€£]?[+]/.test(normalized)) return "market.up";
  if (/^[¥￥$€£]?[-]/.test(normalized)) return "market.down";
  const number = Number(normalized.replace(/^[¥￥$€£]/, "").replace(/(?:%|‰|bp|bps)$/i, ""));
  return Number.isFinite(number) && number === 0 ? "market.flat" : undefined;
}

function firstColor(node: DesignTruthNode): string | undefined {
  if (node.style.color || node.style.backgroundColor) {
    return node.style.color ?? node.style.backgroundColor;
  }
  for (const child of node.children) {
    const color = firstColor(child);
    if (color) return color;
  }
  return undefined;
}

function firstIcon(node: DesignTruthNode): DesignTruthNode | undefined {
  for (const child of node.children) {
    if (
      ["VECTOR", "BOOLEAN_OPERATION", "LINE", "POLYGON", "STAR"].includes(child.type) ||
      /icon|arrow|triangle|图标|箭头|三角|横线/i.test(child.name)
    ) {
      return child;
    }
    const nested = firstIcon(child);
    if (nested) return nested;
  }
  return undefined;
}

function variantDefinition(
  node: DesignTruthNode,
  neutralIndex: number,
  locale: Locale
): MarketVariantDefinition | undefined {
  const componentSetId = node.component?.componentSetId;
  if (node.component?.kind !== "component" || !componentSetId) return undefined;
  const properties = node.component.variantProperties ?? {};
  const originalPropertyValue = Object.values(properties)[0] ?? node.name;
  const descendants = flatten(node);
  const propertyVote = semanticHint(
    [node.name, ...Object.entries(properties).flat()].join(" ")
  );
  const textVote = descendants.map((candidate) => textSign(candidate.text)).find(Boolean);
  const icon = firstIcon(node);
  const iconVote = icon ? semanticHint(icon.name) : undefined;
  const votes = [propertyVote, textVote, iconVote].filter(
    (vote): vote is MarketSemantic => Boolean(vote)
  );
  const semantic = (["market.up", "market.down", "market.flat"] as const).find(
    (candidate) => votes.filter((vote) => vote === candidate).length >= 2
  );
  const signals: MarketVariantSignal[] = [];
  if (propertyVote) signals.push("property-name");
  if (firstColor(node)) signals.push("color");
  if (iconVote) signals.push("icon-direction");
  if (textVote) signals.push("text-sign");
  const label = semantic ?? `variant-${String.fromCharCode(65 + neutralIndex)}`;
  return {
    componentSetId,
    variantNodeId: node.id,
    originalProperties: properties,
    originalPropertyValue,
    semantic: label,
    style: {
      ...node.style,
      color: node.style.color ?? firstColor(node)
    },
    box: node.box,
    icon: icon ? { name: icon.name, box: icon.relativeBox ?? icon.box } : undefined,
    evidence: {
      signals,
      reasons: [
        semantic
          ? localText(
              locale,
              `属性、示例符号和图标中至少两类证据一致指向 ${semantic}；颜色仅用于确认视觉状态。`,
              `At least two of property, sample-sign, and icon evidence agree on ${semantic}; color only identifies the visual state.`
            )
          : localText(
              locale,
              `只确认了视觉状态 ${label}，没有虚构涨跌语义。`,
              `Only visual state ${label} is established; no market direction is invented.`
            )
      ]
    }
  };
}

export function analyzeMarketVariants(
  design: DesignTruth,
  bindings: MarketVariantBinding[],
  actualElements: ActualEvidenceElement[],
  locale: Locale
): MarketVariantSummary {
  const nodes = flatten(design.root);
  let neutralIndex = 0;
  const catalog = nodes.flatMap((node) => {
    const definition = variantDefinition(node, neutralIndex, locale);
    if (!definition) return [];
    if (!definition.semantic.startsWith("market.")) neutralIndex += 1;
    return [definition];
  });
  const componentById = new Map(nodes.map((node) => [node.id, node]));
  const unresolved: MarketVariantSummary["unresolved"] = [];
  const matches = bindings.flatMap(({ design: designNode, actual }) => {
    if (designNode.component?.kind !== "instance") return [];
    const sourceComponent = designNode.component.componentId
      ? componentById.get(designNode.component.componentId)
      : undefined;
    const componentSetId = sourceComponent?.component?.componentSetId;
    const actualSemantic = textSign(actual.text);
    if (!actualSemantic) return [];
    const expected = catalog.find(
      (variant) =>
        variant.componentSetId === componentSetId &&
        variant.semantic === actualSemantic
    );
    if (!componentSetId || !expected) {
      unresolved.push({
        figmaNodeId: designNode.id,
        selector: actual.selector,
        actualSemantic,
        reason: localText(
          locale,
          "线上数值状态可识别，但设计侧缺少可验证的对应 Variant。",
          "The actual value state is recognizable, but no corresponding design-backed Variant can be verified."
        ),
        evidenceConfidence: {
          score: 0.68,
          level: "low",
          basis: ["exact-id", "market-format"],
          reasons: [
            localText(
              locale,
              "仅确认了当前数值符号和实例绑定，缺少设计侧 Variant 语义证据。",
              "Only the current value sign and instance binding are known; design-side Variant semantics are missing."
            )
          ]
        }
      });
      return [];
    }
    const actualIcon = actualElements.find((candidate) =>
      candidate.selector !== actual.selector &&
      (candidate.role === "img" || ["svg", "img"].includes(candidate.tag.toLocaleLowerCase())) &&
      candidate.box.x >= actual.box.x &&
      candidate.box.y >= actual.box.y &&
      candidate.box.x + candidate.box.width <= actual.box.x + actual.box.width &&
      candidate.box.y + candidate.box.height <= actual.box.y + actual.box.height
    );
    return [{
      figmaNodeId: designNode.id,
      selector: actual.selector,
      componentSetId,
      expectedVariantNodeId: expected.variantNodeId,
      originalPropertyValue: expected.originalPropertyValue,
      semantic: expected.semantic,
      evidence: expected.evidence,
      evidenceConfidence: {
        score: 0.96,
        level: "high" as const,
        basis: ["exact-id" as const, "structure-geometry" as const],
        reasons: expected.evidence.reasons
      },
      icon: expected.icon ? {
        expectedName: expected.icon.name,
        expectedBox: expected.icon.box,
        actualSelector: actualIcon?.selector,
        actualBox: actualIcon ? {
          x: actualIcon.box.x - actual.box.x,
          y: actualIcon.box.y - actual.box.y,
          width: actualIcon.box.width,
          height: actualIcon.box.height
        } : undefined
      } : undefined
    }];
  });
  return { catalog, matches, unresolved };
}
