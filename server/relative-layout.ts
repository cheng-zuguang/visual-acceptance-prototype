import type { Box, ElementStyle } from "../src/types";

/** Verified correspondence is the seam: geometry alone never supplies a reference. */
export interface LayoutBinding {
  design: { id: string; box: Box; node: { parentId?: string }; type?: string };
  actual: { selector: string; parentSelector?: string; box: Box; style: ElementStyle; visuallyObscured?: boolean };
  method: string;
  confidence: number;
  templateStyleOnly?: boolean;
}
export interface RelativeMeasurement {
  axis: "x" | "y";
  reference: "parent" | "neighbor";
  referenceName: string;
  expected: number;
  actual: number;
}
const reliable = (binding: LayoutBinding) => !binding.actual.visuallyObscured && binding.confidence >= 0.8 &&
  ["exact-id", "stable-text", "verified-region", "verified-template", "agent-semantic"].includes(binding.method);

export function relativeLayoutMeasurements(target: LayoutBinding, bindings: LayoutBinding[], inventory?: {
  design: Array<{ id: string; box: Box; parentId?: string }>;
  actual: Array<{ selector: string; box: Box; parentSelector?: string }>;
}): RelativeMeasurement[] {
  if (!reliable(target) || target.templateStyleOnly) return [];
  const result: RelativeMeasurement[] = [];
  const parent = bindings.find(candidate => candidate !== target && reliable(candidate) &&
    candidate.design.id === target.design.node.parentId && candidate.actual.selector === target.actual.parentSelector);
  if (parent && parent.design.node.parentId !== undefined) {
    for (const axis of ["x", "y"] as const) result.push({ axis, reference: "parent", referenceName: parent.design.id,
      expected: target.design.box[axis] - parent.design.box[axis], actual: target.actual.box[axis] - parent.actual.box[axis] });
  }
  const siblings = bindings.filter(candidate => candidate !== target && reliable(candidate) && !candidate.templateStyleOnly &&
    target.design.node.parentId !== undefined && candidate.design.node.parentId === target.design.node.parentId &&
    target.actual.parentSelector !== undefined && candidate.actual.parentSelector === target.actual.parentSelector);
  for (const axis of ["x", "y"] as const) {
    const cross = axis === "x" ? "y" : "x";
    const extent = axis === "x" ? "width" : "height";
    const crossExtent = axis === "x" ? "height" : "width";
    for (const side of [-1, 1]) {
      const nearest = (actual: boolean) => {
        const box = actual ? target.actual.box : target.design.box;
        return siblings.map(binding => ({ binding, box: actual ? binding.actual.box : binding.design.box }))
          .filter(candidate => Math.min(box[cross] + box[crossExtent], candidate.box[cross] + candidate.box[crossExtent]) > Math.max(box[cross], candidate.box[cross]) &&
            (side < 0 ? candidate.box[axis] + candidate.box[extent] <= box[axis] : candidate.box[axis] >= box[axis] + box[extent]))
          .sort((a, b) => side < 0 ? (b.box[axis] + b.box[extent]) - (a.box[axis] + a.box[extent]) : a.box[axis] - b.box[axis])[0]?.binding;
      };
      const reference = nearest(false);
      if (!reference || reference !== nearest(true)) continue;
      if (inventory) {
        const directNearest = (actual: boolean) => {
          const box = actual ? target.actual.box : target.design.box;
          const candidates = actual
            ? inventory.actual.filter(item => item.selector !== target.actual.selector && item.parentSelector === target.actual.parentSelector).map(item => ({id: item.selector, box: item.box}))
            : inventory.design.filter(item => item.id !== target.design.id && item.parentId === target.design.node.parentId).map(item => ({id: item.id, box: item.box}));
          return candidates.filter(item => Math.min(box[cross] + box[crossExtent], item.box[cross] + item.box[crossExtent]) > Math.max(box[cross], item.box[cross]) &&
            (side < 0 ? item.box[axis] + item.box[extent] <= box[axis] : item.box[axis] >= box[axis] + box[extent]))
            .sort((a,b) => side < 0 ? b.box[axis] + b.box[extent] - a.box[axis] - a.box[extent] : a.box[axis] - b.box[axis])[0]?.id;
        };
        if (directNearest(false) !== reference.design.id || directNearest(true) !== reference.actual.selector) continue;
      }
      const gap = (box: Box, other: Box) => side < 0 ? box[axis] - other[axis] - other[extent] : other[axis] - box[axis] - box[extent];
      result.push({ axis, reference: "neighbor", referenceName: reference.design.id,
        expected: gap(target.design.box, reference.design.box), actual: gap(target.actual.box, reference.actual.box) });
      result.push({ axis: cross, reference: "neighbor", referenceName: reference.design.id,
        expected: target.design.box[cross] - reference.design.box[cross],
        actual: target.actual.box[cross] - reference.actual.box[cross] });
    }
  }
  return result;
}

export function canonicalTextAlignment(value?: string, direction = "ltr"): string {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "justified" ? "justify" : normalized === "start" ? (direction === "rtl" ? "right" : "left") : normalized === "end" ? (direction === "rtl" ? "left" : "right") : normalized;
}

/** Compare rendered alignment, allowing flex/grid and text-align implementations. */
export function visualTextAlignment(expected: string | undefined, actual: ElementStyle, box: Box, tolerance: number, intrinsicDesignTextBox?: Box): {
  expected?: string; actual?: string; differs: boolean; pendingReason?: string;
} {
  if (!expected) return { differs: false };
  const wanted = canonicalTextAlignment(expected);
  const reported = canonicalTextAlignment(actual.textAlign, actual.direction);
  if (actual.textBounds && intrinsicDesignTextBox && intrinsicDesignTextBox.width <= actual.textBounds.width + tolerance * 2) {
    return { expected: wanted, actual: wanted, differs: false };
  }
  if (!["left", "right", "center"].includes(wanted)) return { expected: wanted, actual: reported, differs: wanted !== reported };
  const text = actual.textBounds;
  const insetLeft = (actual.paddingLeft ?? 0) + (actual.borderWidth ?? 0);
  const insetRight = (actual.paddingRight ?? 0) + (actual.borderWidth ?? 0);
  const left = box.x + insetLeft, right = box.x + box.width - insetRight;
  // A tight text box has no alignment space: all alignments render identically.
  if (text && text.width >= right - left - tolerance * 2 &&
      Math.abs(text.x - left) <= tolerance && Math.abs(text.x + text.width - right) <= tolerance) {
    return { expected: wanted, actual: wanted, differs: false };
  }
  const flexGrid = /flex|grid/.test(actual.display ?? "");
  if (text || flexGrid) {
    // Range bounds prove the visual result; axis-specific CSS values alone do not.
    if (!text || text.width >= right - left - tolerance * 2) return { expected: wanted, differs: false,
      pendingReason: "alignment: independent rendered text bounds unavailable" };
    const delta = wanted === "left" ? text.x - left : wanted === "right" ? right - text.x - text.width : text.x + text.width / 2 - (left + right) / 2;
    return { expected: wanted, actual: Math.abs(delta) <= tolerance ? wanted : "偏离目标对齐", differs: Math.abs(delta) > tolerance };
  }
  return { expected: wanted, actual: reported || undefined, differs: false,
    pendingReason: "alignment: independent rendered text bounds unavailable" };
}
