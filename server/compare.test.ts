import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type {
  AcceptanceConfig,
  DesignTruth,
  DomElement,
  LiveActualEvidence,
  StaticAudit,
  ReviewIssue
} from "../src/types";
import { compareDesignToPage as compareLiveEvidence } from "./compare";
import { parseAcceptanceYaml } from "./default-rules";

function hasRule(issue: ReviewIssue, rule: string): boolean {
  return issue.rule === rule || issue.evidence.some(item => item.rule === rule);
}

async function solidPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

test("accounts for every design item even when matching finds no actual counterpart", async () => {
  const image = await solidPng();
  const box = { x: 1, y: 1, width: 10, height: 10 };
  const design = designTruth(image, [{
    id: "card", name: "最新货币政策", type: "GROUP", box, style: {},
    children: [{ id: "heading", name: "标题", type: "TEXT", text: "最新货币政策", box, style: {}, children: [] }]
  }]);
  const result = await compareDesignToPage(design, {
    image, elements: [], audits: [], diagnostics: [], finalUrl: "https://example.test"
  }, parseAcceptanceYaml(""), "zh-CN");
  assert.deepEqual(result.matching.designCoverage?.items.map(item => item.figmaNodeId), ["card", "heading"]);
  assert.equal(result.matching.designCoverage?.items[0].status, "outside-scope");
  assert.ok(!result.issues.some(issue => hasRule(issue, "design_coverage_unverified")));
  assert.ok(!result.issues.some(issue => hasRule(issue, "missing_module")));
});

test("keeps design-only modules outside H5 scope even with complete static capture", async () => {
  const image = await solidPng();
  const box = { x: 1, y: 1, width: 10, height: 10 };
  const design = designTruth(image, [{
    id: "policy", name: "最新货币政策", type: "GROUP", box, style: {}, children: [
      { id: "policy-title", name: "标题", type: "TEXT", text: "最新货币政策", box, style: {}, children: [] },
      { id: "policy-label", name: "标签", type: "TEXT", text: "决议时间", box, style: {}, children: [] }
    ]
  }]);
  const evidence = liveEvidence({ image, elements: [], audits: [], diagnostics: [], finalUrl: "https://example.test" });
  evidence.samples = [0, 1, 2].map(index => ({ ...evidence.samples[0], index, coverage: {
    fullDocument: true, elementLimitReached: false, opaqueContent: false, excludedContent: false
  } }));
  const result = await compareLiveEvidence(design, evidence, parseAcceptanceYaml(""), "zh-CN");
  const missing = result.issues.filter(issue => hasRule(issue, "missing_module"));
  assert.equal(missing.length, 0);
  assert.equal(result.matching.designCoverage?.policy, "actual-driven");
  assert.ok(result.matching.designCoverage?.items.every(item => item.reviewStatus === "not-applicable" && item.issueIds.length === 0));
  assert.equal(result.matching.semanticAgent?.invoked, false);
});

async function marketPng(
  text: string,
  fontSize = 14,
  position: { x: number; y: number } = { x: 4, y: 22 }
): Promise<Buffer> {
  return sharp(
    Buffer.from(`<svg width="100" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="40" fill="white"/>
      <text x="${position.x}" y="${position.y}" font-family="Arial" font-size="${fontSize}" fill="black">${text}</text>
    </svg>`)
  ).png().toBuffer();
}

function designTruth(image: Buffer, children: DesignTruth["root"]["children"]): DesignTruth {
  return {
    source: {
      kind: "figma",
      fileKey: "FILE_KEY",
      frameId: "1:2",
      frameName: "行情"
    },
    render: {
      image,
      viewport: { width: 16, height: 16 }
    },
    root: {
      id: "1:2",
      name: "行情",
      type: "FRAME",
      box: { x: 0, y: 0, width: 16, height: 16 },
      relativeBox: { x: 0, y: 0, width: 16, height: 16 },
      style: {},
      children
    },
    diagnostics: []
  };
}

function liveEvidence(input: {
  image: Buffer;
  elements: DomElement[];
  audits: StaticAudit[];
  diagnostics: string[];
  finalUrl: string;
}): LiveActualEvidence {
  return {
    kind: "live",
    sourceUrl: input.finalUrl,
    finalUrl: input.finalUrl,
    viewport: { width: 16, height: 16 },
    samples: [
      {
        index: 0,
        capturedAtMs: 0,
        image: input.image,
        elements: input.elements.map((element) => ({
          ...element,
          fingerprint: {
            key: element.dataFigmaId
              ? `figma:${element.dataFigmaId}`
              : `dom:${element.tag}:${element.selector}`,
            identitySource: element.dataFigmaId ? "figma-id" : "dom-structure",
            tag: element.tag,
            selector: element.selector,
            region: "top-left",
            geometryBucket: "0:0:0:0",
            styleSignature: ""
          }
        })),
        audits: input.audits
      }
    ],
    canonicalSampleIndex: 0,
    elementChanges: [],
    pixelVariance: {
      image: input.image,
      changedPixelCount: 0,
      changedPixelRatio: 0,
      threshold: 0.1
    },
    diagnostics: input.diagnostics
  };
}

function compareDesignToPage(
  design: DesignTruth,
  evidence: LiveActualEvidence | Parameters<typeof liveEvidence>[0],
  config: AcceptanceConfig,
  locale: "zh-CN" | "en"
) {
  return compareLiveEvidence(
    design,
    "kind" in evidence ? evidence : liveEvidence(evidence),
    config,
    locale
  );
}

async function dynamicMarketScenario(
  sampleTexts: string[],
  options: {
    designText?: string;
    designName?: string;
    designFontFamily?: string;
    designTextAlign?: string;
    actualFontSize?: number;
    actualFontFamily?: string;
    actualTextAlign?: string;
    actualBox?: { x: number; y: number; width: number; height: number };
    audits?: StaticAudit[];
  } = {}
) {
  const designText = options.designText ?? "100.00";
  const designBox = { x: 4, y: 8, width: 40, height: 16 };
  const actualBox = options.actualBox ?? designBox;
  const actualFontSize = options.actualFontSize ?? 14;
  const actualFontFamily = options.actualFontFamily ?? "Arial";
  const actualTextAlign = options.actualTextAlign ?? "right";
  const designImage = await marketPng(designText);
  const images = await Promise.all(
    sampleTexts.map((text) =>
      marketPng(text, actualFontSize, {
        x: actualBox.x,
        y: actualBox.y + actualFontSize
      })
    )
  );
  const fingerprint = {
    key: "figma:2:price",
    identitySource: "figma-id" as const,
    tag: "span",
    selector: "#price",
    region: "middle-left",
    geometryBucket: `${actualBox.x}:${actualBox.y}:${actualBox.width}:${actualBox.height}`,
    styleSignature: `font-size=${actualFontSize};color=rgb(0, 0, 0)`
  };
  const truth = designTruth(designImage, [
    {
      id: "2:price",
      parentId: "1:2",
      name: options.designName ?? "最新价",
      type: "TEXT",
      text: designText,
      box: designBox,
      relativeBox: designBox,
      style: {
        fontFamily: options.designFontFamily ?? "Arial",
        fontSize: 14,
        color: "#000000",
        textAlign: options.designTextAlign ?? "right"
      },
      children: []
    }
  ]);
  truth.render.viewport = { width: 100, height: 40 };
  truth.root.box = { x: 0, y: 0, width: 100, height: 40 };
  const evidence: LiveActualEvidence = {
    kind: "live",
    sourceUrl: "https://example.test/market",
    finalUrl: "https://example.test/market",
    viewport: { width: 100, height: 40 },
    samples: sampleTexts.map((text, index) => ({
      index,
      capturedAtMs: index * 750,
      image: images[index],
      elements: [
        {
          selector: "#price",
          tag: "span",
          dataFigmaId: "2:price",
          text,
          box: actualBox,
          style: {
            fontFamily: actualFontFamily,
            fontSize: actualFontSize,
            color: "rgb(0, 0, 0)",
            textAlign: actualTextAlign,
            textBounds: {x: actualBox.x + (actualTextAlign === "right" ? actualBox.width - 20 : actualTextAlign === "center" ? (actualBox.width - 20) / 2 : 0), y: actualBox.y, width:20, height: actualBox.height}
          },
          fingerprint
        }
      ],
      audits: options.audits ?? []
    })),
    canonicalSampleIndex: sampleTexts.length - 1,
    elementChanges: [
      {
        fingerprintKey: fingerprint.key,
        selector: "#price",
        observedSampleIndexes: sampleTexts.map((_, index) => index),
        presentInAllSamples: true,
        textChanged: new Set(sampleTexts).size > 1,
        geometryChanged: false,
        styleChanged: false,
        observedTexts: Array.from(new Set(sampleTexts))
      }
    ],
    pixelVariance: {
      image: images.at(-1)!,
      changedPixelCount: 1,
      changedPixelRatio: 0.00025,
      threshold: 0.1
    },
    diagnostics: []
  };
  return { truth, evidence, box: designBox };
}

async function marketVariantScenario(
  actualText = "-1.20%",
  actualColor = "#00aa00",
  actualIconBox = { x: 80, y: 12, width: 8, height: 8 }
) {
  const image = await marketPng(actualText);
  const makeVariant = (
    id: string,
    propertyValue: string,
    sampleText: string,
    color: string,
    iconName: string
  ): DesignTruth["root"]["children"][number] => ({
    id,
    parentId: "set:market",
    name: propertyValue,
    type: "COMPONENT",
    box: { x: 0, y: 0, width: 40, height: 16 },
    relativeBox: { x: 0, y: 0, width: 40, height: 16 },
    style: { color },
    component: {
      kind: "component",
      componentSetId: "set:market",
      variantProperties: { "项目状态": propertyValue }
    },
    children: [
      {
        id: `${id}:text`,
        parentId: id,
        name: "示例数值",
        type: "TEXT",
        text: sampleText,
        box: { x: 0, y: 0, width: 28, height: 16 },
        relativeBox: { x: 0, y: 0, width: 28, height: 16 },
        style: { color },
        children: []
      },
      {
        id: `${id}:icon`,
        parentId: id,
        name: iconName,
        type: "VECTOR",
        box: { x: 30, y: 4, width: 8, height: 8 },
        relativeBox: { x: 30, y: 4, width: 8, height: 8 },
        style: { color },
        children: []
      }
    ]
  });
  const truth = designTruth(image, [
    {
      id: "set:market",
      parentId: "1:2",
      name: "行情状态组件",
      type: "COMPONENT_SET",
      box: { x: 0, y: 0, width: 40, height: 48 },
      relativeBox: { x: 0, y: 0, width: 40, height: 48 },
      style: {},
      component: { kind: "component-set" },
      children: [
        makeVariant("variant:a", "自定义甲", "+1.00%", "#ff0000", "向上箭头"),
        makeVariant("variant:b", "自定义乙", "-1.00%", "#00aa00", "向下箭头"),
        makeVariant("variant:c", "自定义丙", "0.00%", "#777777", "横线图标")
      ]
    },
    {
      id: "2:quote",
      parentId: "1:2",
      name: "当前行情",
      type: "INSTANCE",
      box: { x: 50, y: 8, width: 40, height: 16 },
      relativeBox: { x: 50, y: 8, width: 40, height: 16 },
      style: {},
      component: { kind: "instance", componentId: "variant:a" },
      children: []
    }
  ]);
  truth.render.viewport = { width: 100, height: 40 };
  truth.root.box = { x: 0, y: 0, width: 100, height: 40 };
  const evidence = liveEvidence({
    image,
    elements: [
      {
        selector: "#quote",
        tag: "div",
        dataFigmaId: "2:quote",
        text: actualText,
        box: { x: 50, y: 8, width: 40, height: 16 },
        style: { color: actualColor }
      },
      {
        selector: "#quote svg",
        tag: "svg",
        role: "img",
        box: actualIconBox,
        style: { color: actualColor }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/market"
  });
  return { truth, evidence };
}

test("normalizes changing market-value characters after three stable samples", async () => {
  const texts = ["101.00", "102.00", "103.00"];
  const { truth, evidence, box } = await dynamicMarketScenario(texts);

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.similarity, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.dynamicNormalization.dynamicRegionAreaRatio, 0.16);
  assert.deepEqual(result.dynamicNormalization.regions.map((region) => ({
    kind: region.kind,
    strategy: region.strategy,
    figmaNodeId: region.figmaNodeId,
    selector: region.selector,
    designBox: region.designBox,
    actualBox: region.actualBox
  })), [
    {
      kind: "market-value",
      strategy: "normalize-market-value-text",
      figmaNodeId: "2:price",
      selector: "#price",
      designBox: box,
      actualBox: box
    }
  ]);
});

test("maps custom Figma Variant names to a design-backed market semantic", async () => {
  const { truth, evidence } = await marketVariantScenario();

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.marketVariants.matches.length, 1);
  assert.equal(result.marketVariants.matches[0].semantic, "market.down");
  assert.equal(result.marketVariants.matches[0].originalPropertyValue, "自定义乙");
  assert.equal(result.marketVariants.matches[0].expectedVariantNodeId, "variant:b");
  assert.deepEqual(result.marketVariants.matches[0].evidence.signals.sort(), [
    "color",
    "icon-direction",
    "text-sign"
  ]);
});

test("keeps visually distinct Figma states neutral when market semantics are unsupported", async () => {
  const { truth, evidence } = await marketVariantScenario("1.20%", "#123456");
  const variants = truth.root.children[0].children;
  variants.forEach((variant, index) => {
    variant.name = `项目自定义${index + 1}`;
    variant.component!.variantProperties = { "项目状态": `项目自定义${index + 1}` };
    variant.children[0].text = `示例${index + 1}`;
    variant.children[1].name = `项目图形${index + 1}`;
  });

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.deepEqual(
    result.marketVariants.catalog.map((variant) => variant.semantic),
    ["variant-A", "variant-B", "variant-C"]
  );
  assert.equal(result.marketVariants.catalog.some((variant) =>
    variant.semantic.startsWith("market.")
  ), false);
});

test("compares the actual market color with the mapped Figma Variant", async () => {
  const { truth, evidence } = await marketVariantScenario("-1.20%", "#123456");

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const issue = result.issues.find((candidate) => hasRule(candidate, "market_variant_color"));
  assert.equal(issue?.expected, "#00aa00");
  assert.equal(issue?.actual, "#123456");
  assert.equal(issue?.figmaNodeId, "2:quote");
});

test("uses Figma Variant colors instead of assuming a red-up or green-down convention", async () => {
  const { truth, evidence } = await marketVariantScenario("-1.20%", "#ff0000");
  const variants = truth.root.children[0].children;
  variants[0].style.color = "#00aa00";
  variants[0].children.forEach((child) => { child.style.color = "#00aa00"; });
  variants[1].style.color = "#ff0000";
  variants[1].children.forEach((child) => { child.style.color = "#ff0000"; });

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.marketVariants.matches[0].semantic, "market.down");
  assert.equal(result.issues.some((issue) => hasRule(issue, "market_variant_color")), false);
});

test("marks a signed market state pending when design-side Variant evidence is missing", async () => {
  const { truth, evidence } = await marketVariantScenario();
  truth.root.children = truth.root.children.filter((node) => node.id !== "set:market");

  truth.root.children[0].style.color = "#abcdef";
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.matching.designCoverage!.items.find(item => item.figmaNodeId === "2:quote")!.checks!.find(check => check.property === "color")?.status, "pending");
  assert.ok(!result.issues.some(issue => hasRule(issue, "color") && issue.figmaNodeId === "2:quote"));
  assert.equal(result.marketVariants.matches.length, 0);
  assert.equal(result.marketVariants.unresolved.length, 1);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "market_variant") && issue.severity === "pending"
  ), true);
});

test("reports target Variant icon position and size differences", async () => {
  const { truth, evidence } = await marketVariantScenario(
    "-1.20%",
    "#00aa00",
    { x: 72, y: 16, width: 13, height: 6 }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "market_variant_icon_position")
  ), true);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "market_variant_icon_size")
  ), true);
});

test("reports a missing icon required by the mapped Figma Variant", async () => {
  const { truth, evidence } = await marketVariantScenario();
  evidence.samples.forEach((sample) => {
    sample.elements = sample.elements.filter((element) => element.tag !== "svg");
  });

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "market_variant_icon")
  ), true);
});

test("verifies one bounded AgentHypothesis before normalizing an ambiguous dynamic value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101点", "102点", "103点"],
    { designText: "100点" }
  );
  for (const sample of evidence.samples) sample.elements[0].dataFigmaId = undefined;
  const requests: unknown[] = [];

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async (request) => {
        requests.push(request);
        return {
          candidateType: "market-value",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: "figma:2:price"
          },
          strategy: "normalize-market-value-text",
          normalizedProperties: ["text"],
          reasons: ["多帧文本变化且节点身份稳定。"]
        };
      }
    }
  );

  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0] as object).sort(), ["candidate", "locale"]);
  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.dynamicNormalization.regions[0].source, "agent-verified");
  assert.equal(result.dynamicNormalization.regions[0].evidenceConfidence.score, 0.9);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("normalizes an Agent-classified countdown while retaining its typography defect", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["40天", "39天", "38天"],
    { designText: "7天", designName: "议息倒计时天数", actualFontSize: 18 }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => ({
        candidateType: "countdown",
        binding: {
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price"
        },
        strategy: "normalize-countdown-text",
        normalizedProperties: ["text"],
        reasons: ["节点名称和逐帧递减值共同证明这是倒计时。"]
      })
    }
  );

  assert.equal(result.dynamicNormalization.regions[0]?.kind, "countdown");
  assert.equal(result.dynamicNormalization.regions[0]?.strategy, "normalize-countdown-text");
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.issues.some((issue) => hasRule(issue, "typography")), true);
});

test("uses DesignTruth semantics instead of treating every changing number as a market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["40", "39", "38"],
    { designText: "7", designName: "下一次议息会议倒计时天数" }
  );
  let requests = 0;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => {
        requests += 1;
        return {
          candidateType: "countdown",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: "figma:2:price"
          },
          strategy: "normalize-countdown-text",
          normalizedProperties: ["text"],
          reasons: ["DesignTruth 节点语义与递减观测共同证明这是倒计时。"]
        };
      }
    }
  );

  assert.equal(requests, 0);
  assert.equal(result.dynamicNormalization.regions[0]?.kind, "countdown");
});

test("uses sibling evidence to verify a number-only countdown", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["40", "39", "38"],
    { designText: "7", designName: "数值" }
  );
  truth.root.children.push({
    id: "2:unit",
    parentId: truth.root.id,
    name: "单位",
    type: "TEXT",
    text: "天",
    box: { x: 48, y: 8, width: 16, height: 16 },
    relativeBox: { x: 48, y: 8, width: 16, height: 16 },
    style: {},
    children: []
  });
  for (const sample of evidence.samples) {
    sample.elements[0].parentSelector = "#countdown";
    sample.elements.push({
      selector: "#unit",
      parentSelector: "#countdown",
      tag: "span",
      dataFigmaId: "2:unit",
      text: "天",
      box: { x: 48, y: 8, width: 16, height: 16 },
      style: {},
      fingerprint: {
        key: "figma:2:unit",
        identitySource: "figma-id",
        tag: "span",
        selector: "#unit",
        region: "middle-left",
        geometryBucket: "48:8:16:16",
        styleSignature: ""
      }
    });
  }
  let observedContext: string[] = [];

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async (request) => {
        observedContext = [
          ...((request.candidate.design as unknown as { contextTexts?: string[] }).contextTexts ?? []),
          ...((request.candidate.actual as unknown as { contextTexts?: string[] }).contextTexts ?? [])
        ];
        return {
          candidateType: "countdown",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: "figma:2:price"
          },
          strategy: "normalize-countdown-text",
          normalizedProperties: ["text"],
          reasons: ["相邻单位和递减观测共同证明这是倒计时。"]
        };
      }
    }
  );

  assert.deepEqual(observedContext, []);
  assert.equal(result.dynamicNormalization.regions[0]?.source, "deterministic");
  assert.equal(result.dynamicNormalization.regions[0]?.kind, "countdown");
});

test("normalizes a countdown after AI visual-semantic binding", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["7", "7", "7"],
    { designText: "40", designName: "下一次议息会议倒计时天数" }
  );
  const fingerprint = {
    ...evidence.samples[0].elements[0].fingerprint,
    key: "dom:span:#price",
    identitySource: "dom-structure" as const
  };
  for (const sample of evidence.samples) {
    delete sample.elements[0].dataFigmaId;
    sample.elements[0].fingerprint = fingerprint;
  }
  evidence.elementChanges[0].fingerprintKey = fingerprint.key;
  let bindingRequests = 0;
  let dynamicRequests = 0;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async ({ request }) => {
        bindingRequests += 1;
        return {
          pageSummary: "设计和开发中的天数都属于同一倒计时组件。",
          alignmentPlan: { regions: [] },
          bindings: [{
            figmaNodeId: "2:price",
            fingerprintKey: request.actualCandidates[0].fingerprintKey,
            confidence: 0.94,
            reason: "同一倒计时语义和视觉位置。"
          }]
        };
      },
      dynamicHypothesisAgent: async () => {
        dynamicRequests += 1;
        return {
          candidateType: "countdown",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: fingerprint.key
          },
          strategy: "normalize-countdown-text",
          normalizedProperties: ["text"],
          reasons: ["元素语义和多帧稳定证据确认这是倒计时。"]
        };
      }
    }
  );

  assert.equal(bindingRequests, 1);
  assert.equal(dynamicRequests, 1);
  assert.equal(result.matching.matches[0]?.method, "visual-inference");
  assert.equal(result.dynamicNormalization.regions[0]?.kind, "countdown");
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("normalizes an Agent-classified date that stays stable during capture", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["2026-09-17 02:00", "2026-09-17 02:00", "2026-09-17 02:00"],
    { designText: "2027年3月19日 02:00", designName: "下一次议息会议公布时间" }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => ({
        candidateType: "date-time",
        binding: {
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price"
        },
        strategy: "normalize-date-time-text",
        normalizedProperties: ["text"],
        reasons: ["设计值和实际值都是议息会议日期。"]
      })
    }
  );

  assert.equal(result.dynamicNormalization.regions[0]?.kind, "date-time");
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("does not ask the Agent to classify an unsupported static copy difference", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["实际说明", "实际说明", "实际说明"],
    { designText: "设计说明", designName: "风险提示" }
  );

  let requests = 0;
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => {
        requests += 1;
        return {
          candidateType: "probability",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: "figma:2:price"
          },
          strategy: "normalize-probability-text",
          normalizedProperties: ["text"],
          reasons: ["误判为概率。"]
        };
      }
    }
  );

  assert.equal(result.dynamicNormalization.regions.length, 0);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), true);
  assert.equal(requests, 0);
});

test("keeps a content issue when the Agent labels arbitrary changing text as a market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["待定 A", "待定 B", "待定 C"],
    { designText: "行情占位" }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => ({
        candidateType: "market-value",
        binding: {
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price"
        },
        strategy: "normalize-market-value-text",
        normalizedProperties: ["text"],
        reasons: ["误判为行情数值。"]
      })
    }
  );

  assert.equal(result.dynamicNormalization.regions.length, 0);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), true);
});

test("normalizes a verified probability without hiding its layout checks", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["20.30%", "20.30%", "20.30%"],
    {
      designText: "41.40%",
      designName: "利率区间概率",
      actualBox: { x: 10, y: 8, width: 40, height: 16 }
    }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => ({
        candidateType: "probability",
        binding: {
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price"
        },
        strategy: "normalize-probability-text",
        normalizedProperties: ["text"],
        reasons: ["百分比格式和节点语义共同证明这是概率数据。"]
      })
    }
  );

  assert.equal(result.dynamicNormalization.regions[0]?.kind, "probability");
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.issues.some((issue) => hasRule(issue, "position")), false);
  assert.ok(result.matching.designCoverage?.items.some(item => item.checks?.some(check => check.rule === "position" && check.status === "pending")));
});

test("normalizes a verified market-rate range", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["3.25–3.50", "3.25–3.50", "3.25–3.50"],
    { designText: "3.50–3.75", designName: "利率区间" }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => ({
        candidateType: "market-value",
        binding: {
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price"
        },
        strategy: "normalize-market-value-text",
        normalizedProperties: ["text"],
        reasons: ["节点语义和数值区间格式共同证明这是利率区间。"]
      })
    }
  );

  assert.equal(result.dynamicNormalization.regions[0]?.kind, "market-value");
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("allows exactly one correction when deterministic verification rejects the first hypothesis", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101点", "102点", "103点"],
    { designText: "100点" }
  );
  for (const sample of evidence.samples) sample.elements[0].dataFigmaId = undefined;
  const requests: Array<{ conflict?: string }> = [];

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async (request) => {
        requests.push(request);
        return {
          candidateType: "market-value",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: requests.length === 1 ? "wrong-key" : "figma:2:price"
          },
          strategy: "normalize-market-value-text",
          normalizedProperties: ["text"],
          reasons: ["根据冲突反馈修正绑定。"]
        };
      }
    }
  );

  assert.equal(requests.length, 2);
  assert.match(requests[1].conflict ?? "", /fingerprintKey/);
  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.dynamicNormalization.agentHypotheses[0].status, "corrected");
  assert.equal(result.dynamicNormalization.agentHypotheses[0].attempts, 2);
});

test("marks an ambiguous region pending after the corrected hypothesis still fails verification", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["未知甲", "未知乙", "未知丙"],
    { designText: "行情占位" }
  );
  let attempts = 0;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => {
        attempts += 1;
        return {
          candidateType: "market-value",
          binding: {
            figmaNodeId: "2:price",
            fingerprintKey: `wrong-key-${attempts}`
          },
          strategy: "normalize-market-value-text",
          normalizedProperties: ["text"],
          reasons: ["仍然选择了错误绑定。"]
        };
      }
    }
  );

  assert.equal(attempts, 2);
  assert.equal(result.dynamicNormalization.regions.length, 0);
  assert.equal(result.dynamicNormalization.agentHypotheses[0].status, "pending");
  assert.equal(result.dynamicNormalization.agentHypotheses[0].attempts, 2);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "dynamic_hypothesis")
  ), true);
});

test("keeps the deterministic report and marks the region pending when the Agent is unavailable", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["暂态甲", "暂态乙", "暂态丙"],
    { designText: "行情占位" }
  );

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => {
        throw new Error("agent timeout");
      }
    }
  );

  assert.equal(result.dynamicNormalization.regions.length, 0);
  assert.equal(result.dynamicNormalization.agentHypotheses[0].status, "pending");
  assert.equal(result.dynamicNormalization.agentHypotheses[0].attempts, 1);
  assert.match(result.dynamicNormalization.agentHypotheses[0].reason, /agent timeout/);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "dynamic_hypothesis")
  ), true);
});

test("rejects an invalid AgentHypothesis schema without a correction call", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["模糊甲", "模糊乙", "模糊丙"],
    { designText: "行情占位" }
  );
  let attempts = 0;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      dynamicHypothesisAgent: async () => {
        attempts += 1;
        return { candidateType: "market-value", strategy: "anything" };
      }
    }
  );

  assert.equal(attempts, 1);
  assert.equal(result.dynamicNormalization.agentHypotheses[0].status, "pending");
  assert.match(result.dynamicNormalization.agentHypotheses[0].reason, /Schema/);
  assert.equal(result.issues.some((issue) => hasRule(issue, "dynamic_hypothesis")), true);
});

test("does not normalize a changing value supported by only two samples", async () => {
  const { truth, evidence } = await dynamicMarketScenario(["101.00", "102.00"]);
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 0);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), true);
  assert.ok(result.similarity < 1);
});

test("still reports an incorrect font size on a normalized market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    { actualFontSize: 18 }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "typography") && issue.evidence.some(item => item.rule === "typography" && item.summary.includes("font-size"))
  ), true);
});

test("still reports an incorrect font family on a normalized market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    { actualFontFamily: "Times New Roman" }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "typography") && issue.evidence.some(item => item.rule === "typography" && item.summary.includes("font-family"))
  ), true);
});

test("treats compact and spaced PingFang SC names as the same font family", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    {
      designFontFamily: "PingFang SC",
      actualFontFamily: 'PingFangSC, "PingFang SC", system-ui'
    }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "typography") && issue.evidence.some(item => item.rule === "typography" && item.summary.includes("font-family"))
  ), false);
});

test("still reports incorrect text alignment on a normalized market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    { actualTextAlign: "left" }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "alignment") && issue.actual === "偏离目标对齐"
  ), true);
});

test("treats start and left as equivalent text alignment on an LTR page", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    { designTextAlign: "left", actualTextAlign: "start" }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some((issue) => hasRule(issue, "alignment")), false);
});

test("keeps normalized market positioning pending without a local reference", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "102.00", "103.00"],
    { actualBox: { x: 12, y: 8, width: 40, height: 16 } }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.issues.some(issue => hasRule(issue, "position")), false);
  assert.ok(result.matching.designCoverage?.items.some(item => item.checks?.some(check => check.rule === "position" && check.status === "pending")));

});

test("still reports clipped overflow for a normalized long market value", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["123456789.00", "123456790.00", "123456791.00"],
    {
      audits: [
        {
          rule: "clipped_text",
          selector: "#price",
          summary: "长行情数值被容器裁切。",
          box: { x: 4, y: 8, width: 40, height: 16 }
        }
      ]
    }
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "clipped_text") && issue.selector === "#price"
  ), true);
});

test("does not hide an adjacent static text error", async () => {
  const { truth, evidence } = await dynamicMarketScenario(["101.00", "102.00", "103.00"]);
  const labelBox = { x: 52, y: 8, width: 36, height: 16 };
  truth.root.children.push({
    id: "2:label",
    parentId: "1:2",
    name: "行情标签",
    type: "TEXT",
    text: "最新价",
    box: labelBox,
    relativeBox: labelBox,
    style: { fontSize: 14 },
    children: []
  });
  for (const sample of evidence.samples) {
    sample.elements.push({
      selector: "#label",
      tag: "span",
      dataFigmaId: "2:label",
      text: "当前价",
      box: labelBox,
      style: { fontSize: 14 },
      fingerprint: {
        key: "figma:2:label",
        identitySource: "figma-id",
        tag: "span",
        selector: "#label",
        region: "middle-center",
        geometryBucket: "52:20:36:40",
        styleSignature: "font-size=14"
      }
    });
  }

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) =>
    hasRule(issue, "content") && issue.figmaNodeId === "2:label"
  ), true);
});

test("normalizes a verified market field even without temporal change", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["101.00", "101.00", "101.00"]
  );
  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("normalizes a black-box market value without data-figma-id", async () => {
  const { truth, evidence } = await dynamicMarketScenario(["101.00", "102.00", "103.00"]);
  const fingerprintKey = "dom:span:#price";
  for (const sample of evidence.samples) {
    const price = sample.elements[0];
    delete price.dataFigmaId;
    price.fingerprint = {
      ...price.fingerprint,
      key: fingerprintKey,
      identitySource: "dom-structure"
    };
  }
  evidence.elementChanges[0].fingerprintKey = fingerprintKey;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.matching.matches[0].method, "structure-geometry");
  assert.equal(result.dynamicNormalization.regions.length, 1);
  assert.deepEqual(
    result.dynamicNormalization.regions[0].evidenceConfidence.basis,
    ["structure-geometry", "temporal-consistency", "market-format"]
  );
});

test("accepts percentage and compound volume formats as market evidence", async () => {
  const scenarios = [
    await dynamicMarketScenario(
      ["+1.20%", "+1.25%", "+1.30%"],
      { designText: "+1.10%" }
    ),
    await dynamicMarketScenario(
      ["1.2亿股", "1.3亿股", "1.4亿股"],
      { designText: "1.1亿股" }
    )
  ];

  for (const { truth, evidence } of scenarios) {
    const result = await compareLiveEvidence(
      truth,
      evidence,
      parseAcceptanceYaml(),
      "zh-CN"
    );
    assert.equal(result.dynamicNormalization.regions.length, 1);
    assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
  }
});

test("rejects normalization when geometry or style changes across samples", async () => {
  for (const changedField of ["geometryChanged", "styleChanged"] as const) {
    const { truth, evidence } = await dynamicMarketScenario(
      ["101.00", "102.00", "103.00"]
    );
    evidence.elementChanges[0][changedField] = true;
    const result = await compareLiveEvidence(
      truth,
      evidence,
      parseAcceptanceYaml(),
      "zh-CN"
    );

    assert.equal(result.dynamicNormalization.regions.length, 0);
    assert.equal(result.issues.some((issue) => hasRule(issue, "content")), true);
  }
});

test("excludes normalized pixels from the stable-similarity denominator", async () => {
  const { truth, evidence } = await dynamicMarketScenario(["101.00", "102.00", "103.00"]);
  const stableBox = { x: 80, y: 0, width: 10, height: 10 };
  truth.root.children.push({
    id: "2:stable",
    parentId: "1:2",
    name: "稳定区域",
    type: "RECTANGLE",
    box: stableBox,
    relativeBox: stableBox,
    style: { backgroundColor: "#ffffff" },
    children: []
  });
  for (const sample of evidence.samples) {
    sample.image = await sharp(sample.image)
      .composite([
        {
          input: {
            create: {
              width: 10,
              height: 10,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 1 }
            }
          },
          left: 80,
          top: 0
        }
      ])
      .png()
      .toBuffer();
    sample.elements.push({
      selector: "#stable",
      tag: "div",
      dataFigmaId: "2:stable",
      box: stableBox,
      style: { backgroundColor: "rgb(0, 0, 0)" },
      fingerprint: {
        key: "figma:2:stable",
        identitySource: "figma-id",
        tag: "div",
        selector: "#stable",
        region: "top-right",
        geometryBucket: "80:0:10:25",
        styleSignature: "background=rgb(0, 0, 0)"
      }
    });
  }

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.dynamicNormalization.dynamicRegionAreaRatio, 0.16);
  assert.equal(result.dynamicNormalization.stableSimilarity, 0);
});

test("uses the canonical sample from single-frame-compatible LiveActualEvidence", async () => {
  const reference = await solidPng();
  const stale = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  const result = await compareDesignToPage(
    designTruth(reference, []),
    {
      kind: "live",
      sourceUrl: "https://example.test/market",
      finalUrl: "https://example.test/market",
      viewport: { width: 16, height: 16 },
      samples: [
        { index: 0, capturedAtMs: 100, image: stale, elements: [], audits: [] },
        { index: 1, capturedAtMs: 200, image: reference, elements: [], audits: [] }
      ],
      canonicalSampleIndex: 1,
      elementChanges: [],
      pixelVariance: {
        image: reference,
        changedPixelCount: 256,
        changedPixelRatio: 1,
        threshold: 0.1
      },
      diagnostics: []
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.similarity, 1);
  assert.deepEqual(result.actualImage, reference);
});

test("reports high EvidenceConfidence for an exact Figma id match", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:1",
      parentId: "1:2",
      name: "标题",
      type: "TEXT",
      text: "行情",
      box: { x: 2, y: 2, width: 8, height: 4 },
      relativeBox: { x: 2, y: 2, width: 8, height: 4 },
      style: { fontSize: 12, fontWeight: 600 },
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: "h1",
          tag: "h1",
          dataFigmaId: "2:1",
          text: "行情",
          box: { x: 2, y: 2, width: 8, height: 4 },
          style: { fontSize: 12, fontWeight: 600 }
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.similarity, 1);
  assert.deepEqual(result.matching.matches, [
    {
      figmaNodeId: "2:1",
      selector: "h1",
      method: "exact-id",
      evidenceConfidence: {
        score: 0.99,
        level: "high",
        basis: ["exact-id"],
        reasons: ["data-figma-id 与 Figma node id 完全一致。"]
      }
    }
  ]);
});

test("publishes unresolved design coverage while leaving extra actual elements non-blocking", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:missing",
      parentId: "1:2",
      name: "设计侧标题",
      type: "TEXT",
      text: "设计侧标题",
      box: { x: 1, y: 1, width: 5, height: 2 },
      relativeBox: { x: 1, y: 1, width: 5, height: 2 },
      style: {},
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: "button",
          tag: "button",
          text: "开发侧按钮",
          box: { x: 10, y: 10, width: 4, height: 2 },
          style: {}
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some((issue) => ["missing_element", "extra_element"].includes(issue.rule)), false);
  assert.equal(result.matching.unmatchedDesignCount, 1);
  assert.equal(result.matching.unmatchedActualCount, 1);
  assert.deepEqual(result.matching.diagnostics, [
    "设计覆盖：1 个设计节点未匹配，1 个开发元素未匹配；设计项逐项记录，未验证项已归入待确认问题。"
  ]);
});

test("distinguishes stable-text evidence from structure-geometry evidence", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:text",
      parentId: "1:2",
      name: "行情标题",
      type: "TEXT",
      text: "市场行情",
      box: { x: 1, y: 1, width: 6, height: 2 },
      relativeBox: { x: 1, y: 1, width: 6, height: 2 },
      style: {},
      children: []
    },
    {
      id: "2:shape",
      parentId: "1:2",
      name: "行情卡片",
      type: "RECTANGLE",
      box: { x: 8, y: 8, width: 6, height: 6 },
      relativeBox: { x: 8, y: 8, width: 6, height: 6 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: "h1",
          tag: "h1",
          text: "市场行情",
          box: { x: 1, y: 1, width: 6, height: 2 },
          style: {}
        },
        {
          selector: ".market-card",
          tag: "div",
          box: { x: 8, y: 8, width: 6, height: 6 },
          style: { backgroundColor: "rgb(255, 255, 255)" }
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const textMatch = result.matching.matches.find((match) => match.figmaNodeId === "2:text");
  const geometryMatch = result.matching.matches.find((match) => match.figmaNodeId === "2:shape");
  assert.equal(textMatch?.method, "stable-text");
  assert.deepEqual(textMatch?.evidenceConfidence.basis, ["stable-text", "structure-geometry"]);
  assert.equal(geometryMatch?.method, "structure-geometry");
  assert.deepEqual(geometryMatch?.evidenceConfidence.basis, ["structure-geometry"]);
});

test("preserves actual evidence boxes while unreferenced position remains pending", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:rate-range",
    parentId: "1:2",
    name: "利率区间(%)",
    type: "TEXT",
    text: "利率区间(%)",
    box: { x: 1, y: 10, width: 8, height: 2 },
    relativeBox: { x: 1, y: 10, width: 8, height: 2 },
    style: {},
    children: []
  }]);
  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [{
        selector: ".rate-observation .rate-range",
        tag: "span",
        text: "利率区间(%)",
        box: { x: 1, y: 2, width: 8, height: 2 },
        style: {}
      }],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/fed"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some(candidate => hasRule(candidate, "position")), false);

  assert.ok(result.matching.designCoverage?.items.some(item => item.checks?.some(check => check.rule === "position" && check.status === "pending")));
  const check = result.matching.designCoverage?.items.flatMap(item => item.checks ?? []).find(check => check.rule === "position");
  assert.deepEqual(check?.actualBox, {x:1,y:2,width:8,height:2});

});

test("keeps a medium-confidence geometric candidate pending without size repair advice", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:card",
      parentId: "1:2",
      name: "行情卡片",
      type: "RECTANGLE",
      box: { x: 0, y: 0, width: 16, height: 16 },
      relativeBox: { x: 0, y: 0, width: 16, height: 16 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: ".market-card",
          tag: "div",
          box: { x: 2.5, y: 0, width: 11, height: 16 },
          style: { backgroundColor: "rgb(255, 255, 255)" }
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const sizeIssue = result.issues.find((issue) => hasRule(issue, "size"));
  const match = result.matching.matches[0];
  assert.equal(match.evidenceConfidence.level, "medium");
  assert.equal(sizeIssue, undefined);
  assert.ok(result.matching.matches.some(match => match.method === "structure-geometry"));
  assert.ok(result.matching.designCoverage?.items.every(item => item.reviewStatus === "not-applicable"));
});

test("leaves uncorresponded image differences outside the acceptance pixel gate", async () => {
  const reference = await solidPng();
  const actual = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();

  const result = await compareDesignToPage(
    designTruth(reference, []),
    {
      image: actual,
      elements: [],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.some(issue => hasRule(issue,"visual_similarity") || hasRule(issue,"visual_region")),false);
  assert.equal(result.matching.visualScope?.reviewedPixels,0);
  assert.equal(result.matching.visualScope?.changedPixels,0);

});

test("attaches reproducible EvidenceConfidence to every deterministic finding", async () => {
  const reference = await solidPng();
  const actual = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();

  const result = await compareDesignToPage(
    designTruth(reference, [
      {
        id: "2:page",
        parentId: "1:2",
        name: "页面内容",
        type: "RECTANGLE",
        box: { x: 0, y: 0, width: 16, height: 16 },
        relativeBox: { x: 0, y: 0, width: 16, height: 16 },
        style: {},
        children: []
      }
    ]),
    {
      image: actual,
      elements: [
        {
          selector: "main",
          tag: "main",
          dataFigmaId: "2:page",
          box: { x: 0, y: 0, width: 16, height: 16 },
          style: {}
        }
      ],
      audits: [
        {
          rule: "horizontal_overflow",
          selector: "html",
          summary: "页面宽度超过视口。"
        }
      ],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.issues.every((issue) => Boolean(issue.evidenceConfidence)), true);
  assert.deepEqual(
    result.issues.find((issue) => hasRule(issue, "visual_similarity"))?.evidenceConfidence?.basis,
    ["pixel-measurement"]
  );
  assert.deepEqual(
    result.issues.find((issue) => hasRule(issue, "horizontal_overflow"))?.evidenceConfidence?.basis,
    ["dom-audit"]
  );
});

test("keeps unverified geometry pending even when color is configured as a warning", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:card",
      parentId: "1:2",
      name: "行情卡片",
      type: "RECTANGLE",
      box: { x: 0, y: 0, width: 16, height: 16 },
      relativeBox: { x: 0, y: 0, width: 16, height: 16 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: ".market-card",
          tag: "div",
          box: { x: 0, y: 0, width: 16, height: 16 },
          style: { backgroundColor: "rgb(0, 0, 0)" }
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const colorIssue = result.issues.find((issue) => hasRule(issue, "color"));
  assert.equal(colorIssue, undefined);
  assert.ok(result.matching.matches.some(match => match.method === "structure-geometry"));
  assert.ok(result.matching.designCoverage?.items.every(item => item.reviewStatus === "not-applicable"));
});

test("excludes a stable-text candidate below the configured match threshold", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:title",
      parentId: "1:2",
      name: "行情标题",
      type: "TEXT",
      text: "市场行情",
      box: { x: 0, y: 0, width: 6, height: 2 },
      relativeBox: { x: 0, y: 0, width: 6, height: 2 },
      style: {},
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image,
      elements: [
        {
          selector: "h1",
          tag: "h1",
          text: "市场行情",
          box: { x: 5, y: 0, width: 6, height: 2 },
          style: {}
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml("thresholds:\n  match_confidence_min: 0.99\n  high_confidence_min: 0.99\n"),
    "zh-CN"
  );

  assert.equal(result.matching.matches.length, 0);
  assert.equal(result.issues.some((issue) => hasRule(issue, "position")), false);
  assert.equal(result.matching.unmatchedDesignCount, 1);
  assert.equal(result.matching.unmatchedActualCount, 1);
});

test("excludes unmatched pixels from the deterministic similarity gate", async () => {
  const reference = await solidPng();
  const actual = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  const truth = designTruth(reference, [
    {
      id: "2:unmatched",
      parentId: "1:2",
      name: "设计卡片",
      type: "RECTANGLE",
      box: { x: 0, y: 0, width: 16, height: 16 },
      relativeBox: { x: 0, y: 0, width: 16, height: 16 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }
  ]);

  const result = await compareDesignToPage(
    truth,
    {
      image: actual,
      elements: [
        {
          selector: ".unmatched-card",
          tag: "div",
          box: { x: 15, y: 15, width: 1, height: 1 },
          style: { backgroundColor: "rgb(0, 0, 0)" }
        }
      ],
      audits: [],
      diagnostics: [],
      finalUrl: "https://example.test/market"
    },
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.equal(result.matching.matches.length, 0);
  assert.equal(result.similarity, 1);
  assert.equal(result.issues.some((issue) => hasRule(issue, "visual_similarity")), false);
});

test("uses AI visual-semantic binding for ambiguous elements and verifies the proposal deterministically", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:probability-card",
    parentId: "1:2",
    name: "利率概率卡片",
    type: "RECTANGLE",
    box: { x: 0, y: 0, width: 8, height: 4 },
    relativeBox: { x: 0, y: 0, width: 8, height: 4 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".fed-rate-card",
      tag: "section",
      box: { x: 8, y: 12, width: 8, height: 4 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/fed"
  });
  let calls = 0;

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async ({ request }) => {
        calls += 1;
        assert.equal(request.designCandidates[0].name, "利率概率卡片");
        assert.equal(request.actualCandidates[0].selector, ".fed-rate-card");
        return {
          pageSummary: "设计与开发中的利率概率卡片语义相同，但页面结构发生位移。",
          alignmentPlan: { regions: [] },
          bindings: [{
            figmaNodeId: "2:probability-card",
            fingerprintKey: actual.samples[0].elements[0].fingerprint.key,
            confidence: 0.91,
            reason: "相同业务模块、尺寸一致。"
          }]
        };
      }
    }
  );

  assert.equal(calls, 1);
  assert.equal(result.matching.matches[0].method, "visual-inference");
  assert.deepEqual(result.matching.matches[0].evidenceConfidence.basis, [
    "visual-inference",
    "agent-hypothesis"
  ]);
  assert.match(result.matching.diagnostics.join("\n"), /AI 语义绑定接受 1/);
});

test("recovers one interrupted Agent call and publishes sanitized execution evidence", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{ id: "card", name: "卡片", type: "FRAME",
    box: {x: 0,y: 0,width: 8,height: 4}, style: {backgroundColor: "#fff"}, children: [] }]);
  const actual = liveEvidence({image, elements: [{selector: ".card", tag: "section",
    box: {x: 8,y: 12,width: 8,height: 4}, style: {backgroundColor: "#fff"}}], audits: [], diagnostics: [], finalUrl: "https://example.test"});
  let calls = 0;
  const result = await compareLiveEvidence(truth, actual, parseAcceptanceYaml(), "zh-CN", {
    elementBindingAgent: async () => {
      if (++calls === 1) throw new TypeError("terminated", {cause: {code: "UND_ERR_SOCKET", message: "secret-token"}});
      return {pageSummary: "卡片对应", bindings: [{figmaNodeId: "card", fingerprintKey: actual.samples[0].elements[0].fingerprint.key,
        confidence: 0.95, reason: "相同卡片"}], alignmentPlan: {regions: []}};
    }
  });
  assert.equal(result.matching.semanticAgent?.acceptedBindingCount, 1);
  const execution = result.matching.semanticAgent?.execution;
  assert.equal(execution?.status, "recovered");
  assert.equal(execution?.attempts.length, 2);
  assert.equal(execution?.attempts[0].code, "transport_error");
  assert.equal(execution?.attempts[0].causeCode, "UND_ERR_SOCKET");
  assert.doesNotMatch(JSON.stringify(result.matching), /secret-token/);
});

for (const failure of ["transport", "timeout", "format"] as const) {
test(`bounds ${failure} failures and marks structural review incomplete`, async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{id: "card", name: "卡片", type: "FRAME", box: {x: 0,y: 0,width: 8,height: 4}, style: {backgroundColor: "#fff"}, children: []}]);
  const actual = liveEvidence({image, elements: [{selector: ".card", tag: "section", box: {x: 8,y: 12,width: 8,height: 4}, style: {backgroundColor: "#fff"}}], audits: [], diagnostics: [], finalUrl: "https://example.test"});
  let calls = 0;
  const result = await compareLiveEvidence(truth, actual, parseAcceptanceYaml(), "zh-CN", {elementBindingAgent: async () => {
    calls++;
    if (failure === "transport") throw new TypeError("terminated");
    if (failure === "timeout") throw new DOMException("secret endpoint", "TimeoutError");
    throw new SyntaxError("secret response body");
  }});
  assert.equal(calls, failure === "transport" ? 2 : 1);
  assert.equal(result.matching.semanticAgent?.execution?.status, "failed");
  assert.equal(result.matching.semanticAgent?.responded, false);
  assert.equal(result.matching.missingModules?.publishedCount, 0);
  assert.doesNotMatch(JSON.stringify(result.matching), /secret/);
});
}

test("keeps semantically different text unmatched when the Agent abstains", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:poll-limit",
    parentId: "1:2",
    name: "投票最多选两项",
    type: "TEXT",
    text: "最多选2项",
    box: { x: 2, y: 2, width: 8, height: 2 },
    relativeBox: { x: 2, y: 2, width: 8, height: 2 },
    style: { fontSize: 12 },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".news-time",
      parentSelector: ".news-item",
      tag: "span",
      text: "昨天 08:03",
      box: { x: 2, y: 2, width: 8, height: 2 },
      style: { fontSize: 12 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/fed"
  });
  let calls = 0;

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => {
        calls += 1;
        return {
          pageSummary: "开发页缺少投票模块，资讯时间不应与投票说明绑定。",
          alignmentPlan: { regions: [] },
          bindings: []
        };
      }
    }
  );

  assert.equal(calls, 1);
  assert.equal(result.matching.matches.length, 0);
  assert.equal(result.issues.some((issue) => hasRule(issue, "content")), false);
});

test("does not override Agent abstention with a numeric geometry match", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["7", "7", "7"],
    { designText: "100.00", designName: "最新价" }
  );
  const fingerprintKey = "dom:span:#price";
  for (const sample of evidence.samples) {
    delete sample.elements[0].dataFigmaId;
    sample.elements[0].fingerprint = {
      ...sample.elements[0].fingerprint,
      key: fingerprintKey,
      identitySource: "dom-structure"
    };
  }
  evidence.elementChanges[0].fingerprintKey = fingerprintKey;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "数值位于不同业务模块，缺少足够证据绑定。",
        alignmentPlan: { regions: [] },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.matches.length, 0);
  assert.deepEqual(result.matching.semanticAgent?.modules[0]?.dynamicFallback, {
    evaluatedCount: 1,
    acceptedCount: 0,
    rejectedCount: 1,
    decisions: [{
      figmaNodeId: "2:price",
      selector: "#price",
      result: "rejected",
      reasonCode: "text_unchanged",
      matched: false
    }]
  });
});

test("uses safe temporal semantic fallback when the Agent returns no valid binding", async () => {
  const { truth, evidence } = await dynamicMarketScenario(
    ["7.00", "7.10", "7.20"],
    { designText: "100.00", designName: "最新价" }
  );
  const fingerprintKey = "dom:span:#price";
  for (const sample of evidence.samples) {
    delete sample.elements[0].dataFigmaId;
    sample.elements[0].fingerprint = {
      ...sample.elements[0].fingerprint,
      key: fingerprintKey,
      identitySource: "dom-structure"
    };
  }
  evidence.elementChanges[0].fingerprintKey = fingerprintKey;

  const result = await compareLiveEvidence(
    truth,
    evidence,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "模型没有建立有效元素绑定。",
        alignmentPlan: { regions: [] },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.matches.length, 1);
  assert.equal(result.matching.matches[0]?.figmaNodeId, "2:price");
  assert.equal(result.matching.matches[0]?.method, "structure-geometry");
  assert.match(result.matching.diagnostics.join("\n"), /AI 语义绑定接受 0/);
});

test("keeps safe temporal fallback open in a module without an accepted Agent binding", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:module-a",
    parentId: "1:2",
    name: "模块 A",
    type: "FRAME",
    box: { x: 0, y: 0, width: 100, height: 16 },
    relativeBox: { x: 0, y: 0, width: 100, height: 16 },
    style: {},
    children: [{
      id: "3:module-a-card",
      parentId: "2:module-a",
      name: "模块 A 卡片",
      type: "RECTANGLE",
      box: { x: 0, y: 0, width: 20, height: 10 },
      relativeBox: { x: 0, y: 0, width: 20, height: 10 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }, {
      id: "3:module-a-price",
      parentId: "2:module-a",
      name: "最新价",
      type: "TEXT",
      text: "200.00",
      box: { x: 40, y: 0, width: 40, height: 10 },
      relativeBox: { x: 40, y: 0, width: 40, height: 10 },
      style: { fontSize: 14 },
      children: []
    }]
  }, {
    id: "2:module-b",
    parentId: "1:2",
    name: "模块 B",
    type: "FRAME",
    box: { x: 0, y: 20, width: 100, height: 16 },
    relativeBox: { x: 0, y: 20, width: 100, height: 16 },
    style: {},
    children: [{
      id: "3:module-b-price",
      parentId: "2:module-b",
      name: "最新价",
      type: "TEXT",
      text: "100.00",
      box: { x: 0, y: 20, width: 40, height: 10 },
      relativeBox: { x: 0, y: 0, width: 40, height: 10 },
      style: { fontSize: 14 },
      children: []
    }]
  }]);
  truth.render.viewport = { width: 100, height: 40 };
  truth.root.box = { x: 0, y: 0, width: 100, height: 40 };
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".module-a .card",
      parentSelector: ".module-a",
      tag: "div",
      box: { x: 0, y: 0, width: 20, height: 10 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }, {
      selector: ".module-a .price",
      parentSelector: ".module-a",
      tag: "span",
      text: "8.20",
      box: { x: 40, y: 0, width: 40, height: 10 },
      style: { fontSize: 14 }
    }, {
      selector: ".module-b .price",
      parentSelector: ".module-b",
      tag: "span",
      text: "7.20",
      box: { x: 0, y: 20, width: 40, height: 10 },
      style: { fontSize: 14 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/module-scoped-agent-binding"
  });
  actual.viewport = { width: 100, height: 40 };
  const moduleAPriceTexts = ["8.00", "8.10", "8.20"];
  const priceTexts = ["7.00", "7.10", "7.20"];
  actual.samples = priceTexts.map((text, index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750,
    elements: actual.samples[0].elements.map((element) => {
      if (element.selector === ".module-a .price") {
        return { ...element, text: moduleAPriceTexts[index] };
      }
      return element.selector === ".module-b .price" ? { ...element, text } : { ...element };
    })
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[2].elements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [0, 1, 2],
    presentInAllSamples: true,
    textChanged: element.selector.endsWith(".price"),
    geometryChanged: false,
    styleChanged: false,
    observedTexts: element.selector === ".module-a .price"
      ? moduleAPriceTexts
      : element.selector === ".module-b .price"
        ? priceTexts
        : []
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "只确认模块 A 卡片，模块 B 没有有效绑定。",
        alignmentPlan: { regions: [] },
        bindings: [{
          figmaNodeId: "3:module-a-card",
          fingerprintKey: "dom:div:.module-a .card",
          confidence: 0.95,
          reason: "模块 A 的卡片语义和层级一致。"
        }]
      })
    }
  );

  assert.equal(
    result.matching.matches.find((match) => match.selector === ".module-a .card")?.method,
    "visual-inference"
  );
  assert.equal(
    result.matching.matches.some((match) => match.selector === ".module-a .price"),
    false
  );
  assert.equal(
    result.matching.matches.find((match) => match.selector === ".module-b .price")?.method,
    "structure-geometry"
  );
  const matchingJson = JSON.parse(JSON.stringify(result.matching));
  assert.deepEqual(matchingJson.semanticAgent, {
    invoked: true,
    responded: true,
    acceptedBindingCount: 1,
    modules: [{
      designModuleId: "2:module-a",
      acceptedBindingCount: 1,
      actualParentSelectors: [".module-a"],
      dynamicFallback: {
        evaluatedCount: 1,
        acceptedCount: 0,
        rejectedCount: 1,
        decisions: [{
          figmaNodeId: "3:module-a-price",
          selector: ".module-a .price",
          actualParentSelector: ".module-a",
          result: "rejected",
          reasonCode: "module_has_valid_agent_binding",
          matched: false
        }]
      }
    }, {
      designModuleId: "2:module-b",
      acceptedBindingCount: 0,
      actualParentSelectors: [".module-b"],
      dynamicFallback: {
        evaluatedCount: 1,
        acceptedCount: 1,
        rejectedCount: 0,
        decisions: [{
          figmaNodeId: "3:module-b-price",
          selector: ".module-b .price",
          actualParentSelector: ".module-b",
          result: "accepted",
          reasonCode: "temporal_dynamic_verified",
          matched: true
        }]
      }
    }]
  });
});

test("does not geometry-match an element across a verified module boundary", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:module-a",
    parentId: "1:2",
    name: "模块 A",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:module-a-title",
        parentId: "2:module-a",
        name: "模块 A 标题",
        type: "TEXT",
        text: "模块 A",
        box: { x: 2, y: 2, width: 8, height: 2 },
        relativeBox: { x: 2, y: 2, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:module-a-card",
        parentId: "2:module-a",
        name: "模块 A 卡片",
        type: "RECTANGLE",
        box: { x: 2, y: 6, width: 8, height: 4 },
        relativeBox: { x: 2, y: 6, width: 8, height: 4 },
        style: { backgroundColor: "#ffffff" },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".module-a .title",
        parentSelector: ".module-a",
        tag: "h2",
        text: "模块 A",
        box: { x: 2, y: 2, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".module-b .card",
        parentSelector: ".module-b",
        tag: "div",
        box: { x: 2, y: 6, width: 8, height: 4 },
        style: { backgroundColor: "rgb(255, 255, 255)" }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/modules"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "模块 A 的卡片在开发页缺失，.module-b 属于其他模块。",
        alignmentPlan: { regions: [] },
        bindings: []
      })
    }
  );

  assert.equal(
    result.matching.matches.some((match) => match.selector === ".module-b .card"),
    false
  );
});

test("publishes deterministic module anchors in the page alignment plan", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 4, width: 16, height: 12 },
    relativeBox: { x: 0, y: 4, width: 16, height: 12 },
    style: {},
    children: [{
      id: "2:observation-title",
      parentId: "2:observation",
      name: "利率观察标题",
      type: "TEXT",
      text: "利率观察",
      box: { x: 2, y: 6, width: 8, height: 2 },
      relativeBox: { x: 2, y: 2, width: 8, height: 2 },
      style: { fontSize: 12 },
      children: []
    }]
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".rate-observation .title",
      parentSelector: ".rate-observation",
      tag: "h2",
      text: "利率观察",
      box: { x: 2, y: 8, width: 8, height: 2 },
      style: { fontSize: 12 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.deepEqual(result.matching.pageAlignment?.regions.map((region) => ({
    designParentFigmaNodeId: region.designParentFigmaNodeId,
    status: region.status,
    actualParentSelector: region.actualParentSelector,
    displacement: region.displacement,
    source: region.source
  })), [{
    designParentFigmaNodeId: "2:observation",
    status: "matched",
    actualParentSelector: ".rate-observation",
    displacement: undefined,
    source: "deterministic"
  }]);
});

test("uses the module anchor consensus instead of one displaced title", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "利率观察标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 1, y: 1, width: 8, height: 2 },
        relativeBox: { x: 1, y: 1, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:range",
        parentId: "2:observation",
        name: "利率区间",
        type: "TEXT",
        text: "利率区间(%)",
        box: { x: 1, y: 5, width: 8, height: 2 },
        relativeBox: { x: 1, y: 5, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:probability",
        parentId: "2:observation",
        name: "最新概率",
        type: "TEXT",
        text: "最新概率",
        box: { x: 1, y: 9, width: 8, height: 2 },
        relativeBox: { x: 1, y: 9, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:title",
        tag: "h2",
        text: "利率观察",
        box: { x: 1, y: 13, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .range",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:range",
        tag: "span",
        text: "利率区间(%)",
        box: { x: 1, y: 7, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .probability",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:probability",
        tag: "span",
        text: "最新概率",
        box: { x: 1, y: 12, width: 8, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  const stableElements = actual.samples[0].elements;
  actual.samples = [
    { ...actual.samples[0], index: 0, capturedAtMs: 0, elements: [] },
    { ...actual.samples[0], index: 1, capturedAtMs: 750, elements: stableElements },
    { ...actual.samples[0], index: 2, capturedAtMs: 1_500, elements: stableElements }
  ];
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = stableElements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [1, 2],
    presentInAllSamples: false,
    textChanged: false,
    geometryChanged: false,
    styleChanged: false,
    observedTexts: [element.text ?? ""]
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  assert.deepEqual(result.matching.pageAlignment?.regions[0]?.displacement, { x: 0, y: 2.5 });
  assert.equal(result.matching.pageAlignment?.regions[0]?.anchorStats.residualPx, 0.5);
});

test("prefers stable title and header anchors inside a live-market module", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "实时行情",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "行情模块标题",
        type: "TEXT",
        text: "实时行情",
        box: { x: 1, y: 1, width: 6, height: 1 },
        relativeBox: { x: 1, y: 1, width: 6, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:header",
        parentId: "2:observation",
        name: "概率表头",
        type: "TEXT",
        text: "概率",
        box: { x: 1, y: 3, width: 4, height: 1 },
        relativeBox: { x: 1, y: 3, width: 4, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:countdown",
        parentId: "2:observation",
        name: "会议倒计时",
        type: "TEXT",
        text: "40",
        box: { x: 1, y: 5, width: 2, height: 1 },
        relativeBox: { x: 1, y: 5, width: 2, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:price",
        parentId: "2:observation",
        name: "实时行情",
        type: "TEXT",
        text: "3.50%",
        box: { x: 1, y: 7, width: 4, height: 1 },
        relativeBox: { x: 1, y: 7, width: 4, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:carousel",
        parentId: "2:observation",
        name: "快讯轮播",
        type: "TEXT",
        text: "快讯 A",
        box: { x: 1, y: 9, width: 5, height: 1 },
        relativeBox: { x: 1, y: 9, width: 5, height: 1 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:title",
        tag: "h2",
        text: "实时行情",
        box: { x: 1, y: 3, width: 6, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .header",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:header",
        tag: "th",
        text: "概率",
        box: { x: 1, y: 5, width: 4, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .countdown",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:countdown",
        tag: "span",
        text: "7",
        box: { x: 1, y: 17, width: 2, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .price",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:price",
        tag: "span",
        text: "3.75%",
        box: { x: 1, y: 19, width: 4, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .carousel",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:carousel",
        tag: "div",
        text: "快讯 C",
        box: { x: 1, y: 21, width: 5, height: 1 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  actual.samples = [0, 1, 2].map((index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750,
    elements: actual.samples[0].elements.map((element) => ({
      ...element,
      text: element.selector.endsWith(".countdown")
        ? String(9 - index)
        : element.selector.endsWith(".price")
          ? `${3.55 + index / 10}%`
          : element.selector.endsWith(".carousel")
            ? `快讯 ${String.fromCharCode(65 + index)}`
            : element.text
    }))
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[2].elements.map((element) => {
    const dynamic = [".countdown", ".price", ".carousel"].some((suffix) =>
      element.selector.endsWith(suffix)
    );
    return {
      fingerprintKey: element.fingerprint.key,
      selector: element.selector,
      observedSampleIndexes: [0, 1, 2],
      presentInAllSamples: true,
      textChanged: dynamic,
      geometryChanged: element.selector.endsWith(".carousel"),
      styleChanged: false,
      observedTexts: actual.samples.map((sample) =>
        sample.elements.find((candidate) => candidate.selector === element.selector)?.text ?? ""
      )
    };
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.deepEqual(region?.displacement, { x: 0, y: 2 });
  assert.deepEqual(region?.anchorStats, {
    candidateCount: 5,
    stableCount: 2,
    dynamicExcludedCount: 3,
    structuralAnchorCount: 2,
    inlierCount: 2,
    residualPx: 0
  });
  assert.equal(region?.evidenceConfidence.score, 0.9);
  assert.deepEqual(region?.scoreBreakdown, {
    anchorEvidenceApplied: true,
    baseScoreCap: 1,
    weightedScore: 0.9033,
    finalScore: 0.9,
    components: {
      stabilityCoverage: { value: 1, weight: 0.25, contribution: 0.25 },
      anchorSufficiency: { value: 0.6667, weight: 0.2, contribution: 0.1333 },
      inlierRatio: { value: 1, weight: 0.3, contribution: 0.3 },
      residualQuality: { value: 1, weight: 0.15, contribution: 0.15 },
      dynamicCleanliness: { value: 0.4, weight: 0.05, contribution: 0.02 },
      structuralSupport: { value: 1, weight: 0.05, contribution: 0.05 }
    },
    levelThresholds: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
  });
  assert.equal(region?.evidenceConfidence.basis.includes("temporal-consistency"), true);
  assert.match(region?.reason ?? "", /2 个跨帧稳定锚点/);

  const weightedResult = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(`
page_alignment:
  confidence:
    weights:
      stability_coverage: 1
      anchor_sufficiency: 0
      inlier_ratio: 0
      residual_quality: 0
      dynamic_cleanliness: 0
      structural_support: 0
`),
    "zh-CN"
  );
  const weightedRegion = weightedResult.matching.pageAlignment.regions[0];
  assert.equal(weightedRegion?.evidenceConfidence.score, 1);
  assert.equal(weightedRegion?.scoreBreakdown.components.stabilityCoverage.weight, 1);
  assert.equal(weightedRegion?.scoreBreakdown.components.stabilityCoverage.contribution, 1);
  assert.equal(weightedRegion?.scoreBreakdown.components.inlierRatio.weight, 0);

  const reclassifiedResult = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(`
page_alignment:
  confidence:
    levels:
      high_min: 0.95
      medium_min: 0.8
      low_min: 0.4
`),
    "zh-CN"
  );
  const reclassifiedRegion = reclassifiedResult.matching.pageAlignment.regions[0];
  assert.equal(reclassifiedRegion?.evidenceConfidence.level, "medium");
  assert.deepEqual(reclassifiedRegion?.scoreBreakdown.levelThresholds, {
    highMin: 0.95,
    mediumMin: 0.8,
    lowMin: 0.4
  });
});

test("excludes known dynamic anchors even when they stay still during sampling", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "利率观察标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 1, y: 1, width: 6, height: 1 },
        relativeBox: { x: 1, y: 1, width: 6, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:countdown",
        parentId: "2:observation",
        name: "会议倒计时秒数",
        type: "TEXT",
        text: "40",
        box: { x: 1, y: 4, width: 2, height: 1 },
        relativeBox: { x: 1, y: 4, width: 2, height: 1 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:carousel",
        parentId: "2:observation",
        name: "快讯轮播容器",
        type: "TEXT",
        text: "快讯 A",
        box: { x: 1, y: 7, width: 5, height: 1 },
        relativeBox: { x: 1, y: 7, width: 5, height: 1 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:title",
        tag: "h2",
        text: "利率观察",
        box: { x: 1, y: 3, width: 6, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .countdown",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:countdown",
        tag: "span",
        text: "40",
        box: { x: 1, y: 16, width: 2, height: 1 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .swiper-slide",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:carousel",
        tag: "div",
        role: "marquee",
        text: "快讯 A",
        box: { x: 1, y: 19, width: 5, height: 1 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  actual.samples = [0, 1, 2].map((index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[2].elements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [0, 1, 2],
    presentInAllSamples: true,
    textChanged: false,
    geometryChanged: false,
    styleChanged: false,
    observedTexts: [element.text ?? ""]
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.equal(region?.displacement, undefined);
  assert.match(region?.reason ?? "", /排除 2 个动态或不完整锚点/);
  assert.match(region?.reason ?? "", /位移无多数共识/);
});

test("prioritizes stable headings and table headers over ordinary stable content", async () => {
  const image = await solidPng();
  const anchors = [
    { id: "title", name: "模块标题", text: "利率观察", tag: "h2", designY: 1, actualY: 3 },
    { id: "header", name: "概率表头", text: "概率", tag: "th", designY: 3, actualY: 5 },
    { id: "copy-a", name: "普通内容 A", text: "内容 A", tag: "span", designY: 5, actualY: 17 },
    { id: "copy-b", name: "普通内容 B", text: "内容 B", tag: "span", designY: 7, actualY: 19 },
    { id: "copy-c", name: "普通内容 C", text: "内容 C", tag: "span", designY: 9, actualY: 21 }
  ];
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: anchors.map((anchor) => ({
      id: `2:${anchor.id}`,
      parentId: "2:observation",
      name: anchor.name,
      type: "TEXT",
      text: anchor.text,
      box: { x: 1, y: anchor.designY, width: 5, height: 1 },
      relativeBox: { x: 1, y: anchor.designY, width: 5, height: 1 },
      style: { fontSize: 12 },
      children: []
    }))
  }]);
  const actual = liveEvidence({
    image,
    elements: anchors.map((anchor) => ({
      selector: `.rate-observation .${anchor.id}`,
      parentSelector: ".rate-observation",
      dataFigmaId: `2:${anchor.id}`,
      tag: anchor.tag,
      text: anchor.text,
      box: { x: 1, y: anchor.actualY, width: 5, height: 1 },
      style: { fontSize: 12 }
    })),
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  actual.samples = [0, 1, 2].map((index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[2].elements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [0, 1, 2],
    presentInAllSamples: true,
    textChanged: false,
    geometryChanged: false,
    styleChanged: false,
    observedTexts: [element.text ?? ""]
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.deepEqual(region?.displacement, { x: 0, y: 2 });
  assert.match(region?.reason ?? "", /优先采用 2 个标题、表头或容器锚点/);
});

test("does not publish a module displacement when anchors have no majority", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "利率观察标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 1, y: 1, width: 8, height: 2 },
        relativeBox: { x: 1, y: 1, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:range",
        parentId: "2:observation",
        name: "利率区间",
        type: "TEXT",
        text: "利率区间(%)",
        box: { x: 1, y: 5, width: 8, height: 2 },
        relativeBox: { x: 1, y: 5, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:title",
        tag: "h2",
        text: "利率观察",
        box: { x: 1, y: 13, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .range",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:range",
        tag: "span",
        text: "利率区间(%)",
        box: { x: 1, y: 7, width: 8, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.equal(region?.status, "matched");
  assert.equal(region?.displacement, undefined);
  assert.equal(region?.anchorStats.residualPx, 0);
  assert.equal(region?.evidenceConfidence.score, 0.61);
  assert.match(region?.reason ?? "", /锚点位移无多数共识/);
});

test("does not let AI overwrite a deterministic module anchor", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 2, y: 2, width: 8, height: 2 },
        relativeBox: { x: 2, y: 2, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:chart",
        parentId: "2:observation",
        name: "概率图",
        type: "RECTANGLE",
        box: { x: 2, y: 6, width: 12, height: 6 },
        relativeBox: { x: 2, y: 6, width: 12, height: 6 },
        style: { backgroundColor: "#ffffff" },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        tag: "h2",
        text: "利率观察",
        box: { x: 2, y: 4, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .chart",
        parentSelector: ".rate-observation",
        tag: "div",
        box: { x: 2, y: 8, width: 12, height: 6 },
        style: { backgroundColor: "rgb(255, 255, 255)" }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "模型重复确认利率观察模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:observation",
            designPath: ["行情", "利率观察"],
            status: "matched",
            actualParentSelector: ".rate-observation",
            displacement: { x: 0, y: 999 },
            confidence: 0.95,
            reason: "视觉上看起来属于同一模块。"
          }]
        },
        bindings: []
      })
    }
  );

  const region = result.matching.pageAlignment?.regions.find(
    (item) => item.designParentFigmaNodeId === "2:observation"
  );
  assert.equal(region?.source, "deterministic");
  assert.equal(region?.displacement, undefined);
});

test("removes an Agent displacement when only one stable verified binding remains", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:first",
        parentId: "2:observation",
        name: "模块标题",
        type: "TEXT",
        text: "--",
        box: { x: 1, y: 1, width: 4, height: 2 },
        relativeBox: { x: 1, y: 1, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:second",
        parentId: "2:observation",
        name: "会议倒计时",
        type: "TEXT",
        text: "--",
        box: { x: 1, y: 5, width: 4, height: 2 },
        relativeBox: { x: 1, y: 5, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:third",
        parentId: "2:observation",
        name: "快讯轮播",
        type: "TEXT",
        text: "--",
        box: { x: 1, y: 9, width: 4, height: 2 },
        relativeBox: { x: 1, y: 9, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .first",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "--",
        box: { x: 1, y: 3, width: 4, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .countdown",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "--",
        box: { x: 1, y: 17, width: 4, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .swiper-slide",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "--",
        box: { x: 1, y: 21, width: 4, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });
  actual.samples = [0, 1, 2].map((index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[2].elements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [0, 1, 2],
    presentInAllSamples: true,
    textChanged: false,
    geometryChanged: false,
    styleChanged: false,
    observedTexts: [element.text ?? ""]
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "三个重复占位符属于同一个利率观察模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:observation",
            designPath: ["行情", "利率观察"],
            status: "matched",
            actualParentSelector: ".rate-observation",
            displacement: { x: 0, y: 999 },
            confidence: 0.95,
            reason: "模型根据页面图像推断模块整体位移。"
          }]
        },
        bindings: [
          {
            figmaNodeId: "2:first",
            fingerprintKey: "dom:span:.rate-observation .first",
            confidence: 0.95,
            reason: "第一行语义和层级一致。"
          },
          {
            figmaNodeId: "2:second",
            fingerprintKey: "dom:span:.rate-observation .countdown",
            confidence: 0.95,
            reason: "第二行语义和层级一致。"
          },
          {
            figmaNodeId: "2:third",
            fingerprintKey: "dom:span:.rate-observation .swiper-slide",
            confidence: 0.95,
            reason: "第三行语义和层级一致。"
          }
        ]
      })
    }
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.equal(region?.source, "agent-verified");
  assert.equal(region?.displacement, undefined);
  assert.deepEqual(region?.anchorStats, {
    candidateCount: 3,
    stableCount: 1,
    dynamicExcludedCount: 2,
    structuralAnchorCount: 1,
    inlierCount: 1,
    residualPx: 0
  });
  assert.equal(region?.evidenceConfidence.score, 0.81);
  assert.equal(region?.evidenceConfidence.basis.includes("temporal-consistency"), true);
  assert.match(region?.reason ?? "", /移除模型推断的整体位移/);
});

test("removes an Agent module displacement when verified bindings have no majority", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:first",
        parentId: "2:observation",
        name: "第一行",
        type: "TEXT",
        text: "--",
        box: { x: 1, y: 1, width: 4, height: 2 },
        relativeBox: { x: 1, y: 1, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:second",
        parentId: "2:observation",
        name: "第二行",
        type: "TEXT",
        text: "--",
        box: { x: 1, y: 5, width: 4, height: 2 },
        relativeBox: { x: 1, y: 5, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .first",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "--",
        box: { x: 1, y: 13, width: 4, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .second",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "--",
        box: { x: 1, y: 7, width: 4, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "两个重复占位符属于同一个利率观察模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:observation",
            designPath: ["行情", "利率观察"],
            status: "matched",
            actualParentSelector: ".rate-observation",
            displacement: { x: 0, y: 999 },
            confidence: 0.95,
            reason: "模型推断模块位移。"
          }]
        },
        bindings: [
          {
            figmaNodeId: "2:first",
            fingerprintKey: "dom:span:.rate-observation .first",
            confidence: 0.95,
            reason: "第一行语义和层级一致。"
          },
          {
            figmaNodeId: "2:second",
            fingerprintKey: "dom:span:.rate-observation .second",
            confidence: 0.95,
            reason: "第二行语义和层级一致。"
          }
        ]
      })
    }
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.equal(region?.status, "matched");
  assert.equal(region?.displacement, undefined);
  assert.deepEqual(region?.anchorStats, {
    candidateCount: 2,
    stableCount: 2,
    dynamicExcludedCount: 0,
    structuralAnchorCount: 0,
    inlierCount: 1,
    residualPx: 0
  });
  assert.equal(region?.evidenceConfidence.score, 0.58);
  assert.match(region?.reason ?? "", /已验证元素锚点位移无多数共识/);
});

test("retains shared displacement diagnostics without publishing absolute position findings", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [
      {
        id: "2:title",
        parentId: "2:observation",
        name: "利率观察标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 1, y: 1, width: 8, height: 2 },
        relativeBox: { x: 1, y: 1, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:range",
        parentId: "2:observation",
        name: "利率区间",
        type: "TEXT",
        text: "利率区间(%)",
        box: { x: 1, y: 5, width: 8, height: 2 },
        relativeBox: { x: 1, y: 5, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      },
      {
        id: "2:probability",
        parentId: "2:observation",
        name: "最新概率",
        type: "TEXT",
        text: "最新概率",
        box: { x: 1, y: 9, width: 8, height: 2 },
        relativeBox: { x: 1, y: 9, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      }
    ]
  }]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:title",
        tag: "h2",
        text: "利率观察",
        box: { x: 1, y: 6, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .range",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:range",
        tag: "span",
        text: "利率区间(%)",
        box: { x: 1, y: 10, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .probability",
        parentSelector: ".rate-observation",
        dataFigmaId: "2:probability",
        tag: "span",
        text: "最新概率",
        box: { x: 1, y: 14, width: 8, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );
  const positionIssues = result.issues.filter((candidate) => hasRule(candidate, "position"));

  assert.equal(positionIssues.length, 0);
  assert.ok(result.matching.pageAlignment.regions.some(region => region.displacement?.y === 5));

  const stricterResult = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(`
page_alignment:
  confidence:
    levels:
      high_min: 0.99
      medium_min: 0.72
      low_min: 0
`),
    "zh-CN"
  );
  assert.equal(
    stricterResult.issues.find((candidate) => hasRule(candidate, "position"))?.severity,
    undefined
  );
});

test("keeps cross-branch displacement diagnostic when local adjacency is unverified", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:observation",
    parentId: "1:2",
    name: "利率观察",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [{
      id: "3:header",
      parentId: "2:observation",
      name: "模块标题区",
      type: "FRAME",
      box: { x: 0, y: 0, width: 16, height: 4 },
      relativeBox: { x: 0, y: 0, width: 16, height: 4 },
      style: {},
      children: [{
        id: "4:title",
        parentId: "3:header",
        name: "利率观察标题",
        type: "TEXT",
        text: "利率观察",
        box: { x: 1, y: 1, width: 8, height: 2 },
        relativeBox: { x: 1, y: 1, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      }]
    }, {
      id: "3:table",
      parentId: "2:observation",
      name: "概率表格区",
      type: "FRAME",
      box: { x: 0, y: 5, width: 16, height: 8 },
      relativeBox: { x: 0, y: 5, width: 16, height: 8 },
      style: {},
      children: [{
        id: "4:probability",
        parentId: "3:table",
        name: "概率表头",
        type: "TEXT",
        text: "概率",
        box: { x: 1, y: 6, width: 4, height: 2 },
        relativeBox: { x: 1, y: 1, width: 4, height: 2 },
        style: { fontSize: 12 },
        children: []
      }]
    }]
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".heading-branch .title",
      parentSelector: ".heading-branch",
      dataFigmaId: "4:title",
      tag: "h2",
      text: "利率观察",
      box: { x: 1, y: 6, width: 8, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".table-branch .probability",
      parentSelector: ".table-branch",
      dataFigmaId: "4:probability",
      tag: "th",
      text: "概率",
      box: { x: 1, y: 11, width: 4, height: 2 },
      style: { fontSize: 12 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/rate-observation"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN"
  );
  const moduleRegion = result.matching.pageAlignment.regions.find(
    (region) => region.designParentFigmaNodeId === "2:observation"
  );
  const positionIssues = result.issues.filter((candidate) => hasRule(candidate, "position"));

  assert.deepEqual(moduleRegion?.displacement, { x: 0, y: 5 });
  assert.equal(moduleRegion?.source, "deterministic");
  assert.equal(moduleRegion?.actualParentSelector, undefined);
  assert.equal(positionIssues.length, 0);
  assert.ok(result.matching.designCoverage?.items.some(item => item.checks?.some(check => check.rule === "position" && check.status === "pending")));

});

test("uses a structured missing-region decision to suppress descendant matches", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:poll",
    parentId: "1:2",
    name: "投票模块",
    type: "FRAME",
    box: { x: 0, y: 0, width: 16, height: 16 },
    relativeBox: { x: 0, y: 0, width: 16, height: 16 },
    style: {},
    children: [{
      id: "2:poll-card",
      parentId: "2:poll",
      name: "投票卡片",
      type: "RECTANGLE",
      box: { x: 2, y: 4, width: 12, height: 8 },
      relativeBox: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }]
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".news-card",
      parentSelector: ".news-list",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/missing-poll"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "开发页缺少投票模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:poll",
            designPath: ["行情", "投票模块"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.94,
            reason: "设计中的投票卡片在开发页没有对应模块。"
          }]
        },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.matches.length, 0);
  assert.equal(
    result.issues.some((issue) => hasRule(issue, "missing_module")),
    false
  );
  assert.deepEqual(
    result.matching.pageAlignment?.regions.map((region) => ({
      designParentFigmaNodeId: region.designParentFigmaNodeId,
      status: region.status,
      source: region.source
    })),
    [{
      designParentFigmaNodeId: "2:poll",
      status: "missing-in-actual",
      source: "agent-verified"
    }]
  );
});

test("retains verified missing-module calibration evidence without publishing H5 scope omissions", async () => {
  const image = await sharp({
    create: {
      width: 100,
      height: 40,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const textNode = (
    id: string,
    parentId: string,
    name: string,
    text: string,
    y: number
  ) => ({
    id,
    parentId,
    name,
    type: "TEXT",
    text,
    box: { x: 2, y, width: 40, height: 2 },
    relativeBox: { x: 2, y: y % 10, width: 40, height: 2 },
    style: { fontSize: 12 },
    children: []
  });
  const truth = designTruth(image, [{
    id: "2:before",
    parentId: "1:2",
    name: "上方模块",
    type: "FRAME",
    box: { x: 0, y: 0, width: 100, height: 10 },
    relativeBox: { x: 0, y: 0, width: 100, height: 10 },
    style: {},
    children: [
      textNode("3:before-title", "2:before", "上方标题", "上方标题", 1),
      textNode("3:before-label", "2:before", "上方标签", "上方标签", 5)
    ]
  }, {
    id: "2:missing",
    parentId: "1:2",
    name: "投票模块",
    type: "FRAME",
    box: { x: 0, y: 10, width: 100, height: 20 },
    relativeBox: { x: 0, y: 10, width: 100, height: 20 },
    style: {},
    children: [{
      id: "3:missing-card",
      parentId: "2:missing",
      name: "投票卡片",
      type: "RECTANGLE",
      box: { x: 2, y: 12, width: 96, height: 16 },
      relativeBox: { x: 2, y: 2, width: 96, height: 16 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }]
  }, {
    id: "2:after",
    parentId: "1:2",
    name: "下方模块",
    type: "FRAME",
    box: { x: 0, y: 30, width: 100, height: 10 },
    relativeBox: { x: 0, y: 30, width: 100, height: 10 },
    style: {},
    children: [
      textNode("3:after-title", "2:after", "下方标题", "下方标题", 31),
      textNode("3:after-label", "2:after", "下方标签", "下方标签", 35)
    ]
  }]);
  truth.render.viewport = { width: 100, height: 40 };
  truth.root.box = { x: 0, y: 0, width: 100, height: 40 };
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".before .title",
      parentSelector: ".before",
      dataFigmaId: "3:before-title",
      tag: "span",
      text: "上方标题",
      box: { x: 2, y: 1, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".before .label",
      parentSelector: ".before",
      dataFigmaId: "3:before-label",
      tag: "span",
      text: "上方标签",
      box: { x: 2, y: 5, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".after .title",
      parentSelector: ".after",
      dataFigmaId: "3:after-title",
      tag: "span",
      text: "下方标题",
      box: { x: 2, y: 11, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".after .label",
      parentSelector: ".after",
      dataFigmaId: "3:after-label",
      tag: "span",
      text: "下方标签",
      box: { x: 2, y: 15, width: 40, height: 2 },
      style: { fontSize: 12 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/verified-missing-module"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "投票模块缺失导致下方模块上移。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:missing",
            designPath: ["行情", "投票模块"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.95,
            reason: "开发页在两个已匹配模块之间没有投票模块。"
          }]
        },
        bindings: []
      })
    }
  );

  const missingIssue = result.issues.find((issue) => hasRule(issue, "missing_module"));
  assert.equal(result.matching.unmatchedActualCount, 0);
  assert.equal(missingIssue, undefined);
  assert.equal(result.matching.designCoverage?.items.find(item => item.figmaNodeId === "2:missing")?.reviewStatus, "not-applicable");
  assert.deepEqual(result.matching.missingModules, {
    evaluatedCount: 1,
    publishedCount: 1,
    candidates: [{
      candidateId: "missing-module:2:missing:2",
      regionIndex: 2,
      figmaNodeId: "2:missing",
      designPath: ["行情", "投票模块"],
      topology: "interior",
      precedingRegionId: "2:before",
      followingRegionId: "2:after",
      designBox: { x: 0, y: 10, width: 100, height: 20 },
      designFlowGapPx: 20,
      displacementStepPx: 20,
      residualPx: 0,
      residualRatio: 0,
      horizontalOverlapRatio: 1,
      published: true,
      rejectionReasons: [],
      thresholds: {
        positionTolerancePx: 4,
        minimumHorizontalOverlapRatio: 0.5,
        maximumResidualRatio: 0.15
      }
    }]
  });
});

for (const side of ["following", "preceding"] as const) {
test(`uses temporally stable ${side} structure as a missing-module anchor`, async () => {
  const image = await sharp({
    create: {
      width: 100,
      height: 50,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const textNode = (
    id: string,
    parentId: string,
    name: string,
    text: string,
    y: number
  ) => ({
    id,
    parentId,
    name,
    type: "TEXT",
    text,
    box: { x: 2, y, width: 40, height: 2 },
    relativeBox: { x: 2, y: y % 10, width: 40, height: 2 },
    style: { fontSize: 12 },
    children: []
  });
  const truth = designTruth(image, [{
    id: "2:before",
    parentId: "1:2",
    name: "上方模块",
    type: "FRAME",
    box: { x: 0, y: 0, width: 100, height: 10 },
    relativeBox: { x: 0, y: 0, width: 100, height: 10 },
    style: {},
    children: [
      textNode("3:before-title", "2:before", "上方标题", "上方标题", 1),
      textNode("3:before-header", "2:before", "上方表头", "上方表头", 5)
    ]
  }, {
    id: "2:missing",
    parentId: "1:2",
    name: "投票模块",
    type: "FRAME",
    box: { x: 0, y: 10, width: 100, height: 20 },
    relativeBox: { x: 0, y: 10, width: 100, height: 20 },
    style: {},
    children: [{
      id: "3:missing-card",
      parentId: "2:missing",
      name: "投票卡片",
      type: "RECTANGLE",
      box: { x: 2, y: 12, width: 96, height: 16 },
      relativeBox: { x: 2, y: 2, width: 96, height: 16 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }]
  }, {
    id: "2:after",
    parentId: "1:2",
    name: "后续资讯模块",
    type: "FRAME",
    box: { x: 0, y: 30, width: 100, height: 20 },
    relativeBox: { x: 0, y: 30, width: 100, height: 20 },
    style: {},
    children: [
      textNode("3:after-title", "2:after", "资讯标题", "设计标题", 31),
      textNode("3:after-header", "2:after", "资讯表头", "设计表头", 35),
      textNode("3:after-countdown", "2:after", "会议倒计时", "40", 39)
    ]
  }]);
  truth.render.viewport = { width: 100, height: 50 };
  truth.root.box = { x: 0, y: 0, width: 100, height: 50 };
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".before .title",
      parentSelector: ".before",
      dataFigmaId: side === "following" ? "3:before-title" : undefined,
      tag: "h2",
      text: side === "following" ? "上方标题" : "实际上方标题",
      box: { x: 2, y: 1, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".before .header",
      parentSelector: ".before",
      dataFigmaId: side === "following" ? "3:before-header" : undefined,
      tag: "th",
      text: side === "following" ? "上方表头" : "实际上方表头",
      box: { x: 2, y: 5, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".after .title",
      parentSelector: ".after",
      tag: "h2",
      text: "实际标题",
      box: { x: 2, y: 11, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".after .header",
      parentSelector: ".after",
      tag: "th",
      text: "实际表头",
      box: { x: 2, y: 15, width: 40, height: 2 },
      style: { fontSize: 12 }
    }, {
      selector: ".after .countdown",
      parentSelector: ".after",
      tag: "h3",
      text: "7",
      box: { x: 2, y: 19, width: 40, height: 2 },
      style: { fontSize: 12 }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/trailing-missing-module"
  });
  actual.samples = [0, 1, 2].map((index) => ({
    ...actual.samples[0],
    index,
    capturedAtMs: index * 750
  }));
  actual.canonicalSampleIndex = 2;
  actual.elementChanges = actual.samples[0].elements.map((element) => ({
    fingerprintKey: element.fingerprint.key,
    selector: element.selector,
    observedSampleIndexes: [0, 1, 2],
    presentInAllSamples: true,
    textChanged: element.selector.endsWith(".countdown"),
    geometryChanged: false,
    styleChanged: false,
    observedTexts: element.selector.endsWith(".countdown")
      ? ["9", "8", "7"]
      : [element.text ?? ""]
  }));

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "投票模块缺失，后续资讯模块整体上移。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:missing",
            designPath: ["行情", "投票模块"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.95,
            reason: "开发页没有设计中的投票模块。"
          }, {
            designParentFigmaNodeId: "3:missing-card",
            designPath: ["行情", "投票模块", "投票卡片"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.95,
            reason: "整块投票卡片缺失。"
          }]
        },
        bindings: [...(side === "preceding" ? [{
          figmaNodeId: "3:before-title",
          fingerprintKey: "dom:h2:.before .title",
          confidence: 0.95,
          reason: "上方标题结构一致。"
        }, {
          figmaNodeId: "3:before-header",
          fingerprintKey: "dom:th:.before .header",
          confidence: 0.95,
          reason: "上方表头结构一致。"
        }] : []), {
          figmaNodeId: "3:after-title",
          fingerprintKey: "dom:h2:.after .title",
          confidence: 0.95,
          reason: "标题角色和后续模块结构一致。"
        }, {
          figmaNodeId: "3:after-header",
          fingerprintKey: "dom:th:.after .header",
          confidence: 0.95,
          reason: "表头角色和后续模块结构一致。"
        }, {
          figmaNodeId: "3:after-countdown",
          fingerprintKey: "dom:h3:.after .countdown",
          confidence: 0.95,
          reason: "倒计时位于同一后续模块。"
        }]
      })
    }
  );

  const missingIssue = result.issues.find((candidate) => hasRule(candidate, "missing_module"));
  const missingEvaluation = result.matching.missingModules?.candidates[0];
  assert.equal(result.matching.missingModules?.evaluatedCount, 1);
  assert.equal(missingIssue, undefined);
  assert.equal(missingEvaluation?.followingRegionId, "2:after");
  assert.equal(missingEvaluation?.designFlowGapPx, 20);
  assert.equal(missingEvaluation?.displacementStepPx, 20);
  assert.equal(missingEvaluation?.residualPx, 0);
  assert.equal(missingEvaluation?.published, true);
  assert.equal(
    missingEvaluation?.followingAnchorSource,
    "temporal-stable-structure-fallback"
  );
  assert.deepEqual(missingEvaluation?.followingAnchorStats, {
    candidateCount: 3,
    stableCount: 2,
    dynamicExcludedCount: 1,
    structuralAnchorCount: 2,
    inlierCount: 2,
    residualPx: 0
  });
  assert.ok(
    result.matching.pageAlignment.regions.some((region) =>
      region.designParentFigmaNodeId === "2:after" &&
      region.evidenceConfidence.basis.includes("temporal-consistency")
    )
  );
});
}

for (const bound of [true, false]) {
for (const wrapped of [true, false]) {
test(`reviews date slots only with verified container identity (${bound}, wrapped ${wrapped})`, async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "dates", parentId: "1:2", name: "编组", type: "FRAME",
    box: { x: 0, y: 8, width: 16, height: 4 }, style: { backgroundColor: "#ffffff" },
    children: ["3月19日", "4月30日"].map((text, i) => ({
      id: `date:${i}`, parentId: "dates", name: text, type: "TEXT", text,
      box: { x: i * 8, y: 8, width: 7, height: 4 }, style: { fontSize: 12 }, children: []
    }))
  }]);
  const evidence = liveEvidence({ image, audits: [], diagnostics: [], finalUrl: "https://example.test/dates",
    elements: [{ selector: ".dates", tag: "nav", dataFigmaId: bound ? "dates" : undefined, box: { x: 0, y: 0, width: 16, height: 4 }, style: {} },
      ...["09月17日", "10月29日"].map((text, i) => ({ selector: `.dates > span:nth-of-type(${i+1})`, parentSelector: ".dates", tag: "span", text,
        box: { x: i * 8, y: bound ? 0 : 8, width: 7, height: 4 }, style: { fontSize: 18 } }))]
  });
  if (wrapped) {
    const row = truth.root.children[0];
    row.children = row.children.map((node, i) => ({id: `option:${i}`, parentId: "dates", name: "编组", type: "GROUP", box: node.box,
      style: {backgroundColor: "#ffffff", borderWidth: 0}, children: [{...node, parentId: `option:${i}`}]}));
    evidence.samples[0].elements.slice(1).forEach((node, i) => {
      const selector = `.dates > button:nth-of-type(${i+1})`;
      evidence.samples[0].elements.push({...node, selector, parentSelector: ".dates", tag: "button", text: undefined,
        style: {backgroundColor: "#ffffff", borderWidth: 1}, fingerprint: {...node.fingerprint, key: `dom:${selector}`, selector}});
      node.parentSelector = selector;
    });
  }
  const result = await compareLiveEvidence(truth, evidence, parseAcceptanceYaml(), "zh-CN");
  assert.equal(result.matching.matches.filter(m => m.figmaNodeId.startsWith("date:")).length, bound ? 2 : 0);
  assert.equal(result.issues.some(i => hasRule(i, "typography") && i.figmaNodeId === "date:0"), bound);
  if (bound && wrapped) assert.ok(result.issues.some(i => hasRule(i, "decoration") && i.figmaNodeId === "option:0"));
});
}
}

test("reports a newly introduced one-pixel border on an identified date selector", async () => {
  const image = await solidPng();
  const box = {x: 0, y: 0, width: 16, height: 8};
  const truth = designTruth(image, [{id: "dates", name: "日期选项", type: "FRAME", box, style: {borderWidth: 0}, children: []}]);
  const evidence = liveEvidence({image, audits: [], diagnostics: [], finalUrl: "https://example.test/dates",
    elements: [{selector: ".dates", tag: "nav", dataFigmaId: "dates", box, style: {borderWidth: 1}}]});
  const result = await compareLiveEvidence(truth, evidence, parseAcceptanceYaml(), "zh-CN");
  assert.ok(result.issues.some(issue => hasRule(issue, "decoration") && issue.figmaNodeId === "dates"));
});

test("supplies structural module ids and descendant headings even when plain groups are not element candidates", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{id: "policy", parentId: "1:2", name: "编组", type: "GROUP",
    box: {x: 0, y: 4, width: 16, height: 8}, style: {}, children: [{
      id: "policy:title", parentId: "policy", name: "文本", type: "TEXT", text: "最新货币政策",
      box: {x: 0, y: 4, width: 12, height: 2}, style: {}, children: []
    }]}]);
  const evidence = liveEvidence({image, audits: [], diagnostics: [], finalUrl: "https://example.test/regions",
    elements: [{selector: "main", tag: "main", box: {x: 0,y: 0,width: 16,height: 16}, style: {}}]});
  let checked = false;
  await compareLiveEvidence(truth, evidence, parseAcceptanceYaml(), "zh-CN", {elementBindingAgent: async ({request}) => {
    assert.ok(request.designRegions?.some(region => region.figmaNodeId === "policy" && region.contextTexts.includes("最新货币政策")));
    checked = true;
    return {pageSummary: "", alignmentPlan: {regions: []}, bindings: []};
  }});
  assert.equal(checked, true);
});

test("keeps deterministic fallback available when the root Frame is uncertain", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:unknown-card",
    parentId: "1:2",
    name: "待确认卡片",
    type: "RECTANGLE",
    box: { x: 2, y: 4, width: 12, height: 8 },
    relativeBox: { x: 2, y: 4, width: 12, height: 8 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".unknown-card",
      parentSelector: ".unknown-region",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/uncertain-region"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "该区域没有足够证据建立模块对应。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "1:2",
            designPath: ["行情"],
            status: "uncertain",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.7,
            reason: "只有几何接近，没有语义锚点。"
          }]
        },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.matches.length, 1);
  assert.equal(result.matching.matches[0]?.figmaNodeId, "2:unknown-card");
  assert.equal(result.matching.pageAlignment?.regions[0]?.status, "uncertain");
});

test("keeps an uncertain child region out of deterministic geometry fallback", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:unknown-region",
    parentId: "1:2",
    name: "待确认模块",
    type: "FRAME",
    box: { x: 0, y: 0, width: 20, height: 20 },
    relativeBox: { x: 0, y: 0, width: 20, height: 20 },
    style: { backgroundColor: "#ffffff" },
    children: [{
      id: "3:unknown-card",
      parentId: "2:unknown-region",
      name: "待确认卡片",
      type: "RECTANGLE",
      box: { x: 2, y: 4, width: 12, height: 8 },
      relativeBox: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "#ffffff" },
      children: []
    }]
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".unknown-card",
      parentSelector: ".unknown-region",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/uncertain-child-region"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "该子模块没有足够证据建立对应。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:unknown-region",
            designPath: ["行情", "待确认模块"],
            status: "uncertain",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.7,
            reason: "只有几何接近，没有语义锚点。"
          }]
        },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.matches.length, 0);
  assert.equal(result.matching.pageAlignment?.regions[0]?.status, "uncertain");
});

test("removes an Agent displacement when no stable verified binding anchors exist", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:unknown-card",
    parentId: "1:2",
    name: "待确认卡片",
    type: "RECTANGLE",
    box: { x: 2, y: 4, width: 12, height: 8 },
    relativeBox: { x: 2, y: 4, width: 12, height: 8 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".unknown-card",
      parentSelector: ".unknown-region",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/unanchored-agent-displacement"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "模型识别为同一页面，但没有建立元素锚点。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "1:2",
            designPath: ["行情"],
            status: "matched",
            actualParentSelector: ".unknown-region",
            displacement: { x: 0, y: -20 },
            confidence: 0.95,
            reason: "仅根据整页截图推断位移。"
          }]
        },
        bindings: []
      })
    }
  );

  const region = result.matching.pageAlignment?.regions[0];
  assert.equal(region?.source, "agent-verified");
  assert.equal(region?.displacement, undefined);
  assert.equal(region?.anchorStats.stableCount, 0);
  assert.equal(region?.anchorStats.inlierCount, 0);
});

test("reports rejected page alignment proposals in diagnostics", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:card",
    parentId: "1:2",
    name: "行情卡片",
    type: "RECTANGLE",
    box: { x: 2, y: 4, width: 12, height: 8 },
    relativeBox: { x: 2, y: 4, width: 12, height: 8 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".market-card",
      parentSelector: ".market",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/invalid-alignment"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "模型引用了候选集以外的模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "999:unknown",
            designPath: ["未知模块"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.95,
            reason: "开发页中没有看到该模块。"
          }]
        },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.pageAlignment?.rejectedRegionCount, 1);
  assert.match(result.matching.diagnostics.join("\n"), /模块对齐提案拒绝 1/);
});

test("rejects uncertain page alignment that claims an actual region", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:card",
    parentId: "1:2",
    name: "行情卡片",
    type: "RECTANGLE",
    box: { x: 2, y: 4, width: 12, height: 8 },
    relativeBox: { x: 2, y: 4, width: 12, height: 8 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".market-card",
      parentSelector: ".market",
      tag: "article",
      box: { x: 2, y: 4, width: 12, height: 8 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/contradictory-alignment"
  });

  const result = await compareLiveEvidence(
    truth,
    actual,
    parseAcceptanceYaml(),
    "zh-CN",
    {
      elementBindingAgent: async () => ({
        pageSummary: "证据不足，但错误地给出了开发模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "1:2",
            designPath: ["行情"],
            status: "uncertain",
            actualParentSelector: ".market",
            displacement: { x: 0, y: 0 },
            confidence: 0.8,
            reason: "无法确定是否属于同一模块。"
          }]
        },
        bindings: []
      })
    }
  );

  assert.equal(result.matching.pageAlignment?.rejectedRegionCount, 1);
  assert.equal(
    result.matching.pageAlignment?.regions.some((region) => region.status === "uncertain"),
    false
  );
});

test("routes duplicate text across shifted modules to AI with hierarchy context", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [
    {
      id: "2:policy",
      parentId: "1:2",
      name: "最新货币政策",
      type: "FRAME",
      box: { x: 0, y: 0, width: 16, height: 8 },
      relativeBox: { x: 0, y: 0, width: 16, height: 8 },
      style: {},
      children: [{
        id: "2:policy-range",
        parentId: "2:policy",
        name: "利率区间",
        type: "TEXT",
        text: "利率区间(%)",
        box: { x: 0, y: 3, width: 8, height: 2 },
        relativeBox: { x: 0, y: 3, width: 8, height: 2 },
        style: { fontSize: 12 },
        children: []
      }]
    },
    {
      id: "2:observation",
      parentId: "1:2",
      name: "利率观察",
      type: "FRAME",
      box: { x: 0, y: 8, width: 16, height: 8 },
      relativeBox: { x: 0, y: 8, width: 16, height: 8 },
      style: {},
      children: [
        {
          id: "2:observation-title",
          parentId: "2:observation",
          name: "利率观察",
          type: "TEXT",
          text: "利率观察",
          box: { x: 0, y: 8, width: 8, height: 2 },
          relativeBox: { x: 0, y: 0, width: 8, height: 2 },
          style: { fontSize: 12 },
          children: []
        },
        {
          id: "2:observation-range",
          parentId: "2:observation",
          name: "利率区间",
          type: "TEXT",
          text: "利率区间(%)",
          box: { x: 0, y: 11, width: 8, height: 2 },
          relativeBox: { x: 0, y: 3, width: 8, height: 2 },
          style: { fontSize: 12 },
          children: []
        }
      ]
    }
  ]);
  const actual = liveEvidence({
    image,
    elements: [
      {
        selector: ".rate-observation .title",
        parentSelector: ".rate-observation",
        tag: "h2",
        text: "利率观察",
        box: { x: 0, y: 0, width: 8, height: 2 },
        style: { fontSize: 12 }
      },
      {
        selector: ".rate-observation .range",
        parentSelector: ".rate-observation",
        tag: "span",
        text: "利率区间(%)",
        box: { x: 0, y: 3, width: 8, height: 2 },
        style: { fontSize: 12 }
      }
    ],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/fed"
  });
  let calls = 0;

  const result = await compareLiveEvidence(truth, actual, parseAcceptanceYaml(), "zh-CN", {
    elementBindingAgent: async ({ request }) => {
      calls += 1;
      const designCandidate = request.designCandidates.find(
        (candidate) => candidate.figmaNodeId === "2:observation-range"
      );
      const actualCandidate = request.actualCandidates.find(
        (candidate) => candidate.selector === ".rate-observation .range"
      );
      assert.deepEqual(designCandidate?.ancestorPath, ["行情", "利率观察"]);
      assert.equal(actualCandidate?.parentSelector, ".rate-observation");
      return {
        pageSummary: "开发页缺少上方模块，利率观察整体上移。",
        alignmentPlan: { regions: [] },
        bindings: [{
          figmaNodeId: "2:observation-range",
          fingerprintKey: actualCandidate!.fingerprintKey,
          confidence: 0.94,
          reason: "文案一致，且都位于利率观察模块。"
        }]
      };
    }
  });

  assert.equal(calls, 1);
  assert.equal(
    result.matching.matches.find((match) => match.selector === ".rate-observation .range")?.figmaNodeId,
    "2:observation-range"
  );
  assert.match(result.matching.diagnostics.join("\n"), /重复文案/);
});

test("gives AI one correction round after deterministic element-binding rejection", async () => {
  const image = await solidPng();
  const truth = designTruth(image, [{
    id: "2:card",
    parentId: "1:2",
    name: "概率卡片",
    type: "RECTANGLE",
    box: { x: 0, y: 0, width: 8, height: 4 },
    relativeBox: { x: 0, y: 0, width: 8, height: 4 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }]);
  const actual = liveEvidence({
    image,
    elements: [{
      selector: ".card",
      tag: "section",
      box: { x: 8, y: 12, width: 8, height: 4 },
      style: { backgroundColor: "rgb(255, 255, 255)" }
    }],
    audits: [],
    diagnostics: [],
    finalUrl: "https://example.test/fed"
  });
  let calls = 0;
  const result = await compareLiveEvidence(truth, actual, parseAcceptanceYaml(), "zh-CN", {
    elementBindingAgent: async ({ request }) => {
      calls += 1;
      if (calls === 1) {
        return {
          pageSummary: "第一次候选不可靠。",
          alignmentPlan: { regions: [] },
          bindings: [{
            figmaNodeId: "2:card",
            fingerprintKey: "missing-fingerprint",
            confidence: 0.95,
            reason: "初次视觉判断。"
          }]
        };
      }
      assert.match(request.feedback?.rejectedBindings[0].reason ?? "", /候选 ID 不存在/);
      return {
        pageSummary: "已按复核反馈纠正。",
        alignmentPlan: { regions: [] },
        bindings: [{
          figmaNodeId: "2:card",
          fingerprintKey: actual.samples[0].elements[0].fingerprint.key,
          confidence: 0.9,
          reason: "纠正后业务语义与尺寸一致。"
        }]
      };
    }
  });

  assert.equal(calls, 2);
  assert.equal(result.matching.matches.length, 1);
  assert.match(result.matching.diagnostics.join("\n"), /接受 1 项；经过 2 轮，确定性复核拒绝 1 项/);
});

test("reviews local sibling spacing without reporting common page displacement", async () => {
  const image = await sharp({create:{width:100,height:100,channels:4,background:"white"}}).png().toBuffer();
  const truth = designTruth(image,[{id:"card",parentId:"1:2",name:"卡片",type:"GROUP",box:{x:0,y:0,width:100,height:100},style:{},children:[
    {id:"a",parentId:"card",name:"标题",type:"TEXT",text:"标题",box:{x:10,y:10,width:40,height:10},style:{},children:[]},
    {id:"b",parentId:"card",name:"说明",type:"TEXT",text:"说明",box:{x:10,y:40,width:40,height:10},style:{},children:[]}
  ]}]);
  truth.render.viewport = {width:100,height:100}; truth.root.box = {x:0,y:0,width:100,height:100};
  const actual = liveEvidence({image,elements:[
    {selector:".card",dataFigmaId:"card",tag:"section",box:{x:0,y:100,width:100,height:100},style:{}},
    {selector:".a",parentSelector:".card",dataFigmaId:"a",tag:"p",text:"标题",box:{x:10,y:110,width:40,height:10},style:{}},
    {selector:".b",parentSelector:".card",dataFigmaId:"b",tag:"p",text:"说明",box:{x:10,y:140,width:40,height:10},style:{}}
  ],audits:[],diagnostics:[],finalUrl:"https://example.test"});
  const equal = await compareLiveEvidence(truth,actual,parseAcceptanceYaml(),"zh-CN");
  assert.equal(equal.issues.some(issue => hasRule(issue,"position") || hasRule(issue,"region_displacement")),false);
  actual.samples[0].elements[2].box.y += 8;
  const changed = await compareLiveEvidence(truth,actual,parseAcceptanceYaml(),"zh-CN");
  assert.ok(changed.issues.some(issue => hasRule(issue,"position") && issue.evidence.some(evidence => evidence.summary.includes("8px"))));
  assert.ok(changed.matching.designCoverage?.items.find(item => item.figmaNodeId === "b")?.checks?.some(check => check.rule === "position" && check.status === "difference"));
});

test("local pixel evidence compares translated content and excludes design-only modules", async () => {
  const render = (y: number, extra: boolean) => sharp(Buffer.from(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="white"/><rect x="10" y="${y}" width="20" height="10" fill="black"/>${extra ? '<rect x="60" y="10" width="30" height="80" fill="red"/>' : ''}</svg>`)).png().toBuffer();
  const reference = await render(10,true), actualImage = await render(40,false);
  const truth = designTruth(reference,[
    {id:"icon",parentId:"1:2",name:"图标",type:"RECTANGLE",box:{x:10,y:10,width:20,height:10},style:{backgroundColor:"black"},children:[]},
    {id:"extra",parentId:"1:2",name:"设计额外模块",type:"RECTANGLE",box:{x:60,y:10,width:30,height:80},style:{backgroundColor:"red"},children:[]}
  ]);
  truth.render.viewport = {width:100,height:100}; truth.root.box = {x:0,y:0,width:100,height:100};
  const result = await compareLiveEvidence(truth,liveEvidence({image:actualImage,elements:[
    {selector:".icon",dataFigmaId:"icon",tag:"div",box:{x:10,y:40,width:20,height:10},style:{backgroundColor:"black"}}
  ],audits:[],diagnostics:[],finalUrl:"https://example.test"}),parseAcceptanceYaml(),"zh-CN");
  assert.equal(result.similarity,1);
  assert.equal(result.matching.visualScope?.reviewedPixels,200);
  assert.equal(result.matching.visualScope?.changedPixels,0);
  assert.equal(result.issues.some(issue => hasRule(issue,"visual_similarity") || hasRule(issue,"missing_module") || hasRule(issue,"position")),false);
});

test("maps a single text child to verified parent flex alignment using rendered bounds", async () => {
  const image = await sharp({create:{width:100,height:100,channels:4,background:"white"}}).png().toBuffer();
  const truth = designTruth(image,[{id:"cell",parentId:"1:2",name:"单元格",type:"GROUP",box:{x:0,y:0,width:100,height:30},style:{},layout:{paddingRight:10},children:[
    {id:"label",parentId:"cell",name:"文字",type:"TEXT",text:"标签",box:{x:60,y:0,width:30,height:10},style:{textAlign:"right"},children:[]}
  ]}]);
  truth.render.viewport = {width:100,height:100}; truth.root.box={x:0,y:0,width:100,height:100};
  const actual=liveEvidence({image,elements:[
    {selector:".cell",dataFigmaId:"cell",tag:"div",box:{x:0,y:0,width:100,height:30},style:{display:"flex",justifyContent:"flex-end",paddingRight:10}},
    {selector:".label",parentSelector:".cell",dataFigmaId:"label",tag:"span",text:"标签",box:{x:60,y:0,width:30,height:10},style:{display:"inline",textAlign:"start",textBounds:{x:60,y:0,width:30,height:10}}}
  ],audits:[],diagnostics:[],finalUrl:"https://example.test"});
  const equal = await compareLiveEvidence(truth,actual,parseAcceptanceYaml(),"zh-CN");
  assert.equal(equal.issues.some(issue => hasRule(issue,"alignment")),false);
  actual.samples[0].elements[1].style.textBounds!.x=10;
  const mismatch = await compareLiveEvidence(truth,actual,parseAcceptanceYaml(),"zh-CN");
  assert.ok(mismatch.issues.some(issue => hasRule(issue,"alignment")));
});

test("does not reject a snug probability label whose rendered position agrees despite different text-align values", async () => {
  const image = await solidPng();
  const box = {x: 2, y: 2, width: 10, height: 8};
  const truth = designTruth(image, [{id: "probability", name: "概率", type: "TEXT", text: "概率", box, style: {textAlign: "right"}, children: []}]);
  const result = await compareDesignToPage(truth, {image, elements: [{selector: ".probability", dataFigmaId: "probability", tag: "span", text: "概率", box, style: {display: "inline", textAlign: "left", textBounds: box}}], audits: [], diagnostics: [], finalUrl: "https://example.test"}, parseAcceptanceYaml(), "zh-CN");
  assert.equal(result.issues.some(issue => hasRule(issue, "alignment")), false);
});

test("does not treat a snug Figma text alignment as the alignment of a wider H5 button", async () => {
  const image = await sharp({create:{width:100,height:30,channels:4,background:"white"}}).png().toBuffer();
  const textBox = {x:30,y:5,width:40,height:20};
  const truth = designTruth(image,[{id:"expand",name:"展开更多",type:"TEXT",text:"展开更多",box:textBox,style:{textAlign:"justified"},children:[]}]);
  truth.render.viewport={width:100,height:30}; truth.root.box={x:0,y:0,width:100,height:30};
  const result = await compareDesignToPage(truth,{image,elements:[{selector:".expand",dataFigmaId:"expand",tag:"button",text:"展开更多",box:{x:0,y:0,width:100,height:30},style:{display:"block",textAlign:"left",textBounds:textBox}}],audits:[],diagnostics:[],finalUrl:"https://example.test"},parseAcceptanceYaml(),"zh-CN");
  assert.equal(result.issues.some(issue => hasRule(issue,"alignment")),false);
});

test("static rendered alignment differences do not claim dynamic normalization", async () => {
  const image=await solidPng(); const box={x:1,y:1,width:14,height:10};
  const truth=designTruth(image,[{id:"label",name:"标题",type:"TEXT",text:"标题",box,style:{textAlign:"right"},children:[]}]);
  const result=await compareDesignToPage(truth,{image,elements:[{selector:".label",dataFigmaId:"label",tag:"p",text:"标题",box,style:{textAlign:"left",textBounds:{x:1,y:1,width:3,height:10}}}],audits:[],diagnostics:[],finalUrl:"https://example.test"},parseAcceptanceYaml(),"zh-CN");
  const issue=result.issues.find(issue=>hasRule(issue,"alignment"));
  assert.ok(issue); assert.equal(result.dynamicNormalization.regions.length,0);
  assert.doesNotMatch(issue.summary,/动态|归一化/);
});

test("alignment without rendered text evidence stays unverified instead of blocking acceptance on CSS alone", async () => {
  const image=await solidPng();const box={x:1,y:1,width:14,height:10};
  const truth=designTruth(image,[{id:"label",name:"标题",type:"TEXT",text:"标题",box,style:{textAlign:"right"},children:[]}]);
  const result=await compareDesignToPage(truth,{image,elements:[{selector:".label",dataFigmaId:"label",tag:"p",text:"标题",box,style:{textAlign:"left"}}],audits:[],diagnostics:[],finalUrl:"https://example.test"},parseAcceptanceYaml(),"zh-CN");
  assert.equal(result.issues.some(issue=>hasRule(issue,"alignment") && issue.severity==="error"),false);
  const item=result.matching.designCoverage?.items.find(item=>item.figmaNodeId==="label");
  assert.ok(item?.checks?.some(check=>check.property==="textAlign" && check.status==="pending"));
});

test("published typography advice names the confirmed difference and changes actual values toward design values",async()=>{
 const image=await solidPng();const box={x:2,y:2,width:10,height:10};
 const truth=designTruth(image,[{id:"forecast",name:"未来利率预测",type:"TEXT",text:"未来利率预测",box,style:{fontWeight:500},children:[]}]);
 const result=await compareDesignToPage(truth,{image,elements:[{selector:"body > div",tag:"div",dataFigmaId:"forecast",text:"未来利率预测",box,style:{fontWeight:400}}],audits:[],diagnostics:[],finalUrl:"https://example.test"},parseAcceptanceYaml(),"zh-CN");
 const issue=result.issues.find(issue=>hasRule(issue,"typography"))!;
 assert.match(issue.summary,/设计为 500.*实际为 400/);assert.match(issue.primaryAction,/字重由 400 调整为 500/);assert.doesNotMatch(issue.primaryAction,/字号|行高|body|div|CSS/);
});
