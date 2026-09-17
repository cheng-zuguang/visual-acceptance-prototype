import type { ActualEvidence, ActualEvidenceElement, DesignTruthNode, AcceptanceConfig, PageAlignmentRegionDecision } from "../src/types";
import { coverageModuleTree, coverageModuleName } from "./design-coverage-modules";
import { scorePageAlignmentConfidence, pageAlignmentConfidenceLevel } from "./page-alignment-confidence";

const normalized = (value?: string) => (value ?? "").replace(/\s+/g, "").toLowerCase();
const flatten = (node: DesignTruthNode): DesignTruthNode[] => [node, ...node.children.flatMap(flatten)];
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Region identity is supported by independent stable descendants, never boxes alone. */
export function identifyReviewRegions(root: DesignTruthNode, evidence: ActualEvidence, config: AcceptanceConfig) {
  const tree = coverageModuleTree(root);
  const regions: PageAlignmentRegionDecision[] = [];
  const actual = evidence.samples[evidence.canonicalSampleIndex]?.elements ?? [];
  const bySelector = new Map(actual.map(element => [element.selector, element]));
  const nodes = flatten(tree);
  const stable = (element: ActualEvidenceElement) => evidence.samples.length >= 3 && evidence.samples.every(sample => {
    const observations = sample.elements.filter(item => item.fingerprint.key === element.fingerprint.key);
    return observations.length === 1 && normalized(observations[0].text) === normalized(element.text) &&
      JSON.stringify(observations[0].box) === JSON.stringify(element.box) && JSON.stringify(observations[0].style) === JSON.stringify(element.style);
  });
  const ancestors = (element: ActualEvidenceElement) => {
    const result: string[] = [], seen = new Set<string>();
    let selector = element.parentSelector;
    while (selector && !seen.has(selector)) { result.push(selector); seen.add(selector); selector = bySelector.get(selector)?.parentSelector; }
    return result;
  };
  const usedActual = new Set<string>();
  function visit(node: DesignTruthNode, path: string[]) {
    const nextPath = [...path, coverageModuleName(node)];
    if (node !== tree && node.box && node.children.length && node.box.width >= 40 && node.box.height >= 40) {
      const anchors = flatten(node).flatMap(design => {
        const text = normalized(design.text);
        if (!design.box || text.length < 2 || /\d|倒计时|countdown|carousel/.test(text)) return [];
        if (nodes.filter(item => normalized(item.text) === text).length !== 1) return [];
        const candidates = actual.filter(item => normalized(item.text) === text);
        return candidates.length === 1 && stable(candidates[0]) ? [{ design, actual: candidates[0] }] : [];
      });
      if (anchors.length >= 2) {
        const common = ancestors(anchors[0].actual).filter(selector => anchors.every(anchor => ancestors(anchor.actual).includes(selector)));
        const container = common.map(selector => bySelector.get(selector)!).find(element =>
          element.box.width / node.box!.width >= 0.5 && element.box.width / node.box!.width <= 2 &&
          element.box.height / node.box!.height >= 0.5 && element.box.height / node.box!.height <= 2 &&
          element.box.height < (root.box?.height ?? Infinity) * 0.95);
        const ancestorsAlreadyMatched = regions.filter(region =>
          flatten(nodes.find(item => item.id === region.designParentFigmaNodeId)!).some(item => item.id === node.id));
        if (container && !usedActual.has(container.selector) && ancestorsAlreadyMatched.every(region =>
          ancestors(container).includes(region.actualParentSelector!))) {
          const headings = anchors.filter(anchor => anchor.design.box!.y < node.box!.y + Math.min(40, node.box!.height * 0.2));
          const structural = stable(container) && headings.length ? [{ design: node, actual: container }, ...headings] : [];
          const displacementAnchors = structural.length >= 2 ? structural : anchors;
          const offsets = displacementAnchors.map(anchor => ({ x: anchor.actual.box.x - anchor.design.box!.x, y: anchor.actual.box.y - anchor.design.box!.y }));
          const consensus = offsets.map(seed => offsets.filter(offset => Math.hypot(offset.x - seed.x, offset.y - seed.y) <= config.thresholds.positionTolerancePx))
            .sort((a, b) => b.length - a.length)[0];
          const displacement = consensus.length >= 2 && consensus.length > displacementAnchors.length / 2
            ? { x: median(consensus.map(item => item.x)), y: median(consensus.map(item => item.y)) } : undefined;
          const residualPx = displacement ? Math.sqrt(consensus.reduce((sum, item) => sum + (item.x - displacement.x) ** 2 + (item.y - displacement.y) ** 2, 0) / consensus.length) : null;
          const anchorStats = { candidateCount: displacementAnchors.length, stableCount: displacementAnchors.length, dynamicExcludedCount: 0,
            structuralAnchorCount: structural.length,
            inlierCount: consensus.length, residualPx };
          const scoreBreakdown = scorePageAlignmentConfidence({ baseScore: 0.97, anchorStats, eligibleAnchorCount: displacementAnchors.length,
            positionTolerancePx: config.thresholds.positionTolerancePx, config: config.pageAlignment.confidence });
          regions.push({ designParentFigmaNodeId: node.id, designPath: nextPath, status: "matched", actualParentSelector: container.selector,
            ...(displacement ? { displacement } : {}), source: "deterministic", confidence: 0.95,
            reason: `Stable descendant anchors: ${anchors.map(anchor => anchor.design.text).join(" / ")}`,
            anchorStats, scoreBreakdown,
            evidenceConfidence: { score: scoreBreakdown.finalScore, level: pageAlignmentConfidenceLevel(scoreBreakdown.finalScore, config.pageAlignment.confidence.levels),
              basis: ["stable-text", "structure-geometry", "temporal-consistency"], reasons: [`${anchors.length} unique stable descendants share this actual container.`] } });
          usedActual.add(container.selector);
        }
      }
    }
    node.children.forEach(child => visit(child, nextPath));
  }
  visit(tree, []);
  return { tree, regions };
}
