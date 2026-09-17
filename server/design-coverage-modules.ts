import type { DesignTruthNode } from "../src/types";

/** Independent review grouping; preserve the raw Figma tree and identities. */
export function coverageModuleTree(root: DesignTruthNode): DesignTruthNode {
  function visit(parent: DesignTruthNode): DesignTruthNode {
    const children = parent.children.map(visit);
    const owners = new Map<string, string>();
    for (const child of children) {
      const containers = children.filter(candidate => candidate !== child && candidate.box && child.box && root.box &&
        // Figma may flatten a card background into VECTOR. Its bounding box
        // supports coverage grouping only, never actual-element identity.
        (candidate.type === "RECTANGLE" || (candidate.type === "VECTOR" && candidate.box.height < root.box.height * 0.8)) &&
        candidate.box.height >= 40 && candidate.box.width >= 40 &&
        (candidate.box.width >= root.box.width * 0.7 || children.filter(item => item !== candidate && item.box &&
          item.box.x >= candidate.box!.x && item.box.y >= candidate.box!.y &&
          item.box.x + item.box.width <= candidate.box!.x + candidate.box!.width + 1 &&
          item.box.y + item.box.height <= candidate.box!.y + candidate.box!.height + 1).length >= 2) &&
        candidate.box.width * candidate.box.height > child.box.width * child.box.height &&
        child.box.x >= candidate.box.x && child.box.y >= candidate.box.y &&
        child.box.x + child.box.width <= candidate.box.x + candidate.box.width + 1 &&
        child.box.y + child.box.height <= candidate.box.y + candidate.box.height + 1);
      // A strictly nested chain has a unique innermost owner. Intersecting or
      // identical backgrounds remain ambiguous and cannot establish ownership.
      const innermost = containers.filter(candidate => containers.every(other => other === candidate ||
        (candidate.box!.width * candidate.box!.height < other.box!.width * other.box!.height &&
        candidate.box!.x >= other.box!.x && candidate.box!.y >= other.box!.y &&
        candidate.box!.x + candidate.box!.width <= other.box!.x + other.box!.width + 1 &&
        candidate.box!.y + candidate.box!.height <= other.box!.y + other.box!.height + 1)));
      if (innermost.length === 1) owners.set(child.id, innermost[0].id);
      else {
        // Ambiguous inner panels may still have one trustworthy shared envelope.
        const enclosing = containers.filter(candidate => containers.every(other => other === candidate ||
          candidate.box!.width * candidate.box!.height > other.box!.width * other.box!.height &&
          other.box!.x >= candidate.box!.x && other.box!.y >= candidate.box!.y &&
          other.box!.x + other.box!.width <= candidate.box!.x + candidate.box!.width + 1 &&
          other.box!.y + other.box!.height <= candidate.box!.y + candidate.box!.height + 1));
        if (enclosing.length === 1) owners.set(child.id, enclosing[0].id);
      }
    }
    const attach = (node: DesignTruthNode): DesignTruthNode => ({ ...node,
      children: [...node.children, ...children.filter(child => owners.get(child.id) === node.id).map(attach)]
    });
    return { ...parent, children: children.filter(child => !owners.has(child.id)).map(attach) };
  }
  return visit(root);
}

export function coverageModuleName(node: DesignTruthNode): string {
  if (!/^(编组|组|group|frame|矩形|rectangle)(\s|\d|$)/i.test(node.name)) return node.name;
  const texts = (item: DesignTruthNode): DesignTruthNode[] => [item, ...item.children.flatMap(texts)];
  const titles = texts(node).filter(item => item.type === "TEXT" && item.text && item.text.length <= 32 && !/[0-9%％]/.test(item.text));
  titles.sort((a, b) => (a.box?.y ?? Infinity) - (b.box?.y ?? Infinity) || (a.box?.x ?? Infinity) - (b.box?.x ?? Infinity));
  const first = titles[0];
  // Baseline/font differences may put the section badge slightly below its headline.
  // Prefer the leftmost short label on that same line, not a title further down the card.
  const header = first?.box && titles.filter(item => item.box && item.text!.length <= 8 &&
    item.box.y < first.box!.y + first.box!.height && item.box.y + item.box.height > first.box!.y)
    .sort((a, b) => a.box!.x - b.box!.x)[0];
  if (header) return header.text!;
  return titles[0]?.text ?? node.name;
}
