import type { AiAdvice, ElementMatchingEvidence, ReviewIssue } from "./types";

const labels: Record<string, string> = {
  position: "相对位置与间距", size: "尺寸", typography: "文字样式", alignment: "对齐方式",
  content: "文案", text_content: "文案", color: "颜色", decoration: "边框、圆角与透明度"
};
const actions: Record<string, string> = {
  position: "调整与邻近元素的间距、内边距和对齐关系。", size: "调整宽度、高度和内部留白。",
  typography: "调整字号、字体、字重和行高。", alignment: "调整视觉对齐方式，使文字或内容与设计稿一致。",
  content: "核对并调整文案。", text_content: "核对并调整文案。", color: "调整颜色和透明度。", decoration: "调整边框、圆角和透明度。"
};
export function reviewRuleLabel(rule: string): string { return labels[rule] ?? rule; }

/** Technical identities remain in evidence; acceptance copy describes the visible target. */
export function issuePresentation(issue: ReviewIssue, locale = "zh-CN", matching?: Pick<ElementMatchingEvidence, "designCoverage">) {
  const technical = /(?:\b(?:body|div|span|p|section):nth|\s>\s|\b(?:padding|margin|box-sizing|text-align|justify-content|CSS)\b)/i;
  const chinese = locale !== "en";
  const clean = (value: string) => {
    let text = issue.selector ? value.replaceAll(issue.selector, chinese ? "该区域" : "this region") : value;
    if (chinese) {
      const terms: Record<string, string> = { "font-family": "字体", "font-size": "字号", "font-weight": "字重", "line-height": "行高", "letter-spacing": "字间距", "border-radius": "圆角", "border-width": "边框宽度", "opacity": "透明度" };
      text = text.replace(/\b(?:font-family|font-size|font-weight|line-height|letter-spacing|border-radius|border-width|opacity)\b/g, term => terms[term]);
    }
    return text;
  };
  const title = technical.test(clean(issue.title)) ? "页面区域存在视觉差异" : clean(issue.title);
  const location = issue.location.description.includes(issue.selector || "\u0000") || technical.test(issue.location.description)
    ? title.replace(/\s*(位置偏移|尺寸不一致|排版属性不一致|对齐方式不一致|颜色存在差异|装饰属性不一致|文案不一致)$/, "")
    : issue.location.description;
  const suggestion = chinese && (technical.test(issue.primaryAction) || Boolean(issue.selector && issue.primaryAction.includes(issue.selector)))
    ? `${location}：${actions[issue.rule] ?? "结合对照图调整视觉表现，再重新验收。"}`
    : clean(issue.primaryAction);
  const identifier = /^issue-\d+$/.test(issue.id) ? issue.id.replace("issue-", "#") : chinese ? "待核验" : "Verification";
  if (issue.rule === "actual_coverage_unverified") {
    const names = [...new Set(matching?.designCoverage?.actualItems?.filter(item => item.issueIds.includes(issue.id))
      .map(item => item.name).filter(name => name && name !== "内容区域" && name !== location) ?? [])].slice(0, 3);
    const content = names.length ? names.map(name => `「${clean(name)}」`).join("、") : `「${location}」`;
    return { title, location, identifier,
      expected: chinese ? "对应关系尚未确认，暂不提供设计值。" : "Design correspondence unverified; design values unavailable.",
      actual: chinese ? `已采集${content}等实际内容；具体样式差异尚未确认。` : `Captured actual content: ${names.join(", ") || location}; style differences unverified.`,
      summary: chinese ? `该区域的${content}等内容尚未建立可靠的设计对应，暂不能判定视觉差异。` : `Design correspondence remains unverified for ${names.join(", ") || location}.`,
      suggestion: chinese ? `核验${content}在设计稿中的对应区域；确认对应关系后，逐项核对字体、尺寸、颜色和邻近间距。若为 H5 实际需求内的新增内容，记录其用途后单独验收。` : `Verify the design counterparts for ${names.join(", ") || location}; then check typography, dimensions, colors and neighboring spacing. Confirm intended additions separately.` };
  }
  const rules = new Set([issue.rule, ...(issue.evidence ?? []).map(item => item.rule)]);
  const checks = matching?.designCoverage?.items.filter(item => item.figmaNodeId === issue.figmaNodeId || item.issueIds.includes(issue.id))
    .flatMap(item => item.checks ?? []).filter(check => check.status === "difference" && rules.has(check.rule) && check.expected !== undefined && check.actual !== undefined) ?? [];
  const propertyNames: Record<string, string> = {fontFamily:"字体",fontSize:"字号",fontWeight:"字重",lineHeight:"行高",letterSpacing:"字间距",textAlign:"对齐方式",width:"宽度",height:"高度",x:"横向相对间距",y:"纵向相对间距",color:"文字颜色",backgroundColor:"背景颜色",borderWidth:"边框宽度",borderRadius:"圆角",opacity:"透明度",text:"文案"};
  const alignments: Record<string,string> = {left:"靠左",right:"靠右",center:"居中",justify:"两端对齐",justified:"两端对齐"};
  const label = (property: string) => chinese ? propertyNames[property] ?? reviewRuleLabel(issue.rule) : property;
  const value = (property: string, raw: string | number) => {
    if (chinese && property === "textAlign") return alignments[String(raw)] ?? clean(String(raw));
    return `${clean(String(raw))}${typeof raw === "number" && ["fontSize","lineHeight","letterSpacing","width","height","x","y","borderWidth","borderRadius"].includes(property) ? "px" : ""}`;
  };
  const expected = checks.length ? checks.map(check => `${label(check.property)}：${value(check.property, check.expected!)}`).join("；") : issue.expected;
  const actual = checks.length ? checks.map(check => `${label(check.property)}：${value(check.property, check.actual!)}`).join("；") : issue.actual;
  const detailedAction = checks.length ? checks.map(check => chinese
    ? `${label(check.property)}由 ${value(check.property,check.actual!)} 调整为 ${value(check.property,check.expected!)}。`
    : `Change ${label(check.property)} from ${value(check.property,check.actual!)} to ${value(check.property,check.expected!)}.`).join(" ") : suggestion;
  const measuredSummary = checks.length ? checks.map(check => chinese
    ? `${label(check.property)}不同：设计为 ${value(check.property,check.expected!)}，实际为 ${value(check.property,check.actual!)}。`
    : `${label(check.property)} differs: design ${value(check.property,check.expected!)}, actual ${value(check.property,check.actual!)}.`)
    .map((description,index) => {
      const check = checks[index];
      if (typeof check.expected !== "number" || typeof check.actual !== "number") return description;
      const delta = Number((check.actual - check.expected).toFixed(2));
      return `${description}${chinese ? "差值" : " Difference"}：${delta > 0 ? "+" : ""}${value(check.property,delta)}。`;
    }).join(" ") : clean(issue.summary);
  const originalSummary = clean(issue.summary);
  const summary = checks.length && issue.rule === "position" ? (originalSummary.includes(measuredSummary) ? originalSummary : `${originalSummary} ${measuredSummary}`) : measuredSummary;
  return { title, location, summary, suggestion: checks.length ? `${location}。${chinese ? "差异" : "Differences"}：${summary} ${chinese ? "调整" : "Adjustment"}：${issue.severity === "pending" ? (chinese ? "先复核测量与对应关系，确认后再调整。" : "Verify measurements and correspondence before applying changes. ") : ""}${detailedAction}` : suggestion, identifier, expected, actual };
}

export function similarityPresentation(
  similarity: number,
  matching: { visualScope?: { reviewedPixels: number } },
  locale = "zh-CN"
): string {
  if (matching.visualScope?.reviewedPixels === 0) {
    return locale === "en" ? "Not evaluated · no reliable corresponding region" : "未评估 · 无可靠对应区域";
  }
  return `${(similarity * 100).toFixed(2)}%`;
}

/** Summary evidence remains available, but is never an element modification. */
export function actionableAdvicePriorities(priorities: AiAdvice["priorities"], issues: ReviewIssue[]) {
  const summaryRefs = new Set(issues.filter(issue => issue.rule === "visual_similarity").map(issue => `review-issue:${issue.id}`));
  return priorities.filter(item => item.evidenceRefs.some(ref => !summaryRefs.has(ref)));
}

export function pixelScopePresentation(scope: { reviewedPixels: number; canvasPixels: number }, locale = "zh-CN"): string {
  const ratio = scope.canvasPixels > 0 ? (scope.reviewedPixels / scope.canvasPixels * 100).toFixed(1) : "0.0";
  return locale === "en" ? `Reviewed ${ratio}% of the image; similarity applies only to these corresponding regions.`
    : `仅审查整图的 ${ratio}%，相似度仅代表这些对应区域。`;
}
