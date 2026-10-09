import type {
  ActualEvidenceElement,
  DesignTruth,
  DesignTruthNode,
  MarketListSummary
} from "../src/types";
import { canonicalTextAlignment, visualTextAlignment } from "./relative-layout";
import { localText, type Locale } from "./i18n";

export interface MarketListTemplateBinding {
  design: DesignTruthNode;
  actual: ActualEvidenceElement;
}

export interface MarketListAnalysis {
  summary: MarketListSummary;
  templateBindings: MarketListTemplateBinding[];
}

interface DesignListTemplate {
  container: DesignTruthNode;
  header: DesignTruthNode;
  row: DesignTruthNode;
  kind?: "news";
}

function flatten(root: DesignTruthNode): DesignTruthNode[] {
  const output: DesignTruthNode[] = [];
  const visit = (node: DesignTruthNode): void => {
    output.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return output;
}

function designLists(design: DesignTruth): DesignListTemplate[] {
  return flatten(design.root).flatMap((container) => {
    if (!container.box || container.children.length < 2) return [];
    const header = container.children.find((child) => /表头|header|column.?head/i.test(child.name));
    const row = container.children.find((child) => /行模板|列表项|行情行|row.?template|list.?item/i.test(child.name));
    if (header?.box && row?.box && header.children.length >= 2 && row.children.length >= 2) {
      return [{ container, header, row }];
    }
    // Generic Figma groups can describe a numeric table. Require a unique
    // static header plus aligned numeric fields; the actual container still
    // needs independent correspondence below.
    const candidates = container.children.filter(child => child.box && child.children.length >= 2);
    const headers = candidates.filter(child => child.children.every(cell =>
      cell.type === "TEXT" && Boolean(cell.text?.trim()) && !/\d/.test(cell.text!)));
    if (headers.length === 1) {
      const header = headers[0];
      const rows = candidates.filter(child => child !== header && child.box!.y >= header.box!.y + header.box!.height &&
        child.children.length === header.children.length && child.children.filter(cell => /\d/.test(cell.text ?? "")).length >= 2 &&
        child.children.every((cell, index) => cell.box && header.children[index].box &&
          Math.abs(cell.box.x - header.children[index].box!.x) <= 4 && Math.abs(cell.box.width - header.children[index].box!.width) <= 4));
      if (rows.length) return [{ container, header, row: rows.sort((a,b) => a.box!.y-b.box!.y)[0] }];
    }
    // News feeds have a section title and repeated cards, not a table header.
    // Names and live article text are deliberately absent from the signature.
    const shape = (node: DesignTruthNode): string => `${node.type}(${node.children.map(shape).join(",")})`;
    const groups = new Map<string, DesignTruthNode[]>();
    for (const child of container.children) {
      if (!child.box || child.children.length < 2) continue;
      const key = shape(child);
      groups.set(key, [...(groups.get(key) ?? []), child]);
    }
    const repeated = [...groups.values()].filter(group => group.length >= 2);
    if (repeated.length !== 1) return [];
    const rows = repeated[0].sort((a,b) => a.box!.y - b.box!.y);
    if (!rows.every((item, index) => index === 0 || item.box!.y >= rows[index-1].box!.y + rows[index-1].box!.height)) return [];
    const headings = container.children.filter(child => child.type === "TEXT" && child.text?.trim() && child.box && child.box.y < rows[0].box!.y);
    if (headings.length !== 1) return [];
    return [{container, header: headings[0], row: rows[0], kind: "news" as const}];
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizedFigmaId(value: string | undefined): string | undefined {
  return value?.replace(/-/g, ":");
}

function structuralKey(element: ActualEvidenceElement): string {
  return element.subtreeSignature ?? element.selector.replace(/:nth-of-type\(\d+\)/g, ":nth-of-type(*)");
}

function directChildren(
  elements: ActualEvidenceElement[],
  parentSelector: string
): ActualEvidenceElement[] {
  return elements
    .filter((element) => element.parentSelector === parentSelector)
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}

export function analyzeMarketLists(
  design: DesignTruth,
  elements: ActualEvidenceElement[],
  locale: Locale,
  verifiedBindings: MarketListTemplateBinding[] = [],
  alignmentTolerancePx = 4
): MarketListAnalysis {
  const summary: MarketListSummary = { matches: [], unresolved: [] };
  const templateBindings: MarketListTemplateBinding[] = [];

  for (const template of designLists(design)) {
    const boundSelectors = new Set(verifiedBindings.flatMap(binding =>
      binding.design.id === template.container.id ? [binding.actual.selector]
        : binding.design.id === template.header.id && binding.actual.parentSelector ? [binding.actual.parentSelector] : []));
    const exactContainer = elements.find(
      (element) => normalizedFigmaId(element.dataFigmaId) === template.container.id
    );
    const actualContainer = exactContainer ?? (boundSelectors.size === 1
      ? elements.find(element => element.selector === [...boundSelectors][0]) : undefined);
    if (!actualContainer) {
      summary.unresolved.push({
        figmaNodeId: template.container.id,
        reason: localText(locale, "未找到与 Figma 行情列表对应的开发容器，继续使用元素级审查。", "No actual container matches the Figma market list; element-level review continues."),
        evidenceConfidence: {
          score: 0.45,
          level: "low",
          basis: ["structure-geometry"],
          reasons: [localText(locale, "仅识别到设计侧列表层级。", "Only the design-side list hierarchy was identified.")]
        }
      });
      continue;
    }

    const children = directChildren(elements, actualContainer.selector);
    const groups = new Map<string, ActualEvidenceElement[]>();
    for (const child of children) {
      const key = structuralKey(child);
      const group = groups.get(key) ?? [];
      group.push(child);
      groups.set(key, group);
    }
    const rows = Array.from(groups.values())
      .filter((group) => group.length >= 2)
      .sort((a, b) => b.length - a.length)[0];
    if (!rows) {
      summary.unresolved.push({
        figmaNodeId: template.container.id,
        selector: actualContainer.selector,
        reason: localText(locale, "开发容器内没有至少两个同构直属子树，继续使用元素级审查并等待人工确认。", "The actual container has no two isomorphic direct subtrees; element-level review continues pending confirmation."),
        evidenceConfidence: {
          score: 0.62,
          level: "low",
          basis: ["exact-id", "structure-geometry"],
          reasons: [localText(locale, "容器绑定可靠，但重复行结构证据不足。", "The container binding is reliable, but repeated-row evidence is insufficient.")]
        }
      });
      continue;
    }

    const rowSelectors = rows.map((row) => row.selector);
    const header = children.find((child) => !rowSelectors.includes(child.selector));
    const designFields = template.kind === "news"
      ? flatten(template.row).filter(node => node.children.length === 0 && node.type === "TEXT")
      : template.row.children;
    const actualFields = (parentSelector: string, visited = new Set<string>()): ActualEvidenceElement[] => {
      if (visited.has(parentSelector)) return [];
      visited.add(parentSelector);
      return directChildren(elements, parentSelector).flatMap(child => {
        const descendants = actualFields(child.selector, visited);
        return descendants.length ? descendants : child.text?.trim() ? [child] : [];
      });
    };
    const cellsByRow = rows.map((row) => template.kind === "news"
      ? actualFields(row.selector) : directChildren(elements, row.selector));
    const actualColumnCounts = new Set(cellsByRow.map((cells) => cells.length));
    if (actualColumnCounts.size !== 1) {
      summary.unresolved.push({
        figmaNodeId: template.container.id,
        selector: actualContainer.selector,
        reason: localText(locale, "重复行的列结构与 Figma 行模板不一致，无法建立可靠模板绑定。", "Repeated rows do not share the Figma row template's column structure."),
        evidenceConfidence: {
          score: 0.66,
          level: "medium",
          basis: ["exact-id", "repeated-structure"],
          reasons: [localText(locale, "已识别重复行，但列数不稳定。", "Repeated rows were found, but their column counts are unstable.")]
        }
      });
      continue;
    }
    const actualColumnCount = cellsByRow[0].length;

    if (actualColumnCount === designFields.length) {
      for (const cells of cellsByRow) {
        cells.forEach((actualCell, index) => {
          templateBindings.push({ design: designFields[index], actual: actualCell });
        });
      }
    }

    const rowHeights = rows.map((row) => row.box.height);
    const rowGaps = rows.slice(1).map((row, index) =>
      row.box.y - (rows[index].box.y + rows[index].box.height)
    );
    const representativeRow = rows[0];
    const columns = (actualColumnCount === designFields.length ? designFields : [])
      .map((column, index) => {
        const expectedAlignment = column.style.textAlign ? canonicalTextAlignment(column.style.textAlign) : undefined;
        const alignments = cellsByRow.map(cells => {
          const cell = cells[index];
          return cell.visuallyObscured
            ? { differs: false, pendingReason: "alignment: cell obscured" }
            : visualTextAlignment(expectedAlignment, cell.style, cell.box, alignmentTolerancePx);
        });
        const mismatch = alignments.find(alignment => alignment.differs && !alignment.pendingReason);
        // A mismatch in any verified row survives; agreement requires evidence for every row.
        const actualAlignment = mismatch?.actual ?? (
          alignments.every(alignment => !alignment.pendingReason) ? expectedAlignment : undefined
        );
        return {
          index,
          figmaNodeId: column.id,
          name: column.name,
          expectedWidth: column.relativeBox?.width ?? column.box?.width ?? 0,
          actualWidth: median(cellsByRow.map((cells) => cells[index].box.width)),
          expectedAlignment,
          actualAlignment
        };
      });
    summary.matches.push({
      figmaNodeId: template.container.id,
      ...(template.kind ? {kind: template.kind} : {}),
      selector: actualContainer.selector,
      header: {
        figmaNodeId: template.header.id,
        selector: header?.selector,
        expectedHeight: template.header.box!.height,
        actualHeight: header?.box.height
      },
      rowTemplate: {
        figmaNodeId: template.row.id,
        expectedHeight: template.row.box!.height,
        actualHeight: median(rowHeights),
        expectedGap: template.container.layout?.itemSpacing ?? 0,
        actualGap: median(rowGaps),
        expectedDividerWidth: template.row.style.borderWidth,
        actualDividerWidth: representativeRow.style.borderWidth,
        expectedDividerColor: template.row.style.borderColor,
        actualDividerColor: representativeRow.style.borderColor
      },
      columns,
      expectedColumnCount: designFields.length,
      actualColumnCount,
      rowSelectors,
      actualRowCount: rows.length,
      evidenceConfidence: {
        score: 0.97,
        level: "high",
        basis: [exactContainer ? "exact-id" : "stable-text", "repeated-structure", "structure-geometry"],
        reasons: [
          localText(
            locale,
            `Figma 表头/行模板与 ${rows.length} 个同构 DOM 行共同确认列表结构。`,
            `The Figma header/row hierarchy and ${rows.length} isomorphic DOM rows jointly establish the list template.`
          )
        ]
      }
    });
  }

  return { summary, templateBindings };
}
