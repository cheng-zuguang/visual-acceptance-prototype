import type { AcceptanceConfig, DesignElement, DomElement } from "../src/types";
import { capturePage, withBrowser } from "./capture";
import type { DesignSource } from "./design";

const names: Record<string, string> = {
  "demo:logo": "DiffLab 标志",
  "demo:nav": "顶部导航",
  "demo:eyebrow": "眉题",
  "demo:title": "主标题",
  "demo:description": "说明文案",
  "demo:primary": "主要按钮",
  "demo:secondary": "次要按钮",
  "demo:preview": "预览面板",
  "demo:score": "相似度指标",
  "demo:error": "错误指标",
  "demo:warning": "警告指标"
};

export function demoHtml(kind: "reference" | "actual"): string {
  const actual = kind === "actual";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
  *{box-sizing:border-box}body{margin:0;background:${actual ? "#f5f6f8" : "#f8f8f5"};color:#101010;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
  header{height:${actual ? 78 : 72}px;padding:0 48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${actual ? "#d8d8dc" : "#deded8"};background:#fff}
  .logo{display:flex;align-items:center;gap:11px;font-size:19px;font-weight:650;letter-spacing:-.03em}.mark{width:26px;height:26px;border-radius:8px;background:#111;display:grid;place-items:center;color:#fff;font-size:12px}
  nav{display:flex;gap:${actual ? 24 : 30}px;font-size:13px;color:#5d5d5a}
  main{display:grid;grid-template-columns:${actual ? "0.86fr 1.14fr" : "0.94fr 1.06fr"};gap:${actual ? 38 : 56}px;max-width:1184px;margin:${actual ? 86 : 76}px auto 0;padding:0 32px}
  .copy{padding-top:${actual ? 15 : 5}px}.eyebrow{font:600 11px ui-monospace;letter-spacing:.13em;text-transform:uppercase;color:${actual ? "#7357d8" : "#6453d4"};margin-bottom:20px}
  h1{font-size:${actual ? 48 : 56}px;line-height:${actual ? 1.05 : .98};letter-spacing:-.052em;margin:0 0 24px;max-width:520px;font-weight:${actual ? 620 : 560}}
  .description{font-size:${actual ? 16 : 17}px;line-height:1.65;color:#666;max-width:${actual ? 420 : 460}px;margin-bottom:30px}
  .actions{display:flex;gap:10px}.button{height:44px;border-radius:${actual ? 9 : 999}px;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;border:1px solid #111}.primary{background:${actual ? "#6453d4" : "#111"};color:#fff}.secondary{background:#fff;color:#111}
  .preview{height:${actual ? 440 : 420}px;border:1px solid ${actual ? "#d2d2d7" : "#dcdcd5"};border-radius:${actual ? 14 : 18}px;background:#fff;padding:${actual ? 20 : 24}px;box-shadow:0 20px 60px rgba(0,0,0,${actual ? ".12" : ".07"})}
  .toolbar{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ecece8;padding-bottom:17px}.dots{display:flex;gap:6px}.dot{width:8px;height:8px;border-radius:50%;background:#dadad5}.tag{font:600 10px ui-monospace;letter-spacing:.1em;color:#777}
  .score{display:flex;align-items:end;justify-content:space-between;padding:28px 4px 20px}.score strong{font-size:${actual ? 44 : 50}px;letter-spacing:-.05em}.score span{font-size:13px;color:#777;padding-bottom:7px}
  .bars{height:90px;display:flex;align-items:end;gap:8px;padding:0 4px}.bar{flex:1;border-radius:5px 5px 2px 2px;background:#ddd}.bar:nth-child(1){height:38%;background:#d9d4fb}.bar:nth-child(2){height:${actual ? 82 : 62}%;background:#b7acef}.bar:nth-child(3){height:48%;background:#9a89e7}.bar:nth-child(4){height:${actual ? 50 : 76}%;background:#6453d4}.bar:nth-child(5){height:58%;background:#332b78}
  .metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:26px}.metric{border:1px solid #e6e6e1;border-radius:10px;padding:15px}.metric span{display:block;color:#777;font-size:11px}.metric b{font-size:23px;display:block;margin-top:8px}
  </style></head><body>
  <header><div class="logo" data-figma-id="demo:logo"><span class="mark">D</span>DiffLab</div><nav data-figma-id="demo:nav"><span>比对</span><span>规则</span><span>报告</span></nav></header>
  <main><section class="copy"><div class="eyebrow" data-figma-id="demo:eyebrow">Visual acceptance</div><h1 data-figma-id="demo:title">让设计验收<br>有据可查</h1><p class="description" data-figma-id="demo:description">连接设计基准和实际页面，用确定性规则定位布局、排版和颜色差异。</p><div class="actions"><div class="button primary" data-figma-id="demo:primary">开始比对</div>${actual ? "" : '<div class="button secondary" data-figma-id="demo:secondary">查看规则</div>'}</div></section>
  <section class="preview" data-figma-id="demo:preview"><div class="toolbar"><div class="dots"><i class="dot"></i><i class="dot"></i><i class="dot"></i></div><span class="tag">LATEST RUN</span></div><div class="score" data-figma-id="demo:score"><strong>${actual ? "92.8" : "96.4"}%</strong><span>视觉相似度</span></div><div class="bars"><i class="bar"></i><i class="bar"></i><i class="bar"></i><i class="bar"></i><i class="bar"></i></div><div class="metrics"><div class="metric" data-figma-id="demo:error"><span>错误</span><b>${actual ? "5" : "2"}</b></div><div class="metric" data-figma-id="demo:warning"><span>警告</span><b>${actual ? "9" : "4"}</b></div></div></section></main></body></html>`;
}

function typeFor(element: DomElement): string {
  if (/^h\d$|p|span$/.test(element.tag) || element.text) return "TEXT";
  if (element.tag === "svg" || element.tag === "img") return "VECTOR";
  return "FRAME";
}

function referenceElements(elements: DomElement[]): DesignElement[] {
  return elements
    .filter((element) => element.dataFigmaId)
    .map((element) => ({
      id: element.dataFigmaId!,
      name: names[element.dataFigmaId!] ?? element.dataFigmaId!,
      type: typeFor(element),
      text: element.text,
      box: element.box,
      style: element.style
    }));
}

export async function createDemoSources(
  baseUrl: string,
  config: AcceptanceConfig
): Promise<{ design: DesignSource; actual: Awaited<ReturnType<typeof capturePage>> }> {
  const viewport = { width: 1280, height: 800 };
  return withBrowser(async (browser) => {
    const reference = await capturePage(`${baseUrl}/demo/reference`, viewport, config, browser);
    const actual = await capturePage(`${baseUrl}/demo/actual`, viewport, config, browser);
    return {
      design: {
        label: "内置基准页面",
        image: reference.image,
        viewport,
        elements: referenceElements(reference.elements),
        diagnostics: [`内置样本提供 ${referenceElements(reference.elements).length} 个精确映射节点。`]
      },
      actual
    };
  });
}
