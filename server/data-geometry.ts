import type { ActualEvidence, ActualEvidenceElement, DesignTruthNode, DynamicNormalizationSummary } from "../src/types";

/** A percent label alone never licenses a width exemption. Both sides need
 * verified identities, a containing track, and an explicit live percent rule. */
export function verifyDataDrivenWidths(root: DesignTruthNode, evidence: ActualEvidence,
  bindings: Array<{ design: DesignTruthNode; actual: ActualEvidenceElement; method: string }>): NonNullable<DynamicNormalizationSummary["geometry"]> {
  if (evidence.kind !== "live" || evidence.samples.length < 3) return [];
  const flatten = (node: DesignTruthNode): DesignTruthNode[] => [node, ...node.children.flatMap(flatten)];
  const nodes = flatten(root);
  const trusted = bindings.filter(binding => ["exact-id", "stable-text", "verified-region", "verified-template"].includes(binding.method));
  const percent = (text?: string) => /^\d+(?:\.\d+)?%$/.test(text?.trim() ?? "") ? Number.parseFloat(text!) : NaN;
  return trusted.flatMap(binding => {
    const bar = binding.design, actual = binding.actual;
    if (!bar.box || bar.type === "TEXT" || actual.declaredWidthPercent === undefined || !/概率|probab/i.test(bar.name)) return [];
    const track = trusted.find(item => item.design.id === bar.parentId && item.actual.selector === actual.parentSelector);
    if (!track?.design.box || track.design.box.width <= 0 || track.actual.box.width <= 0) return [];
    const context = nodes.find(node => node.id === track.design.parentId);
    if (!context) return [];
    const values = trusted.filter(item => item.design.type === "TEXT" && flatten(context).some(node => node.id === item.design.id) &&
      Number.isFinite(percent(item.design.text)) && Number.isFinite(percent(item.actual.text)));
    if (values.length !== 1) return [];
    const value = values[0];
    if (Math.abs(bar.box.width / track.design.box.width * 100 - percent(value.design.text)) > 1) return [];
    const valid = evidence.samples.every(sample => {
      const one = (element: ActualEvidenceElement) => {
        const all = sample.elements.filter(item => item.fingerprint.key === element.fingerprint.key); return all.length === 1 ? all[0] : undefined;
      };
      const b = one(actual), t = one(track.actual), v = one(value.actual);
      return b && t && v && b.declaredWidthPercent !== undefined && b.declaredWidthPercent >= 0 && b.declaredWidthPercent <= 100 &&
        Math.abs(t.box.width - track.actual.box.width) <= 1 && Math.abs(b.box.x - t.box.x) <= 1 &&
        Math.abs(b.declaredWidthPercent - percent(v.text)) <= 0.1 && Math.abs(b.box.width / t.box.width * 100 - b.declaredWidthPercent) <= 1;
    });
    return valid ? [{ figmaNodeId: bar.id, selector: actual.selector, property: "width" as const, source: "declared-percentage" as const,
      trackFigmaNodeId: track.design.id, trackSelector: track.actual.selector, valueFigmaNodeId: value.design.id, valueSelector: value.actual.selector,
      designBox: bar.box, actualBox: actual.box, sampleCount: evidence.samples.length,
      reason: "Verified percentage field, track and declared CSS percentage width; height, color and position remain independently reviewed." }] : [];
  });
}
