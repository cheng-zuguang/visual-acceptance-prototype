import type { ActualEvidence, DesignCoverage, DesignTruth, DesignTruthNode, EvidenceConfidence, ReviewIssue, PageAlignmentRegionDecision } from "../src/types";
import { coverageModuleName, coverageModuleTree } from "./design-coverage-modules";

/** Total design-side accounting, independent of Agent candidate budgets. */
export function evaluateDesignCoverage(input: {
  design: DesignTruth;
  matches: Array<{ figmaNodeId: string; selector: string; method: string }>;
  issues: ReviewIssue[];
  findings?: Array<{ id: string; figmaNodeId?: string }>;
  locale: "zh-CN" | "en";
  evidence: ActualEvidence;
  dynamicNodeIds?: string[];
  verifiedRegions?: PageAlignmentRegionDecision[];
  positionTolerancePx?: number;
}): { coverage: DesignCoverage; issues: ReviewIssue[] } {
  const matched = new Map(input.matches.filter(match =>
    match.method === "exact-id" || match.method === "stable-text" || match.method === "verified-template" || match.method === "verified-region")
    .map(match => [match.figmaNodeId, match.selector]));
  const coverage: DesignCoverage = { policy: "design-driven", items: [] };
  const issues: ReviewIssue[] = [];
  const en = input.locale === "en";
  const samples = input.evidence.kind === "live" ? input.evidence.samples : [];
  const descendants = (node: DesignTruthNode): DesignTruthNode[] => [node, ...node.children.flatMap(descendants)];
  const reviewTree = coverageModuleTree(input.design.root);
  const designNodes = descendants(reviewTree);
  const ownsUnrelatedLimitation = (node: DesignTruthNode, selector: string) => designNodes.some(owner => {
    const binding = matched.get(owner.id);
    return owner.id !== input.design.root.id && (/^(FRAME|GROUP|COMPONENT|INSTANCE)$/.test(owner.type) ||
      input.matches.some(match => match.figmaNodeId === owner.id && match.method === "verified-region")) &&
      binding && (selector === binding || selector.startsWith(`${binding} > `)) &&
      (!owner.box || !node.box || owner.box.x + owner.box.width <= node.box.x || node.box.x + node.box.width <= owner.box.x ||
        owner.box.y + owner.box.height <= node.box.y || node.box.y + node.box.height <= owner.box.y) &&
      !descendants(owner).some(item => item.id === node.id) &&
      !descendants(node).some(item => item.id === owner.id);
  });
  coverage.captureSamples = samples.map(sample => ({ index: sample.index, coverage: sample.coverage }));
  const completeFor = (node: DesignTruthNode) => samples.length >= 3 && samples.every(sample => {
    const scope = sample.coverage;
    if (!scope || scope.elementLimitReached || scope.opaqueContent || scope.excludedContent) return false;
    if (scope.fullDocument) return true;
    // A bounded leaf clip or a limitation inside a verified, unrelated structural
    // counterpart cannot hide this module. Unknown ownership remains unsearched.
    return scope.documentBoundsComplete && scope.limitations && scope.limitations.length > 0 &&
      scope.limitations.every(limit => ownsUnrelatedLimitation(node, limit.selector) ||
        (node.box && limit.reason === "text-clipping" &&
        limit.box.width < node.box.width && limit.box.height < node.box.height));
  });
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const originalParents = new Map(descendants(input.design.root).flatMap(node => node.children.map(child => [child.id, node.id] as const)));
  // Absence is supported by multiple static labels, not model prose, coordinates,
  // numeric values, or a single changed title. Ambiguous content stays unverified.
  function absenceEvidence(node: DesignTruthNode): DesignCoverage["items"][number]["absenceEvidence"] {
    if (!completeFor(node)) return undefined;
    const nodes = descendants(node);
    if (nodes.some(item => matched.has(item.id))) return undefined;
    const gap = layoutGapEvidence(node);
    if (gap) return gap;
    if (nodes.some(item => input.dynamicNodeIds?.includes(item.id) ||
      /热点|资讯|新闻|news|列表|倒计时|日期|轮播|carousel|countdown/i.test(item.name))) return undefined;
    if (nodes.some(item => matched.has(item.id))) return undefined;
    const labels = [...new Set(nodes.flatMap(item => {
      if (item.type !== "TEXT" || !item.text) return [];
      const dateLabel = item.text.match(/^([^0-9:：]{2,16})[:：]\s*\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?(?:\s+\d{1,2}:\d{2})?\s*$/)?.[1];
      const label = dateLabel ?? item.text;
      if ((!dateLabel && /[0-9%％]|倒计时|最新价|实时|快讯|新闻|news|carousel|countdown/i.test(`${item.name} ${label}`)) || normalize(label).length < 4 || normalize(label).length > 32) return [];
      return [normalize(label)];
    }))];
    const absent = labels.length >= 2 && samples.every(sample => labels.every(label =>
      !sample.elements.some(element => {
        if (ownsUnrelatedLimitation(node, element.selector)) return false;
        const text = normalize(element.text ?? "");
        return text && (text.includes(label) || label.includes(text));
      })
    ));
    return absent ? { staticLabels: labels, sampleIndexes: samples.map(sample => sample.index) } : undefined;
  }
  function layoutGapEvidence(node: DesignTruthNode): DesignCoverage["items"][number]["absenceEvidence"] {
    const parent = descendants(reviewTree).find(item => item.children.some(child => child.id === node.id));
    if (!node.box || !parent) return undefined;
    const siblings = parent.children.filter(item => item.box && item.children.length && item.box.width >= node.box!.width * 0.7)
      .sort((a, b) => a.box!.y - b.box!.y);
    const index = siblings.findIndex(item => item.id === node.id);
    const verified = (item: DesignTruthNode) => input.verifiedRegions?.find(region => region.designParentFigmaNodeId === item.id && region.status === "matched" &&
      region.displacement && region.evidenceConfidence.level === "high" && region.anchorStats.stableCount >= 2 && region.anchorStats.inlierCount >= 2);
    const before = siblings.slice(0, index).reverse().find(item => verified(item));
    const after = siblings.slice(index + 1).find(item => verified(item));
    if (!before || !after) return undefined;
    const chain = siblings.slice(siblings.indexOf(before) + 1, siblings.indexOf(after));
    if (!chain.length || chain.some(item => !completeFor(item) || descendants(item).some(child => matched.has(child.id)))) return undefined;
    const tolerance = input.positionTolerancePx ?? 4;
    const sequence = [before, ...chain, after];
    if (sequence.some((item, i) => i > 0 && (item.box!.y < sequence[i - 1].box!.y + sequence[i - 1].box!.height - tolerance ||
      Math.min(item.box!.x + item.box!.width, before.box!.x + before.box!.width) - Math.max(item.box!.x, before.box!.x) < item.box!.width * 0.7))) return undefined;
    const labels = chain.flatMap(item => {
      const heading = descendants(item).filter(child => child.text && child.box && child.box.y <= item.box!.y + Math.min(40, item.box!.height * 0.25) &&
        !/[0-9%％]/.test(child.text) && normalize(child.text).length >= 2 && normalize(child.text).length <= 32).sort((a, b) => a.box!.y - b.box!.y)[0];
      return heading?.text ? [normalize(heading.text)] : [];
    });
    if (labels.length !== chain.length || samples.some(sample => sample.elements.some(element => !ownsUnrelatedLimitation(node, element.selector) && labels.some(label => normalize(element.text ?? "").length <= label.length * 2 && normalize(element.text ?? "").includes(label))))) return undefined;
    const preceding = verified(before)!, following = verified(after)!;
    const actualBefore = samples[0]?.elements.find(element => element.selector === preceding.actualParentSelector);
    if (!actualBefore || Math.abs(actualBefore.box.height - before.box!.height) > tolerance || Math.abs(preceding.displacement!.x - following.displacement!.x) > tolerance) return undefined;
    const expectedRemovalPx = after.box!.y - chain[0].box!.y;
    const measuredRemovalPx = preceding.displacement!.y - following.displacement!.y;
    const residualPx = Math.abs(expectedRemovalPx - measuredRemovalPx);
    if (measuredRemovalPx <= 0 || residualPx > Math.max(tolerance, expectedRemovalPx * 0.15)) return undefined;
    const affectedRegionIds = siblings.slice(siblings.indexOf(after)).filter(item => {
      const region = verified(item); return region && Math.abs(region.displacement!.y - following.displacement!.y) <= tolerance;
    }).map(item => item.id);
    return { staticLabels: labels, sampleIndexes: samples.map(sample => sample.index), layoutGap: {
      precedingRegionId: before.id, followingRegionId: after.id, missingRegionIds: chain.map(item => item.id), affectedRegionIds,
      expectedRemovalPx, measuredRemovalPx, residualPx
    } };
  }
  function visit(node: DesignTruthNode, parentId: string, inherited?: string): void {
    const complete = completeFor(node);
    const name = coverageModuleName(node);
    const selector = matched.get(node.id);
    const sourceIds = new Set(input.findings?.filter(finding => finding.figmaNodeId === node.id).map(finding => finding.id));
    const existing = input.issues.filter(issue => issue.figmaNodeId === node.id || issue.evidence.some(evidence => sourceIds.has(evidence.sourceIssueId)));
    const hasMatchedDescendants = node.children.some(child => descendants(child).some(item => matched.has(item.id)));
    const module = node.box && input.design.root.box && node.children.length > 0 && node.box.width >= input.design.root.box.width * 0.7 &&
      node.box.height >= 60 && node.box.height < input.design.root.box.height * 0.8;
    const structuralOnly = !selector && hasMatchedDescendants && Object.keys(node.style).length === 0;
    const owner = selector ? undefined : inherited;
    const published = existing.find(issue => issue.rule === "missing_module" || issue.rule === "design_coverage_unverified");
    const absence = !selector && !owner ? absenceEvidence(node) : undefined;
    const missing = published?.rule === "missing_module" || Boolean(absence);
    const id = published?.id ?? `${missing ? "missing-module:coverage" : "coverage"}:${node.id}`;
    coverage.items.push({
      figmaNodeId: node.id, parentFigmaNodeId: originalParents.get(node.id) ?? parentId, name,
      nodeType: node.type, originalName: node.name, groupedParentFigmaNodeId: parentId,
      designBox: node.box,
      ...(absence ? { absenceEvidence: absence } : {}),
      status: selector ? "matched" : structuralOnly ? "structural-only" : owner ? "covered-by-parent" : missing ? "missing" : "unverified",
      reasonCode: selector ? "verified-binding" : structuralOnly ? "descendant-bindings" : owner ? "parent-finding" : missing ? "static-module-absent" : complete ? "correspondence-unresolved" : "scope-incomplete",
      ...(selector ? { selector } : {}), ...(owner ? { coveredBy: owner } : {}),
      issueIds: selector || structuralOnly ? existing.map(issue => issue.id) : [owner ?? id]
    });
    if (!selector && !owner && !structuralOnly && !published) {
      const title = missing ? (en ? `${name}: missing module` : `${name} 模块缺失`) : module && !hasMatchedDescendants
        ? (en ? `${name}: suspected missing module (verify)` : `${name} 模块疑似缺失（待核验）`)
        : (en ? `${name}: design coverage unverified` : `${name} 设计覆盖未能验证`);
      const gap = absence?.layoutGap;
      const summary = gap ? (en ? `Static heading absent across complete captures. Stable bracketing regions verify ${gap.measuredRemovalPx}px removed space (expected ${gap.expectedRemovalPx}px; residual ${gap.residualPx}px), affecting ${gap.affectedRegionIds.join(", ")}.` : `完整采样中静态标题均不存在；前后稳定区域验证缺失链造成 ${gap.measuredRemovalPx}px 空间收缩（预期 ${gap.expectedRemovalPx}px，残差 ${gap.residualPx}px），影响区域：${gap.affectedRegionIds.join("、")}。`)
        : missing ? (en ? "Multiple static labels are absent across complete captures; no descendant has a verified counterpart." : "多次完整采集均未发现该区域的多项静态标识，且没有子元素取得有效对应证据。") : (en ? "No verified actual counterpart. Missing content cannot be inferred from failed matching alone." : "尚未找到经验证的实际对应块；不能仅凭匹配失败认定缺失。");
      const suggestion = missing ? (en ? "Restore this module and its visual structure according to Figma." : "按 Figma 补齐该模块及其视觉结构，再复核样式。") : module
        ? (en ? `Locate ${name} in the actual page; restore it only after confirming absence. If present, verify its internal structure and styles.` : `核查实际页面是否存在「${name}」模块；确认缺失后按设计补齐，若已存在则核对其内部结构与样式。`)
        : (en ? "Verify this design region against a complete actual capture; review its structure and styles after establishing correspondence." : "补充或核查该设计区域的完整实际证据，确认对应关系后检查结构和样式。");
      const confidence: EvidenceConfidence = { score: missing ? 0.9 : 0, level: missing ? "high" : "low", basis: missing ? ["dom-audit", "stable-text", "temporal-consistency"] : [], reasons: [summary,
        ...(absence ? [`${absence.staticLabels.join(" / ")} · samples: ${absence.sampleIndexes.join(", ")}`] : [])] };
      const rule = missing ? "missing_module" : "design_coverage_unverified";
      issues.push({ id, rule, category: en ? "Design coverage" : "设计覆盖", severity: missing ? "error" : "pending", priority: missing ? "P1" : "Pending", title, summary, suggestion, primaryAction: suggestion,
        ...(module ? { coverageModule: { id: node.id, name, nodeIds: descendants(node).map(item => item.id) } } : {}),
        ...(absence ? { expected: absence.staticLabels.join(" / "), actual: en ? "Absent in every complete capture" : "全部完整采样中未找到" } : {}),
        figmaNodeId: node.id, designBox: node.box, evidenceConfidence: confidence,
        location: { figmaNodeId: node.id, designBox: node.box, description: name },
        evidence: [{ sourceIssueId: id, rule, category: en ? "Design coverage" : "设计覆盖", summary, designBox: node.box, evidenceConfidence: confidence }]
      });
    }
    node.children.forEach(child => visit(child, node.id, owner ?? (module && !selector && !structuralOnly ? id : selector || hasMatchedDescendants ? undefined : id)));
  }
  reviewTree.children.forEach(node => visit(node, input.design.root.id));
  const actualElements = input.evidence.samples[input.evidence.canonicalSampleIndex]?.elements ?? [];
  const boundSelectors = new Set(input.matches.map(match => match.selector));
  const actualBySelector = new Map(actualElements.map(element => [element.selector, element]));
  const candidates = actualElements.filter(element => !boundSelectors.has(element.selector) &&
    (Boolean(element.text?.trim()) || /^(img|svg|canvas|video)$/i.test(element.tag) ||
      Boolean(element.style.backgroundColor && !/transparent|rgba\(0,\s*0,\s*0,\s*0\)/.test(element.style.backgroundColor)) || (element.style.borderWidth ?? 0) > 0));
  const candidateSelectors = new Set(candidates.map(element => element.selector));
  coverage.actualItems = candidates.map(element => {
    let ancestor = element.parentSelector;
    let owner: string | undefined;
    const seen = new Set<string>();
    while (ancestor && !seen.has(ancestor)) {
      seen.add(ancestor);
      if (candidateSelectors.has(ancestor)) owner = ancestor;
      ancestor = actualBySelector.get(ancestor)?.parentSelector;
    }
    const id = `actual-coverage:${owner ?? element.selector}`;
    const name = element.text?.trim().slice(0, 80) || element.role || element.tag;
    if (!owner) {
      const summary = en ? "Visible actual content has no verified design counterpart; confirm its intended role." : "实际可见内容尚无设计对应，请核验其用途；不能仅凭未匹配判定多余。";
      const evidenceConfidence: EvidenceConfidence = { score: 0, level: "low", basis: [], reasons: [summary] };
      const action = en ? "Locate its design counterpart or confirm that this additional content is intended." : "查找对应设计，或确认该新增内容是否符合预期。";
      issues.push({ id, rule: "actual_coverage_unverified", category: en ? "Actual coverage" : "实际内容覆盖", severity: "pending", priority: "Pending",
        title: `${name} · ${en ? "design counterpart unverified" : "无设计对应（待核验）"}`, summary, suggestion: action, primaryAction: action,
        selector: element.selector, actualBox: element.box, box: element.box, evidenceConfidence,
        location: { selector: element.selector, actualBox: element.box, description: name },
        evidence: [{ sourceIssueId: id, rule: "actual_coverage_unverified", category: "Actual coverage", summary, actualBox: element.box, evidenceConfidence }] });
    }
    return { selector: element.selector, name, actualBox: element.box, status: owner ? "covered-by-parent" as const : "unverified" as const,
      reasonCode: owner ? "parent-finding" : "design-counterpart-unresolved", issueIds: [id], ...(owner ? { coveredBy: id } : {}) };
  });
  return { coverage, issues };
}
