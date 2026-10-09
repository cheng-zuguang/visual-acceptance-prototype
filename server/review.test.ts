import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type {
  DesignTruth,
  DomElement,
  FigmaDesignTruth,
  LiveActualEvidence,
  StaticAudit
} from "../src/types";
import { ReviewService } from "./review";

async function solidPng(width = 16, height = 16): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

function figmaTruth(image: Buffer): FigmaDesignTruth {
  return {
    source: {
      kind: "figma",
      fileKey: "FILE_KEY",
      frameId: "1:2",
      fileName: "金融 H5",
      frameName: "行情首页"
    },
    render: {
      image,
      viewport: { width: 16, height: 16 }
    },
    root: {
      id: "1:2",
      name: "行情首页",
      type: "FRAME",
      box: { x: 0, y: 0, width: 16, height: 16 },
      relativeBox: { x: 0, y: 0, width: 16, height: 16 },
      style: {},
      children: []
    },
    resources: { components: {}, componentSets: {}, styles: {} },
    diagnostics: ["design truth built"]
  };
}

function liveEvidence(input: {
  image: Buffer;
  elements?: DomElement[];
  audits?: StaticAudit[];
  diagnostics?: string[];
  finalUrl?: string;
}): LiveActualEvidence {
  const finalUrl = input.finalUrl ?? "https://example.test/market";
  const elements = (input.elements ?? []).map((element) => ({
    ...element,
    fingerprint: {
      key: element.dataFigmaId
        ? `figma:${element.dataFigmaId}`
        : `dom:${element.tag}:${element.selector}`,
      identitySource: element.dataFigmaId ? "figma-id" as const : "dom-structure" as const,
      tag: element.tag,
      selector: element.selector,
      region: "top-left",
      geometryBucket: "0:0:0:0",
      styleSignature: ""
    }
  }));
  return {
    kind: "live",
    sourceUrl: finalUrl,
    finalUrl,
    viewport: { width: 16, height: 16 },
    samples: [
      {
        index: 0,
        capturedAtMs: 0,
        image: input.image,
        elements,
        audits: input.audits ?? []
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
    diagnostics: input.diagnostics ?? []
  };
}

const figmaDesignInput = {
  kind: "figma" as const,
  frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
  accessToken: "figma-token"
};

test("reviews a Figma PagePair through DesignTruth", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(image),
      captureLiveActualEvidence: async () => liveEvidence({
        image,
        elements: [],
        audits: [],
        diagnostics: ["page captured"],
        finalUrl: "https://example.test/market"
      })
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market"
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.matching.designCoverage?.items.length, 0);
  assert.equal(report.summary.similarity, 1);
  assert.equal(report.source.design, "Figma · 金融 H5 · 1:2");
  assert.equal(report.source.actual, "https://example.test/market");
  assert.deepEqual(report.diagnostics, ["design truth built", "page captured"]);
});

test("ReviewService publishes the three fed-page module verification actions without Agent or complete capture", async () => {
  // Minimized topology from the reported Frame: policy background/title are siblings.
  // This is a regression fixture, not a designer-approved gold-set label or live replay.
  const image = await solidPng(375, 2370);
  const truth = figmaTruth(image);
  truth.root.box = { x: 0, y: 0, width: 375, height: 2370 };
  truth.render.viewport = { width: 375, height: 2370 };
  const text = (id: string, name: string, y: number) => ({ id, name, text: name, type: "TEXT", box: { x: 20, y, width: 96, height: 20 }, style: {}, children: [] });
  truth.root.children = [
    { id: "0:78", name: "编组", type: "GROUP", box: { x: 10, y: 248, width: 355, height: 145 }, style: {}, children: [text("quick", "快评", 260)] },
    { id: "0:110", name: "矩形 4备份 5", type: "RECTANGLE", box: { x: 10, y: 405, width: 355, height: 122 }, style: {}, children: [] },
    text("0:112", "最新货币政策", 416),
    { id: "0:286", name: "编组", type: "GROUP", box: { x: 10, y: 1090, width: 355, height: 261 }, style: {}, children: [text("poll", "投票", 1102)] }
  ];
  const actual = liveEvidence({ image });
  actual.viewport = truth.render.viewport;
  actual.samples = [0, 1, 2].map(index => ({ ...actual.samples[0], index,
    coverage: { fullDocument: false, elementLimitReached: false, opaqueContent: false, excludedContent: false } }));
  const service = new ReviewService({ dependencies: { buildDesignTruthFromFigma: async () => truth, captureLiveActualEvidence: async () => actual } });
  const report = await service.reviewPagePair({ locale: "zh-CN", design: figmaDesignInput, h5Url: "https://example.test/fed" });
  const modules = report.issues.filter(issue => issue.coverageModule);
  assert.deepEqual(modules.map(issue => issue.coverageModule!.name), ["快评", "最新货币政策", "投票"]);
  assert.ok(modules.every(issue => issue.severity === "pending"));
  assert.match(report.markdown, /模块核验建议/);
  for (const name of ["快评", "最新货币政策", "投票"]) assert.ok(report.reportHtml.includes(`${name} 模块疑似缺失`));
});

test("rejects a PagePair that has no Figma DesignTruth input", async () => {
  const service = new ReviewService();

  await assert.rejects(
    service.reviewPagePair({
      locale: "zh-CN",
      h5Url: "https://example.test/market"
    }),
    /请提供 Figma Frame 设计来源。/
  );
});

test("propagates a page capture failure", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(image),
      captureLiveActualEvidence: async () => {
        throw new Error("H5 capture timed out");
      }
    }
  });

  await assert.rejects(
    service.reviewPagePair({
      locale: "zh-CN",
      design: figmaDesignInput,
      h5Url: "https://example.test/market"
    }),
    /H5 capture timed out/
  );
});

test("reviews the built-in demo through the same ReviewService", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      createDemoSources: async () => ({
        design: {
          source: { kind: "demo", name: "内置基准页面" },
          render: { image, viewport: { width: 16, height: 16 } },
          root: {
            id: "demo:root",
            name: "内置基准页面",
            type: "FRAME",
            box: { x: 0, y: 0, width: 16, height: 16 },
            relativeBox: { x: 0, y: 0, width: 16, height: 16 },
            style: {},
            children: []
          },
          diagnostics: ["demo design loaded"]
        },
        actual: liveEvidence({
          image,
          elements: [],
          audits: [],
          diagnostics: ["demo page captured"],
          finalUrl: "http://127.0.0.1:4318/demo/actual?locale=zh-CN"
        })
      })
    }
  });

  const report = await service.reviewDemo({
    locale: "zh-CN",
    baseUrl: "http://127.0.0.1:4318"
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.matching.designCoverage?.items.length, 0);
  assert.equal(report.source.design, "内置基准页面");
  assert.equal(report.source.actual, "http://127.0.0.1:4318/demo/actual?locale=zh-CN");
  assert.deepEqual(report.diagnostics, ["demo design loaded", "demo page captured"]);
});

test("does not publish AI advice when there is no final ReviewIssue or verified matched alignment", async () => {
  const image = await solidPng();
  let adviceCalls = 0;
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(image),
      captureLiveActualEvidence: async () => liveEvidence({
        image,
        elements: [],
        audits: [],
        diagnostics: [],
        finalUrl: "https://example.test/market"
      }),
      generateAiAdvice: async (input) => {
        adviceCalls += 1;
        assert.equal(input.apiKey, "openai-key");
        return {
          model: "test-model",
          summary: "先修复主视觉差异",
          summaryEvidenceRefs: [],
          priorities: []
        };
      }
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    ai: { requested: true, apiKey: "openai-key" }
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.matching.designCoverage?.items.length, 0);
  assert.equal(adviceCalls, 0);
  assert.equal(report.aiAdvice, undefined);
  assert.match(report.diagnostics.join("\n"), /没有最终发布问题或已验证的匹配模块/);
});

test("passes only final ReviewIssues and verified matched alignment into AI advice generation", async () => {
  const designImage = await solidPng();
  const actualImage = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  let publishedIssueId = "";
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(designImage),
      captureLiveActualEvidence: async () => liveEvidence({ image: actualImage }),
      generateAiAdvice: async (input) => {
        assert.ok(input.issues.length > 0);
        assert.equal(input.issues.every((issue) => Boolean(issue.priority)), true);
        assert.deepEqual(input.pageAlignment, {
          summary: "",
          regions: [],
          rejectedRegionCount: 0
        });
        assert.equal("referenceImage" in input, false);
        assert.equal("actualImage" in input, false);
        assert.equal("comparisonContext" in input, false);
        publishedIssueId = input.issues[0].id;
        return {
          model: "test-model",
          summary: input.issues[0].title,
          summaryEvidenceRefs: [`review-issue:${input.issues[0].id}`],
          priorities: [{
            title: input.issues[0].title,
            reason: input.issues[0].summary,
            action: input.issues[0].primaryAction,
            evidenceRefs: [`review-issue:${input.issues[0].id}`]
          }]
        };
      }
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    ai: { requested: true, apiKey: "openai-key" }
  });

  assert.equal(report.aiAdvice?.summary, report.issues[0].title);
  assert.equal(publishedIssueId, report.issues[0].id);
});

test("publishes completed advice and its timeout diagnostic together", async () => {
  const { PartialAiAdviceError } = await import("./ai");
  const image = await solidPng();
  const actualImage = await sharp({ create: { width: 16, height: 16, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const service = new ReviewService({ dependencies: {
    buildDesignTruthFromFigma: async () => figmaTruth(image),
    captureLiveActualEvidence: async () => liveEvidence({ image: actualImage }),
    generateAiAdvice: async ({ issues }) => {
      const issue = issues[0];
      assert.ok(issue);
      const ref = `review-issue:${issue.id}` as const;
      throw new PartialAiAdviceError(new DOMException("timeout", "TimeoutError"), {
        summary: "部分排序", summaryEvidenceRefs: [ref],
        priorities: [{ title: issue.title, reason: issue.summary, action: issue.primaryAction, evidenceRefs: [ref] }]
      });
    }
  } });
  const report = await service.reviewPagePair({ locale: "zh-CN", design: figmaDesignInput,
    h5Url: "https://example.test/market", ai: { requested: true, apiKey: "test" } });
  assert.equal(report.aiAdvice?.summary, "部分排序");
  assert.equal(report.aiAdviceRejection?.code, "ai_timeout");
});

test("publishes a structured AI timeout rejection without failing the deterministic review", async () => {
  const designImage = await solidPng();
  const actualImage = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(designImage),
      captureLiveActualEvidence: async () => liveEvidence({ image: actualImage }),
      generateAiAdvice: async () => {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      }
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    ai: { requested: true, apiKey: "openai-key" }
  });

  assert.equal(report.status, "needs_review");
  assert.equal(report.aiAdvice, undefined);
  assert.deepEqual(report.aiAdviceRejection, {
    code: "ai_timeout",
    message: "AI 建议生成失败：The operation was aborted due to timeout",
    danglingRefs: [],
    locations: []
  });
});

test("publishes a structured AI format rejection for an invalid advice contract", async () => {
  const designImage = await solidPng();
  const actualImage = await sharp({
    create: {
      width: 16,
      height: 16,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  }).png().toBuffer();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(designImage),
      captureLiveActualEvidence: async () => liveEvidence({ image: actualImage }),
      generateAiAdvice: async () => {
        throw new Error("AI advice must contain between one and five grounded priorities.");
      }
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    ai: { requested: true, apiKey: "openai-key" }
  });

  assert.equal(report.aiAdvice, undefined);
  assert.deepEqual(report.aiAdviceRejection, {
    code: "ai_format_error",
    message: "AI 建议生成失败：AI advice must contain between one and five grounded priorities.",
    danglingRefs: [],
    locations: []
  });
});

test("routes an ambiguous dynamic candidate through the bounded AgentHypothesis service", async () => {
  const image = await solidPng();
  const truth = figmaTruth(image);
  truth.root.children = [{
    id: "2:price",
    parentId: truth.root.id,
    name: "最新价",
    type: "TEXT",
    text: "100点",
    box: { x: 2, y: 2, width: 8, height: 4 },
    relativeBox: { x: 2, y: 2, width: 8, height: 4 },
    style: {},
    children: []
  }];
  const fingerprint = {
    key: "figma:2:price",
    identitySource: "figma-id" as const,
    tag: "span",
    selector: "#price",
    region: "top-left",
    geometryBucket: "2:2:8:4",
    styleSignature: ""
  };
  const actual: LiveActualEvidence = {
    kind: "live",
    sourceUrl: "https://example.test/market",
    finalUrl: "https://example.test/market",
    viewport: { width: 16, height: 16 },
    samples: ["101点", "102点", "103点"].map((text, index) => ({
      index,
      capturedAtMs: index * 750,
      image,
      elements: [{
        selector: "#price",
        tag: "span",
        dataFigmaId: undefined,
        text,
        box: { x: 2, y: 2, width: 8, height: 4 },
        style: {},
        fingerprint
      }],
      audits: []
    })),
    canonicalSampleIndex: 2,
    elementChanges: [{
      fingerprintKey: fingerprint.key,
      selector: "#price",
      observedSampleIndexes: [0, 1, 2],
      presentInAllSamples: true,
      textChanged: true,
      geometryChanged: false,
      styleChanged: false,
      observedTexts: ["101点", "102点", "103点"]
    }],
    pixelVariance: {
      image,
      changedPixelCount: 0,
      changedPixelRatio: 0,
      threshold: 0.1
    },
    diagnostics: []
  };
  let hypothesisCalls = 0;
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth,
      captureLiveActualEvidence: async () => actual,
      generateDynamicHypothesis: async ({ apiKey, request }) => {
        hypothesisCalls += 1;
        assert.equal(apiKey, "openai-key");
        return {
          candidateType: "market-value",
          binding: {
            figmaNodeId: request.candidate.design.figmaNodeId,
            fingerprintKey: request.candidate.actual.fingerprintKey
          },
          strategy: "normalize-market-value-text",
          normalizedProperties: ["text"],
          reasons: ["多帧内容变化。"]
        };
      },
      generateAiAdvice: async () => ({ summary: "", summaryEvidenceRefs: [], priorities: [] })
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    ai: { requested: true, apiKey: "openai-key", model: "test-model" }
  });

  assert.equal(hypothesisCalls, 1);
  assert.equal(report.dynamicNormalization.regions[0].source, "agent-verified");
});

test("routes unresolved page elements through AI visual-semantic binding when AI review is enabled", async () => {
  const image = await solidPng();
  const truth = figmaTruth(image);
  truth.root.children = [{
    id: "2:probability-card",
    parentId: truth.root.id,
    name: "利率概率卡片",
    type: "RECTANGLE",
    box: { x: 0, y: 0, width: 8, height: 4 },
    relativeBox: { x: 0, y: 0, width: 8, height: 4 },
    style: { backgroundColor: "#ffffff" },
    children: []
  }];
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
  let bindingCalls = 0;
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth,
      captureLiveActualEvidence: async () => actual,
      generateElementBindings: async ({ apiKey, request }) => {
        bindingCalls += 1;
        assert.equal(apiKey, "openai-key");
        return {
          pageSummary: "利率概率模块对应，但开发页整体上移。",
          alignmentPlan: { regions: [] },
          bindings: [{
            figmaNodeId: request.designCandidates[0].figmaNodeId,
            fingerprintKey: request.actualCandidates[0].fingerprintKey,
            confidence: 0.91,
            reason: "业务语义和组件尺寸一致。"
          }]
        };
      },
      generateAiAdvice: async () => ({
        summary: "先修复页面结构。",
        summaryEvidenceRefs: [],
        priorities: []
      })
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/fed",
    ai: { requested: true, apiKey: "openai-key" }
  });

  assert.equal(bindingCalls, 1);
  assert.equal(report.matching.matches[0].method, "visual-inference");
  assert.match(report.diagnostics.join("\n"), /AI 语义绑定接受 1/);
});

test("rejects an empty H5 URL before attempting page capture", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(image),
      captureLiveActualEvidence: async () => {
        throw new Error("capture should not run");
      }
    }
  });

  await assert.rejects(
    service.reviewPagePair({
      locale: "zh-CN",
      design: figmaDesignInput,
      h5Url: "  "
    }),
    /请输入 H5 页面地址。/
  );
});

test("exposes EvidenceConfidence and intersection coverage in the final report", async () => {
  const image = await solidPng();
  const truth = figmaTruth(image);
  truth.root.children = [
    {
      id: "2:matched",
      parentId: truth.root.id,
      name: "行情标题",
      type: "TEXT",
      text: "行情",
      box: { x: 2, y: 2, width: 8, height: 4 },
      relativeBox: { x: 2, y: 2, width: 8, height: 4 },
      style: {},
      children: []
    },
    {
      id: "2:unmatched",
      parentId: truth.root.id,
      name: "未覆盖设计节点",
      type: "TEXT",
      text: "未覆盖",
      box: { x: 2, y: 8, width: 8, height: 4 },
      relativeBox: { x: 2, y: 8, width: 8, height: 4 },
      style: {},
      children: []
    }
  ];
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth,
      captureLiveActualEvidence: async () => liveEvidence({
        image,
        elements: [
          {
            selector: "h1",
            tag: "h1",
            dataFigmaId: "2:matched",
            text: "行情",
            box: { x: 2, y: 2, width: 8, height: 4 },
            style: {}
          },
          {
            selector: "button",
            tag: "button",
            text: "额外按钮",
            box: { x: 12, y: 12, width: 2, height: 2 },
            style: {}
          }
        ],
        audits: [],
        diagnostics: [],
        finalUrl: "https://example.test/market"
      })
    }
  });

  const report = await service.reviewPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market"
  });

  assert.equal(report.summary.matchedElements, 1);
  assert.equal(report.summary.unmatchedDesignElements, 1);
  assert.equal(report.summary.unmatchedActualElements, 1);
  assert.equal(report.matching.matches[0].evidenceConfidence.basis[0], "exact-id");
  assert.equal(report.diagnostics.some((item) => item.startsWith("设计覆盖：")), true);
  assert.ok(report.matching.designCoverage?.items.some(item => item.status === "unverified"));
  assert.ok(report.issues.some(issue => issue.rule === "design_coverage_unverified"));
});

test("reviews uploaded screenshots as the formal Screenshot ActualEvidence", async () => {
  const designImage = await solidPng(16, 16);
  const truth = figmaTruth(designImage);
  truth.root.children = [{
    id: "2:market-card",
    parentId: truth.root.id,
    name: "行情卡片",
    type: "FRAME",
    box: { x: 4, y: 4, width: 8, height: 8 },
    relativeBox: { x: 4, y: 4, width: 8, height: 8 },
    style: { backgroundColor: "rgb(255, 255, 255)" },
    children: []
  }];
  const actualImage = await sharp(designImage)
    .composite([{ input: await sharp({ create: { width: 8, height: 8, channels: 4, background: "#ff0000" } }).png().toBuffer(), left: 4, top: 4 }])
    .png()
    .toBuffer();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth
    }
  });

  const report = await service.reviewScreenshotPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    screenshots: [{
      name: "device.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 16, height: 16 }
      }
    }]
  });

  assert.equal(report.evidenceMode, "screenshot");
  assert.equal(report.source.actual, "Screenshot · device.png");
  assert.ok(report.summary.similarity < 1);
  assert.equal(report.issues.some((issue) => issue.rule === "visual_similarity"), true);
  const region = report.issues.find((issue) => issue.rule === "visual_region");
  assert.equal(region?.severity, "pending");
  assert.equal(region?.figmaNodeId, "2:market-card");
  assert.ok((region?.evidenceConfidence.score ?? 1) <= 0.82);
  assert.deepEqual(region?.evidenceConfidence.basis, ["visual-inference", "pixel-measurement"]);
  assert.equal(report.issues.every((issue) => Boolean(issue.priority)), true);
  assert.equal(report.issues.every((issue) => issue.evidence.length > 0), true);
  assert.match(report.markdown, new RegExp(report.issues[0].title));
  assert.match(report.reportHtml, new RegExp(report.issues[0].title));
  assert.match(report.markdown, new RegExp(report.issues[0].priority));
  assert.match(report.reportHtml, new RegExp(`>${report.issues[0].priority}<`));
  assert.equal(report.dynamicNormalization.regions.length, 0);
});

test("runs a Hybrid review at the device viewport while keeping the device screenshot formal", async () => {
  const designImage = await sharp({ create: { width: 50, height: 100, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const deviceImage = await sharp({ create: { width: 100, height: 200, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const browserImage = await sharp({ create: { width: 100, height: 200, channels: 4, background: "#0000ff" } }).png().toBuffer();
  const live = liveEvidence({ image: browserImage });
  live.viewport = { width: 100, height: 200 };
  live.samples[0].elements = [
    { selector: "#title", tag: "h1", text: "行情", box: { x: 10, y: 10, width: 30, height: 10 }, style: {}, fingerprint: { key: "dom:title", identitySource: "dom-structure", tag: "h1", selector: "#title", region: "top-left", geometryBucket: "", styleSignature: "" } },
    { selector: "#nav", tag: "nav", text: "自选", box: { x: 40, y: 50, width: 30, height: 10 }, style: {}, fingerprint: { key: "dom:nav", identitySource: "dom-structure", tag: "nav", selector: "#nav", region: "top-left", geometryBucket: "", styleSignature: "" } },
    { selector: "#header", tag: "div", text: "最新价", box: { x: 70, y: 90, width: 20, height: 10 }, style: {}, fingerprint: { key: "dom:header", identitySource: "dom-structure", tag: "div", selector: "#header", region: "top-right", geometryBucket: "", styleSignature: "" } }
  ];
  let capturedViewport: { width: number; height: number } | undefined;
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(designImage),
      captureLiveActualEvidence: async (_url, viewport) => {
        capturedViewport = viewport;
        return live;
      }
    }
  });

  const report = await service.reviewHybridPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    h5Url: "https://example.test/market",
    screenshots: [{
      name: "device.png",
      image: deviceImage,
      device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 100, height: 200 } },
      anchors: [
        { text: "行情", box: { x: 10, y: 10, width: 30, height: 10 }, confidence: 0.98 },
        { text: "自选", box: { x: 40, y: 50, width: 30, height: 10 }, confidence: 0.98 },
        { text: "最新价", box: { x: 70, y: 90, width: 20, height: 10 }, confidence: 0.98 }
      ]
    }]
  });

  assert.deepEqual(capturedViewport, { width: 100, height: 200 });
  assert.equal(report.evidenceMode, "hybrid");
  assert.equal(report.alignment?.evidenceConfidence.level, "high");
  assert.match(report.source.actual, /device\.png.*https:\/\/example\.test\/market/);
  const actualPixel = await sharp(Buffer.from(report.images.actual.split(",")[1], "base64")).raw().toBuffer();
  assert.deepEqual([...actualPixel.subarray(0, 3)], [255, 0, 0]);
});

test("uses screenshot OCR anchors for capped visual parameter checks", async () => {
  const image = await solidPng(16, 16);
  const truth = figmaTruth(image);
  truth.root.children = [{
    id: "2:title",
    parentId: truth.root.id,
    name: "行情标题",
    type: "TEXT",
    text: "行情",
    box: { x: 2, y: 2, width: 6, height: 3 },
    relativeBox: { x: 2, y: 2, width: 6, height: 3 },
    style: {},
    children: []
  }];
  const service = new ReviewService({
    dependencies: { buildDesignTruthFromFigma: async () => truth }
  });

  const report = await service.reviewScreenshotPagePair({
    locale: "zh-CN",
    design: figmaDesignInput,
    screenshots: [{
      name: "ocr.png",
      image,
      device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 16, height: 16 } },
      anchors: [{ text: "行情", role: "heading", box: { x: 8, y: 2, width: 6, height: 3 }, confidence: 0.98 }]
    }]
  });

  assert.equal(report.matching.matches[0].method, "visual-inference");
  assert.ok(report.matching.matches[0].evidenceConfidence.score <= 0.82);
  const position = report.issues.find((issue) => issue.rule === "position");
  assert.equal(position?.severity, "pending");
  assert.ok((position?.evidenceConfidence.score ?? 1) <= 0.82);
});


test("Jev advice selection uses server credentials and publishes phase timing without changing verdict", async () => {
  const image = await solidPng();
  const actualImage = await sharp({ create: { width: 16, height: 16, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  let calls = 0;
  let expectedKey = "jev-secret";
  let expectedModel = "jev-1.13.0";
  let clock = 0;
  const service = new ReviewService({
    environment: { DIFFLAB_AI_ADVICE_PROVIDER: "jev", TYPESAFE_API_KEY: "jev-secret", TYPESAFE_MODEL: "jev-1.13.0" },
    now: () => ++clock * 10,
    dependencies: {
      buildDesignTruthFromFigma: async () => figmaTruth(image),
      captureLiveActualEvidence: async () => liveEvidence({ image: actualImage }),
      generateAiAdvice: async () => { throw new Error("wrong provider"); },
      generateJevAdvice: async input => {
        calls++;
        assert.equal(input.apiKey, expectedKey);
        assert.equal(input.apiUrl, undefined);
        assert.equal(input.model, expectedModel);
        const issue = input.issues[0];
        return { model: "jev-1.13.0", summary: issue.title,
          summaryEvidenceRefs: [`review-issue:${issue.id}`], priorities: [{ title: issue.title,
            reason: issue.summary, action: issue.primaryAction, evidenceRefs: [`review-issue:${issue.id}`] }] };
      }
    }
  });
  const input = { locale: "zh-CN" as const, design: figmaDesignInput, h5Url: "https://example.test/market" };
  const baseline = await service.reviewPagePair({ ...input, ai: { requested: false } });
  const report = await service.reviewPagePair({ ...input, ai: { requested: true, model: "unrelated-openai-model" } });
  assert.equal(calls, 1);
  assert.equal(report.aiAdvice?.model, "jev-1.13.0");
  assert.equal(report.status, baseline.status);
  assert.deepEqual(report.issues, baseline.issues);
  assert.deepEqual(report.phaseTimings, { preparationMs: 10, comparisonMs: 10, adviceMs: 10 });
  assert.ok(!JSON.stringify(report).includes("jev-secret"));
  expectedKey = "local-jev-key";
  expectedModel = "jev-custom";
  const overridden = await service.reviewPagePair({ ...input, ai: { requested: true,
    adviceProvider: "jev", jevApiKey: expectedKey, jevModel: expectedModel } });
  assert.equal(calls, 2);
  assert.equal(overridden.status, baseline.status);
  assert.ok(!JSON.stringify(overridden).includes(expectedKey));
});
