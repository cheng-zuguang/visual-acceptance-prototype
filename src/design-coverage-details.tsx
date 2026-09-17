import { useState } from "react";
import type { Box, DesignCoverage, ReviewIssue } from "./types";

export function ModuleCoverageFindings({ issues, title, onSelect }: {
  issues: ReviewIssue[]; title: string; onSelect?: (issue: ReviewIssue) => void;
}) {
  const modules = issues.filter(issue => issue.coverageModule && issue.rule === "design_coverage_unverified");
  if (!modules.length) return null;
  return <section className="structure-section unpublished" aria-label={title}>
    <h3>{title} ({modules.length})</h3>
    <ul>{modules.map(issue => <li key={issue.id}><span className="structure-item-copy">
      <b>{issue.title}</b><p>{issue.summary}</p><p>{issue.primaryAction}</p>
      {onSelect && <button type="button" onClick={() => onSelect(issue)}>{issue.coverageModule!.name} →</button>}
    </span></li>)}</ul>
  </section>;
}

const labels: Record<string, string> = { passed: "通过", difference: "差异", pending: "待核验", exempt: "动态豁免", "not-applicable": "不适用", "not-run": "未执行", matched: "已对应", missing: "缺失", unverified: "对应待核验", "covered-by-parent": "归入父问题", "structural-only": "子项已对应" };
const value = (input: unknown) => input === undefined ? "—" : String(input);

function EvidenceCrop({ src, box, title }: { src?: string; box?: Box; title: string }) {
  if (!src || !box || box.width <= 0 || box.height <= 0) return <p>{title} · —</p>;
  return <figure><figcaption>{title} · {box.x}, {box.y} · {box.width} × {box.height}</figcaption>
    <svg role="img" aria-label={title} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}><image href={src} /></svg></figure>;
}

export function DesignCoverageDetails({ coverage, title, primary = false, locale = "zh-CN", images, onSelectIssue }: {
  coverage: DesignCoverage; title: string; primary?: boolean; locale?: "zh-CN" | "en";
  images?: { reference: string; actual: string }; onSelectIssue?: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const en = locale === "en";
  const label = (status: string) => en ? status : labels[status] ?? status;
  const ordered = [...coverage.items].sort((a, b) => (a.designBox?.y ?? Infinity) - (b.designBox?.y ?? Infinity) || (a.designBox?.x ?? 0) - (b.designBox?.x ?? 0));
  type Item = DesignCoverage["items"][number];
  const key = (item: Item) => `${item.tileIndex ?? "page"}:${item.figmaNodeId}`;
  const byKey = new Map(ordered.map(item => [key(item), item]));
  const children = new Map<string, Item[]>();
  const roots: Item[] = [];
  for (const item of ordered) {
    const parent = `${item.tileIndex ?? "page"}:${item.groupedParentFigmaNodeId ?? item.parentFigmaNodeId}`;
    if (parent !== key(item) && byKey.has(parent)) children.set(parent, [...(children.get(parent) ?? []), item]);
    else roots.push(item);
  }
  const visible = (item: Item): boolean => filter === "all" || (item.reviewStatus ?? "pending") === filter || Boolean(children.get(key(item))?.some(visible));
  const renderItem = (item: Item): React.ReactNode => <li key={`${item.tileIndex ?? "page"}:${item.figmaNodeId}`}>
      <details open={filter !== "all" || undefined}><summary><b>{item.name}</b> · {label(item.reviewStatus ?? "pending")} <small> / {label(item.status)}</small></summary>
        <p><code>{item.figmaNodeId}</code> · {item.reasonCode} · {item.selector ?? "—"}</p>
        <p>{en ? "Review region / original parent" : "审查区域 / 原始父节点"}: {item.groupedParentFigmaNodeId ?? "—"} / {item.parentFigmaNodeId ?? "—"}</p>
        {item.displacement && <p>{en ? "Region displacement" : "区域位移"}: x {item.displacement.x}px / y {item.displacement.y}px · {en ? "Explained" : "已解释"} {item.displacement.explainedY}px · {en ? "Unverified remainder" : "待核验余量"} {item.displacement.unexplainedY}px</p>}
        <div className="coverage-crops"><EvidenceCrop src={images?.reference} box={item.designBox} title={en ? "Design" : "设计"} />
          {item.status === "missing" ? <p>{en ? "Missing: no actual counterpart" : "缺失：没有实际对应内容"}</p> : <EvidenceCrop src={images?.actual} box={item.actualBox} title={en ? "Actual" : "实际"} />}</div>
        {item.checks?.length ? <div className="coverage-table-scroll"><table><caption>{en ? "Property checks" : "逐属性检查"}</caption><thead><tr>{(en ? ["Property", "Design", "Actual", "Tolerance", "Result", "Evidence / reason"] : ["属性", "设计值", "实际值", "容差", "结果", "证据 / 原因"]).map(text => <th scope="col" key={text}>{text}</th>)}</tr></thead>
          <tbody>{item.checks.map((check, index) => <tr key={`${check.selector}:${check.property}:${index}`}><th scope="row">{check.property}</th><td>{value(check.expected)}</td><td>{value(check.actual)}</td><td>{value(check.tolerance)}</td><td>{label(check.status)}</td><td>{check.reason}<br /><code>{check.selector}</code></td></tr>)}</tbody></table></div>
          : <p>{en ? "No property measurements available" : "暂无逐属性测量证据"}</p>}
        <p>{item.issueIds.map(id => onSelectIssue ? <button key={id} type="button" onClick={() => onSelectIssue(id)}>{en ? "Locate issue" : "定位问题"} · {id}</button> : <code key={id}>review-issue:{id} </code>)}</p>
        {children.get(key(item))?.some(visible) && <ol>{children.get(key(item))!.filter(visible).map(renderItem)}</ol>}
      </details>
    </li>;
  const content = <>
    <p>{en ? "Correspondence and acceptance are separate. Expand an item to inspect every measurement and exemption." : "对应关系与验收结果分别展示。展开每项可核对测量值、动态豁免和证据。"}</p>
    <label>{en ? "Filter results " : "筛选结果 "}<select value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="all">{en ? "All items" : "全部项目"}</option>{["passed", "difference", "pending", "not-applicable"].map(status => <option key={status} value={status}>{label(status)}</option>)}
    </select></label>
    <ol className="coverage-items">{roots.filter(visible).map(renderItem)}</ol>
    {!!coverage.actualItems?.length && <section><h3>{en ? "Actual content without a design counterpart" : "无设计对应的实际内容"}</h3><details><summary>{en ? "Expand to review" : "展开核对"} ({coverage.actualItems.length})</summary><ul>{coverage.actualItems.map(item => <li key={`${item.tileIndex ?? "page"}:${item.selector}`}><details><summary>{item.name} · {label(item.status)}</summary><p>{item.selector} · {item.reasonCode}</p><EvidenceCrop src={images?.actual} box={item.actualBox} title={en ? "Actual" : "实际"} /><p>{item.issueIds.join(" / ")}</p></details></li>)}</ul></details></section>}
  </>;
  return primary ? <section className="design-checklist"><h2>{title} ({coverage.items.length})</h2>{content}</section>
    : <details className="structure-section"><summary>{title} ({coverage.items.length})</summary>{content}</details>;
}
