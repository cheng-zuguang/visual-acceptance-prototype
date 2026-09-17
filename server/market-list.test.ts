import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type {
  ActualEvidenceElement,
  DesignTruth,
  DesignTruthNode,
  DomElement
} from "../src/types";
import { analyzeMarketLists } from "./market-list";
import { compareDesignToPage } from "./compare";
import { parseAcceptanceYaml } from "./default-rules";

const box = (x: number, y: number, width: number, height: number) => ({
  x, y, width, height
});

function designNode(
  id: string,
  name: string,
  nodeBox: ReturnType<typeof box>,
  children: DesignTruthNode[] = [],
  style: DesignTruthNode["style"] = {}
): DesignTruthNode {
  return {
    id,
    name,
    type: children.length ? "FRAME" : "TEXT",
    box: nodeBox,
    relativeBox: nodeBox,
    style,
    children
  };
}

function actual(
  element: DomElement & {
    parentSelector?: string;
    subtreeSignature?: string;
  }
): ActualEvidenceElement {
  return {
    ...element,
    fingerprint: {
      key: element.dataFigmaId
        ? `figma:${element.dataFigmaId}`
        : `dom:${element.selector}`,
      identitySource: element.dataFigmaId ? "figma-id" : "dom-structure",
      tag: element.tag,
      selector: element.selector,
      region: "middle-center",
      geometryBucket: "0:0:0:0",
      styleSignature: ""
    }
  };
}

function scenario(): { design: DesignTruth; elements: ActualEvidenceElement[] } {
  const header = designNode("list:header", "表头", box(0, 0, 300, 28), [
    designNode("header:name", "名称", box(0, 0, 120, 28), [], { textAlign: "left" }),
    designNode("header:price", "最新价", box(120, 0, 90, 28), [], { textAlign: "right" }),
    designNode("header:change", "涨跌幅", box(210, 0, 90, 28), [], { textAlign: "right" })
  ]);
  const row = designNode("list:row", "行情行模板", box(0, 32, 300, 44), [
    designNode("row:name", "证券名称", box(0, 0, 120, 44), [], { textAlign: "left" }),
    designNode("row:price", "最新价", box(120, 0, 90, 44), [], { textAlign: "right" }),
    designNode("row:change", "涨跌幅", box(210, 0, 90, 44), [], { textAlign: "right" })
  ], { borderWidth: 1, borderColor: "#dddddd" });
  const list = designNode("list:quotes", "自选行情", box(0, 0, 300, 180), [header, row]);
  list.layout = { mode: "VERTICAL", itemSpacing: 4 };
  const design: DesignTruth = {
    source: { kind: "demo", name: "market-list" },
    render: {
      image: Buffer.alloc(0),
      viewport: { width: 300, height: 180 }
    },
    root: designNode("root", "页面", box(0, 0, 300, 180), [list]),
    diagnostics: []
  };

  const elements: ActualEvidenceElement[] = [
    actual({
      selector: "#quotes",
      tag: "section",
      dataFigmaId: "list:quotes",
      box: box(0, 0, 300, 180),
      style: {},
      subtreeSignature: "section>header+div.row*"
    }),
    actual({
      selector: "#quotes > header",
      parentSelector: "#quotes",
      subtreeSignature: "header>span*3",
      tag: "header",
      box: box(0, 0, 300, 28),
      style: {}
    })
  ];
  [32, 80, 128].forEach((y, rowIndex) => {
    const rowSelector = `#quotes > .row:nth-of-type(${rowIndex + 1})`;
    elements.push(actual({
      selector: rowSelector,
      parentSelector: "#quotes",
      subtreeSignature: "div.row>span*3",
      tag: "div",
      box: box(0, y, 300, 44),
      style: { borderWidth: 1, borderColor: "rgb(221, 221, 221)" }
    }));
    [
      [0, 120, "平安银行", "left"],
      [120, 90, `${10 + rowIndex}.20`, "right"],
      [210, 90, `${rowIndex % 2 ? "-" : "+"}1.20%`, "right"]
    ].forEach(([x, width, text, textAlign], columnIndex) => {
      elements.push(actual({
        selector: `${rowSelector} > span:nth-of-type(${columnIndex + 1})`,
        parentSelector: rowSelector,
        subtreeSignature: "span",
        tag: "span",
        text: String(text),
        box: box(Number(x), y, Number(width), 44),
        style: { textAlign: String(textAlign) }
      }));
    });
  });
  return { design, elements };
}

test("recognizes one Figma list template from a repeated DOM subtree", () => {
  const { design, elements } = scenario();

  const analysis = analyzeMarketLists(design, elements, "zh-CN");

  assert.equal(analysis.summary.matches.length, 1);
  assert.deepEqual(analysis.summary.matches[0].rowSelectors, [
    "#quotes > .row:nth-of-type(1)",
    "#quotes > .row:nth-of-type(2)",
    "#quotes > .row:nth-of-type(3)"
  ]);
  assert.equal(analysis.summary.matches[0].columns.length, 3);
  assert.equal(analysis.summary.matches[0].rowTemplate.figmaNodeId, "list:row");
  assert.deepEqual(
    analysis.summary.matches[0].evidenceConfidence.basis,
    ["exact-id", "repeated-structure", "structure-geometry"]
  );
  assert.equal(analysis.templateBindings.length, 9);
});

test("reports deterministic header, column, row, gap, divider, and alignment differences", async () => {
  const { design, elements } = scenario();
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;
  const header = elements.find((element) => element.selector === "#quotes > header")!;
  header.box.height = 36;
  const rows = elements.filter((element) => element.parentSelector === "#quotes" && element.tag === "div");
  rows.forEach((row, index) => {
    row.box.y = 36 + index * 60;
    row.box.height = 50;
    row.style.borderWidth = 3;
    row.style.borderColor = "rgb(0, 0, 0)";
    const cells = elements.filter((element) => element.parentSelector === row.selector);
    cells.forEach((cell, columnIndex) => {
      cell.box.x = columnIndex * 100;
      cell.box.y = row.box.y;
      cell.box.width = 100;
      cell.box.height = 50;
    });
    cells[0].style.textAlign = "right";
  });

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples: [{ index: 0, capturedAtMs: 0, image, elements, audits: [] }],
      canonicalSampleIndex: 0,
      elementChanges: [],
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const rules = new Set(result.issues.map((issue) => issue.rule));
  assert.equal(rules.has("market_list_header"), true);
  assert.equal(rules.has("market_list_column_width"), true);
  assert.equal(rules.has("market_list_row_height"), true);
  assert.equal(rules.has("market_list_row_gap"), true);
  assert.equal(rules.has("market_list_divider"), true);
  assert.equal(rules.has("market_list_alignment"), true);
});

function newsScenario() {
  const {design, elements} = scenario();
  const list = design.root.children[0];
  const heading = list.children[0];
  heading.name = "热点解读";
  heading.text = "热点解读";
  heading.type = "TEXT";
  heading.children = [];
  list.children[1].name = "编组";
  const secondRow = structuredClone(list.children[1]);
  secondRow.id = "list:second";
  secondRow.box!.y = 80;
  list.children.push(secondRow);
  elements[0].dataFigmaId = undefined;
  const actualHeading = elements[1];
  actualHeading.text = "热点解读";
  return {design, elements, heading, actualHeading};
}

test("recognizes unnamed repeated news cards through a verified heading binding without Figma DOM ids", () => {
  const {design, elements, heading, actualHeading} = newsScenario();
  const result = analyzeMarketLists(design, elements, "zh-CN", [{design: heading, actual: actualHeading}]);
  assert.equal(result.summary.matches.length, 1);
  assert.equal(result.summary.matches[0].actualRowCount, 3);
  assert.equal(result.templateBindings.length, 9);
});

test("publishes news template typography findings through the full review without DOM design ids", async () => {
  const {design, elements} = newsScenario();
  const row = design.root.children[0].children[1];
  row.children[0].style.fontSize = 12;
  row.children[0].text = "设计中的动态标题";
  elements.filter(element => element.selector.endsWith("span:nth-of-type(1)"))
    .forEach(element => {element.style.fontSize = 20;});
  const image = await sharp({create: {width: 300, height: 180, channels: 4, background: "white"}}).png().toBuffer();
  design.render.image = image;
  const result = await compareDesignToPage(design, {
    kind: "live", sourceUrl: "https://example.test/news", finalUrl: "https://example.test/news",
    viewport: design.render.viewport, samples: [{index: 0, capturedAtMs: 0, image, elements, audits: []}],
    canonicalSampleIndex: 0, elementChanges: [], pixelVariance: {image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1}, diagnostics: []
  }, parseAcceptanceYaml(), "zh-CN");
  assert.equal(result.marketLists.matches.length, 1);
  assert.ok(result.issues.some(issue => issue.rule === "typography" && issue.figmaNodeId === row.children[0].id));
  assert.equal(result.issues.some(issue => issue.rule === "content" && issue.figmaNodeId === row.children[0].id), false);
});

test("detects missing nested news fields without shifting the remaining fields into false bindings", () => {
  const {design, elements, heading, actualHeading} = newsScenario();
  for (const row of design.root.children[0].children.slice(1)) {
    row.children[0] = designNode(`${row.id}:title`, "编组", box(0, 32, 300, 20), [
      {...designNode(`${row.id}:badge`, "所长早读", box(0, 32, 60, 20)), text: "所长早读"},
      {...designNode(`${row.id}:headline`, "标题内容", box(60, 32, 240, 20)), text: "设计标题"}
    ]);
  }
  const result = analyzeMarketLists(design, elements, "zh-CN", [{design: heading, actual: actualHeading}]);
  assert.equal(result.summary.matches[0]?.expectedColumnCount, 4);
  assert.equal(result.summary.matches[0]?.actualColumnCount, 3);
  assert.equal(result.templateBindings.length, 0);
});

test("reports a deterministic column-count mismatch for otherwise repeated rows", async () => {
  const { design, elements } = scenario();
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;
  const twoColumnElements = elements.filter(
    (element) => !element.selector.endsWith("span:nth-of-type(3)")
  );
  twoColumnElements
    .filter((element) => element.parentSelector === "#quotes" && element.tag === "div")
    .forEach((row) => { row.subtreeSignature = "div.row>span*2"; });

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples: [{
        index: 0,
        capturedAtMs: 0,
        image,
        elements: twoColumnElements,
        audits: []
      }],
      canonicalSampleIndex: 0,
      elementChanges: [],
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.marketLists.matches.length, 1);
  assert.equal(result.issues.some((issue) =>
    issue.rule === "market_list_column_count"
  ), true);
});

test("reuses verified market-value normalization for every repeated row", async () => {
  const { design, elements } = scenario();
  const list = design.root.children[0];
  const rowTemplate = list.children[1];
  rowTemplate.children[1].text = "10.00";
  rowTemplate.children[2].text = "+1.00%";
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;
  const dynamicCells = elements.filter((element) =>
    element.parentSelector?.includes(".row:nth-of-type") &&
    !element.selector.endsWith("span:nth-of-type(1)")
  );
  const samples = [0, 1, 2].map((sampleIndex) => ({
    index: sampleIndex,
    capturedAtMs: sampleIndex,
    image,
    elements: elements.map((element) => {
      const dynamicIndex = dynamicCells.findIndex(
        (candidate) => candidate.selector === element.selector
      );
      if (dynamicIndex < 0) return { ...element, style: { ...element.style } };
      const isPercentage = element.selector.endsWith("span:nth-of-type(3)");
      return {
        ...element,
        text: isPercentage
          ? `${sampleIndex % 2 ? "-" : "+"}${dynamicIndex + sampleIndex + 1}.20%`
          : `${10 + dynamicIndex + sampleIndex}.20`,
        style: { ...element.style }
      };
    }),
    audits: []
  }));

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples,
      canonicalSampleIndex: 2,
      elementChanges: dynamicCells.map((element) => ({
        fingerprintKey: element.fingerprint.key,
        selector: element.selector,
        observedSampleIndexes: [0, 1, 2],
        presentInAllSamples: true,
        textChanged: true,
        geometryChanged: false,
        styleChanged: false,
        observedTexts: samples.map((sample) =>
          sample.elements.find((candidate) => candidate.selector === element.selector)!.text!
        )
      })),
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 6);
  assert.deepEqual(
    new Set(result.dynamicNormalization.regions.map((region) => region.figmaNodeId)),
    new Set(["row:price", "row:change"])
  );
  assert.equal(
    result.dynamicNormalization.regions.every(
      (region) => region.strategy === "normalize-market-value-text"
    ),
    true
  );
});

test("reuses design-backed MarketVariants for colors and icons in every row", async () => {
  const { design, elements } = scenario();
  const rowChange = design.root.children[0].children[1].children[2];
  rowChange.type = "INSTANCE";
  rowChange.text = "+1.00%";
  rowChange.component = { kind: "instance", componentId: "variant:up" };
  const makeVariant = (
    id: string,
    sampleText: string,
    color: string,
    iconName: string
  ): DesignTruthNode => ({
    id,
    parentId: "set:row-market",
    name: id,
    type: "COMPONENT",
    box: box(0, 0, 90, 44),
    relativeBox: box(0, 0, 90, 44),
    style: { color },
    component: {
      kind: "component",
      componentSetId: "set:row-market",
      variantProperties: { "自定义状态": id }
    },
    children: [
      {
        id: `${id}:sample`,
        parentId: id,
        name: "示例",
        type: "TEXT",
        text: sampleText,
        box: box(0, 0, 65, 44),
        relativeBox: box(0, 0, 65, 44),
        style: { color },
        children: []
      },
      {
        id: `${id}:icon`,
        parentId: id,
        name: iconName,
        type: "VECTOR",
        box: box(70, 18, 8, 8),
        relativeBox: box(70, 18, 8, 8),
        style: { color },
        children: []
      }
    ]
  });
  design.root.children.push({
    id: "set:row-market",
    parentId: "root",
    name: "行内行情状态",
    type: "COMPONENT_SET",
    box: box(0, 0, 90, 88),
    relativeBox: box(0, 0, 90, 88),
    style: {},
    component: { kind: "component-set" },
    children: [
      makeVariant("variant:up", "+1.00%", "#ff0000", "向上箭头"),
      makeVariant("variant:down", "-1.00%", "#00aa00", "向下箭头")
    ]
  });
  const changeCells = elements.filter((element) =>
    element.selector.endsWith("span:nth-of-type(3)")
  );
  changeCells.forEach((cell, index) => {
    const isDown = index === 1;
    cell.style.color = isDown ? "#ff0000" : "#ff0000";
    elements.push(actual({
      selector: `${cell.selector} > svg`,
      parentSelector: cell.selector,
      subtreeSignature: "svg",
      tag: "svg",
      role: "img",
      box: box(280, cell.box.y + 18, 8, 8),
      style: { color: cell.style.color }
    }));
  });
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples: [{ index: 0, capturedAtMs: 0, image, elements, audits: [] }],
      canonicalSampleIndex: 0,
      elementChanges: [],
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.marketVariants.matches.length, 3);
  assert.equal(result.issues.some((issue) =>
    issue.rule === "market_variant_color" &&
    issue.selector === changeCells[1].selector
  ), true);
  assert.equal(result.issues.some((issue) =>
    issue.rule === "market_variant_icon"
  ), false);
});

test("keeps template findings stable when market data order and reasonable row count change", () => {
  const first = scenario();
  const second = scenario();
  second.elements = second.elements.filter(
    (element) =>
      !element.selector.includes(".row:nth-of-type(3)")
  );
  const firstNames = second.elements.filter((element) =>
    element.selector.endsWith("span:nth-of-type(1)")
  );
  [firstNames[0].text, firstNames[1].text] = [firstNames[1].text, firstNames[0].text];
  second.elements
    .filter((element) => element.selector.endsWith("span:nth-of-type(2)"))
    .forEach((element, index) => { element.text = String(900 - index * 100); });

  const firstAnalysis = analyzeMarketLists(first.design, first.elements, "zh-CN");
  const secondAnalysis = analyzeMarketLists(second.design, second.elements, "zh-CN");
  const stableShape = (analysis: ReturnType<typeof analyzeMarketLists>) => ({
    matchCount: analysis.summary.matches.length,
    expectedColumnCount: analysis.summary.matches[0].expectedColumnCount,
    actualColumnCount: analysis.summary.matches[0].actualColumnCount,
    headerHeight: analysis.summary.matches[0].header.actualHeight,
    rowHeight: analysis.summary.matches[0].rowTemplate.actualHeight,
    rowGap: analysis.summary.matches[0].rowTemplate.actualGap,
    columnWidths: analysis.summary.matches[0].columns.map((column) => column.actualWidth),
    unresolved: analysis.summary.unresolved.length
  });

  assert.deepEqual(stableShape(secondAnalysis), stableShape(firstAnalysis));
  assert.equal(firstAnalysis.summary.matches[0].actualRowCount, 3);
  assert.equal(secondAnalysis.summary.matches[0].actualRowCount, 2);
});

test("falls back to element-level review and marks the list pending when repetition is unreliable", async () => {
  const { design, elements } = scenario();
  const oneRowElements = elements.filter(
    (element) =>
      !element.selector.includes(".row:nth-of-type(2)") &&
      !element.selector.includes(".row:nth-of-type(3)")
  );
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples: [{
        index: 0,
        capturedAtMs: 0,
        image,
        elements: oneRowElements,
        audits: []
      }],
      canonicalSampleIndex: 0,
      elementChanges: [],
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.marketLists.matches.length, 0);
  assert.equal(result.marketLists.unresolved.length, 1);
  assert.equal(result.issues.some((issue) =>
    issue.rule === "market_list_structure" && issue.severity === "pending"
  ), true);
  assert.ok(result.matching.matches.length > 0);
});

test("reports clipping, squeezed columns, and horizontal overflow caused by long row content", async () => {
  const { design, elements } = scenario();
  const image = await sharp({
    create: {
      width: 300,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  design.render.image = image;
  const firstRow = "#quotes > .row:nth-of-type(1)";
  const longName = elements.find(
    (element) => element.selector === `${firstRow} > span:nth-of-type(1)`
  )!;
  const longNumber = elements.find(
    (element) => element.selector === `${firstRow} > span:nth-of-type(2)`
  )!;
  longName.text = "这是一个非常长且会被裁切的证券名称";
  longNumber.text = "123456789012345.6789";
  elements
    .filter((element) => element.selector.endsWith("span:nth-of-type(1)"))
    .forEach((element) => { element.box.width = 80; });

  const result = await compareDesignToPage(
    design,
    {
      kind: "live",
      sourceUrl: "https://example.test/list",
      finalUrl: "https://example.test/list",
      viewport: { width: 300, height: 180 },
      samples: [{
        index: 0,
        capturedAtMs: 0,
        image,
        elements,
        audits: [
          {
            rule: "clipped_text",
            selector: longName.selector,
            summary: "文本可能被截断：长证券名称",
            box: longName.box
          },
          {
            rule: "clipped_text",
            selector: longNumber.selector,
            summary: "文本可能被截断：长行情数字",
            box: longNumber.box
          },
          {
            rule: "horizontal_overflow",
            selector: "html",
            summary: "页面横向宽度超出视口。"
          }
        ]
      }],
      canonicalSampleIndex: 0,
      elementChanges: [],
      pixelVariance: {
        image,
        changedPixelCount: 0,
        changedPixelRatio: 0,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(
    result.issues.filter((issue) => issue.rule === "clipped_text").length,
    2
  );
  assert.equal(result.issues.some((issue) =>
    issue.rule === "market_list_column_width"
  ), true);
  assert.equal(result.issues.some((issue) =>
    issue.rule === "horizontal_overflow"
  ), true);
});

test("each repeated row retains its own height check and is not reported as extra actual content", async () => {
  const { design, elements } = scenario();
  const third = elements.find(item => item.selector === "#quotes > .row:nth-of-type(3)")!;
  third.box.height = 60;
  const image = await sharp({create: {width: 300, height: 200, channels: 4, background: "white"}}).png().toBuffer(); design.render.image = image;
  const result = await compareDesignToPage(design, { kind: "live", sourceUrl: "https://example.test", finalUrl: "https://example.test", viewport: design.render.viewport,
    samples: [0, 1, 2].map(index => ({index, capturedAtMs: index, image, elements, audits: []})), canonicalSampleIndex: 2, elementChanges: [], pixelVariance: {image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1}, diagnostics: [] }, parseAcceptanceYaml(), "en");
  const row = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "list:row")!;
  assert.equal(row.checks?.find(check => check.selector === third.selector && check.property === "height")?.status, "difference");
  assert.ok(!result.matching.designCoverage!.actualItems?.some(item => item.selector === third.selector));
});

test("verified list text excludes data pixels while retaining row decoration differences", async () => {
  const { design, elements } = scenario();
  const image = await sharp({create: {width: 300, height: 180, channels: 4, background: 'white'}}).png().toBuffer();
  design.render.image = image;
  const dataPixels = await sharp({create: {width: 40, height: 12, channels: 4, background: 'black'}}).png().toBuffer();
  const actualImage = await sharp(image).composite([{input: dataPixels, left: 5, top: 40}]).png().toBuffer();
  elements.find(item => item.selector === '#quotes > .row:nth-of-type(1)')!.style.borderWidth = 4;
  const result = await compareDesignToPage(design, {kind: 'live', sourceUrl: 'https://example.test', finalUrl: 'https://example.test', viewport: design.render.viewport,
    samples: [0,1,2].map(index => ({index, capturedAtMs: index, image: actualImage, elements, audits: []})), canonicalSampleIndex: 2, elementChanges: [], pixelVariance: {image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1}, diagnostics: []}, parseAcceptanceYaml(), 'en');
  assert.equal(result.matching.visualScope?.changedPixels, 0, 'verified variable text must not leak into pixel failures');
  const row = result.matching.designCoverage!.items.find(item => item.figmaNodeId === 'list:row')!;
  assert.equal(row.checks?.find(item => item.property === 'borderWidth' && item.selector === '#quotes > .row:nth-of-type(1)')?.status, 'difference');
});

test("a bound numeric table is reviewed without special Figma header and row names", async () => {
  const {design,elements}=scenario();
  const list=design.root.children[0];list.children[0].name='Group 21';list.children[1].name='Group 22';
  list.children[0].children.forEach((node,i)=>{node.text=['Name','Return','Win rate'][i];});
  list.children[1].children.forEach((node,i)=>{node.text=['Example','12.3%','60.0%'][i];});
  const result=analyzeMarketLists(design,elements,'en');
  assert.equal(result.summary.matches.length,1);
  assert.equal(result.templateBindings.length,9);
});
