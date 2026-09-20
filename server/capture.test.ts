import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import sharp from "sharp";
import { chromium } from "playwright";
import { captureLiveActualEvidence, captureLiveActualEvidenceAtScrollOffsets } from "./capture";
import { parseAcceptanceYaml } from "./default-rules";
import { compareDesignToPage } from "./compare";
import type { DesignTruth } from "../src/types";
test("capture reports bounded text clipping separately from unsearched scroll content", async () => {
  const server = createServer((_req, res) => res.end('<style>body{margin:0}.clip{width:40px;height:20px;white-space:nowrap;overflow:hidden}.scroll{height:40px;overflow:auto}</style><div class="clip">long long long long text</div><section class="scroll"><div style="height:100px">unsearched content</div></section>'));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const result = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`, { width: 375, height: 600 },
      parseAcceptanceYaml("capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0"), "zh-CN");
    const scope = result.samples[0].coverage;
    assert.equal(scope?.documentBoundsComplete, true);
    assert.deepEqual(scope?.limitations?.map(item => item.reason).sort(), ["scroll-container", "text-clipping"]);
    assert.ok(scope?.limitations?.every(item => item.selector && item.box.height > 0));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("deep date containers retain unique resolvable identities and stable temporal parent links", async () => {
  const html = `<!doctype html><style>body { margin:0 } div { min-height:24px } [role=tab] { display:inline-block;width:90px }</style>
    <div id="root"><div class="App"><div class="fed-page"><div class="fed-block">
      <div><span>利率观察</span></div><div><div><div class="predict-tabs">
        <div><div role="tablist"><div><div role="tab">09月17日</div></div>
          <div><div role="tab">10月29日</div></div></div></div>
      </div></div></div></div></div></div></div>`;
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`,
      { width: 375, height: 600 },
      parseAcceptanceYaml("capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0\n  timeout_ms: 15000"), "zh-CN");
    const elements = evidence.samples[0].elements;
    assert.deepEqual(evidence.samples[0].coverage, {
      fullDocument: true, elementLimitReached: false, opaqueContent: false, excludedContent: false
    }, "absence decisions must use explicit complete-capture evidence");
    assert.equal(new Set(elements.map((element) => element.selector)).size, elements.length,
      "a deep container and its date slots must never share identity");
    const page = await browser.newPage({ viewport: { width: 375, height: 600 } });
    await page.setContent(html);
    const invalid = await page.evaluate((observations) => observations.filter((observation) => {
      const nodes = document.querySelectorAll(observation.selector);
      if (nodes.length !== 1) return true;
      const rect = nodes[0].getBoundingClientRect();
      return rect.x !== observation.box.x || rect.y !== observation.box.y ||
        rect.width !== observation.box.width || rect.height !== observation.box.height ||
        (observation.parentSelector && nodes[0].parentElement !== document.querySelector(observation.parentSelector));
    }).map((observation) => observation.selector), elements);
    assert.deepEqual(invalid, [], "selectors resolve back to the captured nodes and parents");
    assert.ok(elements.every((element) => !element.parentSelector ||
      elements.some((parent) => parent.selector === element.parentSelector)));
    assert.ok(evidence.elementChanges.every((change) => change.presentInAllSamples &&
      !change.textChanged && !change.geometryChanged && !change.styleChanged));
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function samplePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

test("real deep capture feeds changed date text into style review within its identified container", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><style>body {margin:0} [role=tablist] {display:flex}
      [role=tab] {width:90px;height:24px;font-size:18px}</style>
      <div><div><div><div><div data-figma-id="dates"><div><div role="tablist">
        <div><div role="tab">09月17日</div></div><div><div role="tab">10月29日</div></div>
      </div></div></div></div></div></div></div>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const viewport = { width: 375, height: 200 };
    const config = parseAcceptanceYaml("capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0");
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`, viewport, config, "zh-CN");
    const box = { x: 0, y: 0, width: 375, height: 24 };
    const truth: DesignTruth = {
      source: { kind: "figma", fileKey: "fixture", frameId: "frame", frameName: "日期选择器" },
      render: { image: evidence.samples[0].image, viewport }, diagnostics: [],
      root: { id: "frame", name: "日期选择器", type: "FRAME", box: { ...box, height: 200 }, style: {}, children: [{
        id: "dates", parentId: "frame", name: "编组", type: "FRAME", box, style: { backgroundColor: "#ffffff" },
        children: ["3月19日", "4月30日"].map((text, index) => ({
          id: `date:${index}`, parentId: "dates", name: text, text, type: "TEXT",
          box: { x: index * 90, y: 0, width: 90, height: 24 }, style: { fontSize: 12 }, children: []
        }))
      }] }
    };
    const result = await compareDesignToPage(truth, evidence, config, "zh-CN");
    assert.equal(result.matching.matches.filter((match) => match.figmaNodeId.startsWith("date:")).length, 2);
    for (const id of ["date:0", "date:1"]) {
      assert.ok(result.issues.some((issue) => issue.figmaNodeId === id && issue.rule === "typography"));
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("visible children of boxless wrappers retain a closed captured ancestry", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><style>.boxless { display:contents } span { display:block;height:24px }</style>
      <section id="module"><div class="boxless"><span>利率观察</span><span>未来利率预测</span></div></section>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`,
      { width: 375, height: 600 }, parseAcceptanceYaml("capture:\n  samples: 1\n  settle_ms: 0"), "zh-CN");
    const elements = evidence.samples[0].elements;
    assert.ok(elements.every((element) => !element.parentSelector ||
      elements.some((parent) => parent.selector === element.parentSelector)), "no dangling parent links");
    assert.equal(elements.find((element) => element.text === "利率观察")?.parentSelector, "#module");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("repeated DOM and Figma IDs do not merge distinct live observations", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><style>span { display:block;width:100px;height:24px }</style>
      <div><span id="duplicate" data-figma-id="0:1">first</span>
      <span id="duplicate" data-figma-id="0:1">second</span>
      <span id="unique:id" data-figma-id="0:2">third</span></div>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`,
      { width: 375, height: 600 },
      parseAcceptanceYaml("capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0"), "zh-CN");
    const elements = evidence.samples[0].elements;
    assert.equal(new Set(elements.map((element) => element.selector)).size, elements.length);
    assert.equal(new Set(elements.map((element) => element.fingerprint.key)).size, elements.length);
    assert.ok(evidence.elementChanges.every((change) => change.presentInAllSamples && !change.textChanged));
    assert.equal(elements.find((element) => element.text === "third")?.fingerprint.key, "figma:0:2");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function twoPixelPng(first: number, second: number): Promise<Buffer> {
  return sharp(
    Buffer.from([
      first, first, first, 255,
      second, second, second, 255
    ]),
    { raw: { width: 2, height: 1, channels: 4 } }
  ).png().toBuffer();
}

test("captures three live samples in one page session by default", async () => {
  const image = await samplePng();
  let openedSessions = 0;
  let sampleIndex = 0;

  const evidence = await captureLiveActualEvidence(
    "https://example.test/market",
    { width: 4, height: 4 },
    parseAcceptanceYaml(),
    "zh-CN",
    {
      openSession: async () => {
        openedSessions += 1;
        return {
          finalUrl: "https://example.test/market",
          diagnostics: ["页面会话已准备。"],
          captureSample: async () => ({
            image,
            elements: [
              {
                selector: "#price",
                tag: "span",
                text: String(100 + sampleIndex++),
                box: { x: 0, y: 0, width: 4, height: 2 },
                style: { color: "rgb(255, 0, 0)" }
              }
            ],
            audits: []
          }),
          close: async () => undefined
        };
      },
      wait: async () => undefined,
      now: () => 1_000
    }
  );

  assert.equal(openedSessions, 1);
  assert.equal(evidence.kind, "live");
  assert.equal(evidence.samples.length, 3);
  assert.equal(evidence.canonicalSampleIndex, 2);
  assert.equal(evidence.samples[2].elements[0].text, "102");
  assert.deepEqual(
    evidence.samples.map((sample) => sample.elements[0].fingerprint.key),
    ["dom:span:#price", "dom:span:#price", "dom:span:#price"]
  );
  assert.deepEqual(evidence.samples[0].elements[0].fingerprint, {
    key: "dom:span:#price",
    identitySource: "dom-structure",
    tag: "span",
    selector: "#price",
    region: "top-left",
    geometryBucket: "0:0:100:50",
    styleSignature: "color=rgb(255, 0, 0)"
  });
  assert.deepEqual(evidence.elementChanges, [
    {
      fingerprintKey: "dom:span:#price",
      selector: "#price",
      observedSampleIndexes: [0, 1, 2],
      presentInAllSamples: true,
      textChanged: true,
      geometryChanged: false,
      styleChanged: false,
      observedTexts: ["100", "101", "102"]
    }
  ]);
  assert.deepEqual(evidence.diagnostics, ["页面会话已准备。", "已在同一页面会话中采集 3 个样本。"]);
});

test("normalizes live sampling settings to safe integer ranges", () => {
  const config = parseAcceptanceYaml(`capture:
  samples: 2.7
  sample_interval_ms: -50
  timeout_ms: 999999
`);

  assert.equal(config.capture.samples, 3);
  assert.equal(config.capture.sampleIntervalMs, 0);
  assert.equal(config.capture.timeoutMs, 60_000);
});

test("keeps a static single-frame capture compatible with LiveActualEvidence", async () => {
  const image = await samplePng();
  const evidence = await captureLiveActualEvidence(
    "https://example.test/static",
    { width: 4, height: 4 },
    parseAcceptanceYaml("capture:\n  samples: 1"),
    "zh-CN",
    {
      openSession: async () => ({
        finalUrl: "https://example.test/static",
        diagnostics: [],
        captureSample: async () => ({
          image,
          elements: [
            {
              selector: "#title",
              tag: "h1",
              text: "行情",
              box: { x: 0, y: 0, width: 4, height: 2 },
              style: { fontSize: 16 }
            }
          ],
          audits: []
        }),
        close: async () => undefined
      })
    }
  );

  assert.equal(evidence.samples.length, 1);
  assert.equal(evidence.canonicalSampleIndex, 0);
  assert.equal(evidence.elementChanges[0].textChanged, false);
  assert.equal(evidence.pixelVariance.changedPixelCount, 0);
});

test("builds a pixel variance map across live samples", async () => {
  const images = [
    await twoPixelPng(255, 255),
    await twoPixelPng(0, 255),
    await twoPixelPng(128, 255)
  ];
  let sampleIndex = 0;

  const evidence = await captureLiveActualEvidence(
    "https://example.test/market",
    { width: 2, height: 1 },
    parseAcceptanceYaml("capture:\n  sample_interval_ms: 0"),
    "zh-CN",
    {
      openSession: async () => ({
        finalUrl: "https://example.test/market",
        diagnostics: [],
        captureSample: async () => ({
          image: images[sampleIndex++],
          elements: [],
          audits: []
        }),
        close: async () => undefined
      }),
      wait: async () => undefined
    }
  );

  assert.equal(evidence.pixelVariance.changedPixelCount, 1);
  assert.equal(evidence.pixelVariance.changedPixelRatio, 0.5);
  assert.equal(evidence.pixelVariance.threshold, 0.1);
  const metadata = await sharp(evidence.pixelVariance.image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 2);
  assert.equal(metadata.height, 1);
  assert.equal(metadata.hasAlpha, true);
});

test("summarizes geometry and decorative style changes across samples", async () => {
  const image = await samplePng();
  let sampleIndex = 0;
  const evidence = await captureLiveActualEvidence(
    "https://example.test/card",
    { width: 4, height: 4 },
    parseAcceptanceYaml("capture:\n  samples: 2\n  sample_interval_ms: 0"),
    "zh-CN",
    {
      openSession: async () => ({
        finalUrl: "https://example.test/card",
        diagnostics: [],
        captureSample: async () => {
          const index = sampleIndex++;
          return {
            image,
            elements: [
              {
                selector: "#card",
                tag: "div",
                box: { x: index, y: 0, width: 4, height: 2 },
                style: {
                  letterSpacing: index,
                  boxShadow: index ? "rgb(0 0 0 / 20%) 0px 2px 4px" : "none"
                }
              }
            ],
            audits: []
          };
        },
        close: async () => undefined
      }),
      wait: async () => undefined
    }
  );

  assert.equal(evidence.elementChanges[0].geometryChanged, true);
  assert.equal(evidence.elementChanges[0].styleChanged, true);
});

test("closes a live session when the total capture timeout expires", async () => {
  let closed = false;
  const startedAt = Date.now();

  await assert.rejects(
    captureLiveActualEvidence(
      "https://example.test/never-stable",
      { width: 4, height: 4 },
      parseAcceptanceYaml("capture:\n  timeout_ms: 1000"),
      "zh-CN",
      {
        openSession: async () => ({
          finalUrl: "https://example.test/never-stable",
          diagnostics: [],
          captureSample: () => new Promise(() => undefined),
          close: async () => {
            closed = true;
          }
        })
      }
    ),
    /Live 页面采集总超时/
  );

  assert.equal(closed, true);
  assert.ok(Date.now() - startedAt < 1_500);
});

test("includes session initialization in the total capture timeout", async () => {
  let lateSessionClosed = false;
  const image = await samplePng();
  const startedAt = Date.now();

  await assert.rejects(
    captureLiveActualEvidence(
      "https://example.test/slow-session",
      { width: 4, height: 4 },
      parseAcceptanceYaml("capture:\n  timeout_ms: 1000"),
      "zh-CN",
      {
        openSession: () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  finalUrl: "https://example.test/slow-session",
                  diagnostics: [],
                  captureSample: async () => ({ image, elements: [], audits: [] }),
                  close: async () => {
                    lateSessionClosed = true;
                  }
                }),
              2_000
            )
          )
      }
    ),
    /Live 页面采集总超时/
  );

  assert.ok(Date.now() - startedAt < 1_500);
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  assert.equal(lateSessionClosed, true);
});

test("captures changing market text from one real browser document", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <style>body { margin: 0 } #price { display: block; width: 80px; height: 24px }</style>
      <span id="price">tick-0</span>
      <script>
        let tick = 0;
        setInterval(() => {
          document.querySelector("#price").textContent = "tick-" + (++tick);
        }, 10);
      </script>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const evidence = await captureLiveActualEvidence(
      `http://127.0.0.1:${address.port}`,
      { width: 120, height: 80 },
      parseAcceptanceYaml(`capture:
  samples: 3
  sample_interval_ms: 50
  settle_ms: 0
  timeout_ms: 10000
`),
      "zh-CN"
    );

    const observedTexts = evidence.samples.map(
      (sample) => sample.elements.find((element) => element.selector === "#price")?.text
    );
    assert.equal(new Set(observedTexts).size, 3);
    assert.equal(evidence.elementChanges.find((change) => change.selector === "#price")?.textChanged, true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("captures parent links and text-independent subtree signatures for repeated rows", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <style>
        body { margin: 0 }
        #quotes, .row { display: block; width: 120px }
        .row { height: 24px }
        .row > span { display: inline-block; width: 60px }
      </style>
      <section id="quotes">
        <div class="header"><span>名称</span><span>最新价</span></div>
        <div class="row"><span>平安银行</span><span>10.20</span></div>
        <div class="row"><span>招商银行</span><span>42.10</span></div>
      </section>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const evidence = await captureLiveActualEvidence(
      `http://127.0.0.1:${address.port}`,
      { width: 160, height: 100 },
      parseAcceptanceYaml("capture:\n  samples: 1\n  settle_ms: 0\n  timeout_ms: 5000"),
      "zh-CN"
    );
    const directChildren = evidence.samples[0].elements.filter(
      (element) => element.parentSelector === "#quotes"
    );
    const rows = directChildren.filter((element) =>
      element.subtreeSignature?.startsWith("div.row>")
    );
    const header = directChildren.find((element) =>
      element.subtreeSignature?.startsWith("div.header>")
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0].subtreeSignature, rows[1].subtreeSignature);
    assert.equal(rows[0].subtreeSignature, "div.row>span+span");
    assert.equal(header?.subtreeSignature, "div.header>span+span");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("captures viewport-relative Live ActualEvidence at every long-page scroll offset", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <style>
        html, body { margin: 0; width: 100px; height: 240px }
        .marker { position: absolute; left: 10px; width: 30px; height: 20px }
        #top { top: 5px } #middle { top: 105px } #bottom { top: 205px }
      </style>
      <div id="top" class="marker">top</div>
      <div id="middle" class="marker">middle</div>
      <div id="bottom" class="marker">bottom</div>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const captures = await captureLiveActualEvidenceAtScrollOffsets(
      `http://127.0.0.1:${address.port}`,
      { width: 100, height: 100 },
      [0, 100, 200],
      parseAcceptanceYaml("capture:\n  samples: 1\n  settle_ms: 0\n  timeout_ms: 5000"),
      "zh-CN"
    );

    assert.deepEqual(captures.map(({ scrollY }) => scrollY), [0, 100, 200]);
    assert.deepEqual(captures.map(({ evidence }) =>
      evidence.samples[0].elements.find((element) => element.text)?.text
    ), ["top", "middle", "bottom"]);
    assert.deepEqual(captures.map(({ evidence }) =>
      evidence.samples[0].elements.find((element) => element.text)?.box.y
    ), [5, 5, 5]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("captures every requested offset from a dominant inner scroll container", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <style>
        html, body { margin: 0; width: 100px; height: 100px; overflow: hidden }
        #feed { position: fixed; inset: 0; width: 100px; height: 100px; overflow-y: auto }
        #content { position: relative; height: 300px }
        .marker { position: absolute; left: 10px; width: 30px; height: 20px }
        #top { top: 5px } #middle { top: 105px } #bottom { top: 205px }
      </style>
      <main id="feed"><div id="content">
        <div id="top" class="marker">top</div>
        <div id="middle" class="marker">middle</div>
        <div id="bottom" class="marker">bottom</div>
      </div></main>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const captures = await captureLiveActualEvidenceAtScrollOffsets(
      `http://127.0.0.1:${address.port}`,
      { width: 100, height: 100 },
      [0, 100, 200],
      parseAcceptanceYaml("capture:\n  samples: 1\n  settle_ms: 0\n  timeout_ms: 5000"),
      "zh-CN"
    );

    assert.deepEqual(captures.map(({ evidence }) =>
      evidence.samples[0].elements.find((element) =>
        ["top", "middle", "bottom"].includes(element.text ?? "")
      )?.text
    ), ["top", "middle", "bottom"]);
    assert.deepEqual(captures.map(({ evidence }) =>
      evidence.samples[0].elements.find((element) =>
        ["top", "middle", "bottom"].includes(element.text ?? "")
      )?.box.y
    ), [5, 5, 5]);
    assert.deepEqual(captures.map(({ evidence }) => evidence.samples[0].scroll), [
      { target: "element", selector: "#feed", requestedY: 0, actualY: 0, scrollHeight: 300, clientHeight: 100 },
      { target: "element", selector: "#feed", requestedY: 100, actualY: 100, scrollHeight: 300, clientHeight: 100 },
      { target: "element", selector: "#feed", requestedY: 200, actualY: 200, scrollHeight: 300, clientHeight: 100 }
    ]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("does not guess when multiple dominant inner scroll containers can satisfy an offset", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <style>
        html, body { margin: 0; width: 100px; height: 100px; overflow: hidden }
        .scroller { position: fixed; inset: 0; width: 100px; height: 100px; overflow-y: auto }
        .content { height: 300px }
      </style>
      <section id="first" class="scroller"><div class="content">first</div></section>
      <section id="second" class="scroller"><div class="content">second</div></section>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const [capture] = await captureLiveActualEvidenceAtScrollOffsets(
      `http://127.0.0.1:${address.port}`,
      { width: 100, height: 100 },
      [100],
      parseAcceptanceYaml("capture:\n  samples: 1\n  settle_ms: 0\n  timeout_ms: 5000"),
      "zh-CN"
    );

    assert.deepEqual(capture.evidence.samples[0].scroll, {
      target: "unresolved",
      requestedY: 100,
      actualY: 0,
      scrollHeight: 100,
      clientHeight: 100
    });
    assert.match(capture.evidence.diagnostics.join("\n"), /多个主滚动容器/);
    assert.ok(capture.evidence.samples[0].coverage?.limitations?.filter(
      (item) => item.reason === "scroll-container"
    ).length === 2);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("a percentage-declared probability bar exempts only data-driven width and retains height and color defects", async () => {
  const server = createServer((_req, res) => res.end('<style>body{margin:0}</style><div data-figma-id="track" style="width:200px;height:28px;background:#eee"><div data-figma-id="bar" style="width:50%;height:28px;background:#ff0000"></div></div><span data-figma-id="value">50%</span>'));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address === "object");
  try {
    const config = parseAcceptanceYaml("capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0");
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`, { width: 300, height: 100 }, config, "en");
    const actual = evidence.samples[0].elements.find(item => item.dataFigmaId === "bar")!;
    assert.equal(actual.declaredWidthPercent, 50);
    const truth: DesignTruth = { source: { kind: "demo", name: "Probability" }, render: { image: evidence.samples[0].image, viewport: evidence.viewport }, diagnostics: [],
      root: { id: "root", name: "Probability", type: "FRAME", box: { x: 0, y: 0, width: 300, height: 100 }, style: {}, children: [
        { id: "track", parentId: "root", name: "Probability track", type: "GROUP", box: { x: 0, y: 0, width: 200, height: 20 }, style: {}, children: [
          { id: "bar", parentId: "track", name: "Probability fill", type: "RECTANGLE", box: { x: 0, y: 0, width: 40, height: 20 }, style: { backgroundColor: "#0000ff" }, children: [] }] },
        { id: "value", parentId: "root", name: "Probability", type: "TEXT", text: "20%", box: { x: 0, y: 24, width: 30, height: 18 }, style: {}, children: [] }] } };
    const result = await compareDesignToPage(truth, evidence, config, "en");
    const checks = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "bar")!.checks!;
    assert.equal(checks.find(check => check.property === "width")?.status, "exempt");
    assert.equal(checks.find(check => check.property === "height")?.status, "difference");
    assert.equal(checks.find(check => check.property === "color")?.status, "difference");
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("text mapped to a button container does not compare container dimensions as text dimensions", async () => {
  const server = createServer((_req, res) => res.end('<style>body{margin:0}button{position:absolute;left:15px;top:20px;width:345px;height:44px;padding:0;border:0;font:16px/44px Arial;text-align:center}</style><button data-figma-id="label">Open account</button>'));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  try {
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`, {width:375,height:100}, parseAcceptanceYaml('capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0'), 'en');
    const design: DesignTruth = {source:{kind:'demo',name:'button'},render:{image:evidence.samples[0].image,viewport:evidence.viewport},diagnostics:[],root:{id:'root',name:'page',type:'FRAME',box:{x:0,y:0,width:375,height:100},style:{},children:[{id:'label',name:'Open account',text:'Open account',type:'TEXT',box:{x:124,y:31,width:128,height:22},style:{fontSize:14,lineHeight:22},children:[]}]}};
    const result = await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
    assert.ok(!result.issues.some(i=>i.figmaNodeId==='label' && ['size','position'].includes(i.rule)));
    const checks=result.matching.designCoverage!.items[0].checks!;
    assert.equal(checks.find(c=>c.property==='width')?.status,'pending');
    assert.equal(checks.find(c=>c.property==='lineHeight')?.status,'pending');
    assert.equal(checks.find(c=>c.property==='fontSize')?.status,'difference');
    assert.equal(checks.find(c=>c.property==='text')?.status,'passed');
  } finally {server.close();}
});

test("default Live budget accommodates slow web fonts followed by all three samples", async () => {
  let fontRequested = false;
  const server = createServer((req, res) => {
    if (req.url === '/slow.woff2') {
      fontRequested = true;
      setTimeout(() => { res.writeHead(404); res.end(); }, 9000);
    } else res.end('<style>@font-face{font-family:Slow;src:url(/slow.woff2)}body{font-family:Slow,Arial}</style><h1>Ready after fonts</h1>');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  try {
    const evidence = await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`, {width:375,height:600}, parseAcceptanceYaml(), 'en');
    assert.ok(fontRequested);
    assert.equal(evidence.samples.length, 3);
    assert.ok(evidence.samples.every(sample => sample.elements.some(element => element.text === 'Ready after fonts')));
    assert.equal(parseAcceptanceYaml('capture:\n  timeout_ms: 10000').capture.timeoutMs, 10000, 'explicit limits remain respected');
  } finally { server.close(); }
});

test("blurred data stays pending instead of prescribing hidden text styling", async () => {
  const server=createServer((_req,res)=>res.end('<style>section{filter:blur(5px)}span{font-size:20px}</style><section><span data-figma-id="number">36.8%</span></section>'));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');
  try{
    const evidence=await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`,{width:375,height:100},parseAcceptanceYaml('capture:\n  samples: 3\n  sample_interval_ms: 0\n  settle_ms: 0'),'en');
    const actual=evidence.samples[0].elements.find(e=>e.dataFigmaId==='number')!;
    const design:DesignTruth={source:{kind:'demo',name:'locked'},render:{image:evidence.samples[0].image,viewport:evidence.viewport},diagnostics:[],root:{id:'root',name:'page',type:'FRAME',style:{},children:[{id:'number',name:'Return',type:'TEXT',text:'36.8%',box:actual.box,style:{fontSize:12},children:[]}]}};
    const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
    assert.equal(result.matching.designCoverage!.items[0].checks?.find(c=>c.property==='fontSize')?.status,'pending');
    assert.ok(!result.issues.some(i=>i.figmaNodeId==='number'&&i.rule==='typography'));
  }finally{server.close();}
});

test("a visible expand control plus clipped sibling content records a collapsed state without ARIA", async () => {
  const server=createServer((_req,res)=>res.setHeader('Content-Type','text/html; charset=utf-8').end('<meta charset="utf-8"><div><div style="height:40px;overflow:hidden"><div style="height:150px">Instructions</div></div><div><span>展开</span></div></div>'));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');
  try{const evidence=await captureLiveActualEvidence(`http://127.0.0.1:${address.port}`,{width:375,height:200},parseAcceptanceYaml('capture:\n  samples: 1\n  settle_ms: 0'),'en');
    assert.equal(evidence.samples[0].elements.find(e=>e.text==='展开')?.expanded,false, JSON.stringify(evidence.samples[0].elements.map(e=>({text:e.text,expanded:e.expanded,tag:e.tag,box:e.box}))));
  }finally{server.close();}
});
