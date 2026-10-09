import { actionableAdvicePriorities } from "./issue-presentation";
import type { AiAdvice, PageAlignmentRegionDecision, ReviewIssue } from "./types";

export function AiAdvicePriorities(props: {
  priorities: AiAdvice["priorities"];
  issues: ReviewIssue[];
  regions?: PageAlignmentRegionDecision[];
  label: string;
  locale?: "zh-CN" | "en";
  onSelect: (issue: ReviewIssue) => void;
}) {
  const byRef = new Map(props.issues.map(issue => [`review-issue:${issue.id}`, issue]));
  const en = props.locale === "en";
  const locate = en ? "Locate issue" : "定位问题";
  return <ol className="ai-priorities">{actionableAdvicePriorities(props.priorities, props.issues).map((item, index) => {
    const linked = item.evidenceRefs.map(ref => byRef.get(ref)).filter((issue): issue is ReviewIssue => Boolean(issue) && issue?.rule !== "visual_similarity");
    const primary = linked.find(issue => issue.rule === "missing_module") ?? linked[0];
    const action = primary?.primaryAction ?? item.action;
    const selector = primary?.location.selector;
    return <li key={index}>
      <div className="ai-priority-meta"><small className={`ai-status ${primary?.severity ?? "alignment"}`}>{primary?.severity === "pending" ? (en ? "Needs verification" : "待核验") : primary ? (en ? "Reported difference" : "已报告差异") : (en ? "Alignment evidence" : "对齐证据")}</small></div>
      <h3>{primary?.title ?? item.title}</h3>
      <p className="ai-priority-reason">{primary?.summary ?? item.reason}</p>
      <div className="ai-priority-action"><small>{en ? "Suggested action" : "建议操作"}</small><p>{selector?.startsWith("body >") ? action.replaceAll(selector, en ? "the corresponding element" : "对应元素") : action}</p></div>
      {primary && <button className="ai-locate" type="button" aria-label={`${locate}：${primary.title}`} onClick={() => props.onSelect(primary)}>{locate} <span aria-hidden="true">↗</span></button>}
      <details className="ai-evidence-details">
        <summary>{props.label} ({item.evidenceRefs.length})</summary>
        <ul>{item.evidenceRefs.map(ref => {
          const issue = byRef.get(ref);
          const region = props.regions?.find(region => ref === `page-alignment:${region.designParentFigmaNodeId}`);
          return <li key={ref}>{issue && <>
            <div className="ai-evidence-heading"><b>{issue.title}</b><button className="ai-locate" type="button" aria-label={`${locate}：${issue.title}`} onClick={() => props.onSelect(issue)}>{locate} ↗</button></div>
            <p>{issue.summary}</p>
          </>}{region && <><b>{region.designPath.join(" / ")}</b><p>{region.reason}</p></>}
          <details className="ai-technical"><summary>{en ? "Technical identifiers" : "技术标识"}</summary>
            <code>{ref}</code>{issue?.location.selector && <code>{issue.location.selector}</code>}
            {region && <><code>{region.actualParentSelector}</code><pre tabIndex={0}><code>{JSON.stringify({displacement: region.displacement, anchorStats: region.anchorStats}, null, 2)}</code></pre></>}
          </details></li>;
        })}</ul>
      </details>
    </li>;
  })}</ol>;
}
