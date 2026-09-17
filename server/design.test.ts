import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { buildDesignTruthFromFigma, createFigmaFetch } from "./design";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

test("spaces concurrent Figma API requests", async () => {
  let now = 0;
  const requestTimes: number[] = [];
  const client = createFigmaFetch({
    minRequestIntervalMs: 1_000,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    fetch: async () => {
      requestTimes.push(now);
      return jsonResponse({ ok: true });
    }
  });

  await Promise.all([
    client("https://api.figma.com/v1/first", "token", "zh-CN"),
    client("https://api.figma.com/v1/second", "token", "zh-CN")
  ]);

  assert.deepEqual(requestTimes, [0, 1_000]);
});

test("honors Retry-After and retries a rate-limited request", async () => {
  let now = 0;
  const requestTimes: number[] = [];
  let attempt = 0;
  const client = createFigmaFetch({
    minRequestIntervalMs: 1_000,
    maxRetries: 2,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    fetch: async () => {
      requestTimes.push(now);
      attempt += 1;
      return attempt === 1
        ? jsonResponse({ status: 429 }, 429, { "Retry-After": "2" })
        : jsonResponse({ ok: true });
    }
  });

  const result = await client<{ ok: boolean }>("https://api.figma.com/v1/resource", "token", "zh-CN");

  assert.equal(result.ok, true);
  assert.deepEqual(requestTimes, [0, 2_000]);
});

test("builds rendered and structured DesignTruth from a Figma Frame", async () => {
  const renderedImage = await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const truth = await buildDesignTruthFromFigma(
    {
      frameUrl: "https://www.figma.com/design/FILE_KEY/Market?node-id=1-2",
      accessToken: "figma-token",
      locale: "zh-CN"
    },
    {
      requestJson: async (url) => {
        if (url.includes("/nodes?")) {
          return {
            name: "金融 H5",
            nodes: {
              "1:2": {
                document: {
                  id: "1:2",
                  name: "行情首页",
                  type: "FRAME",
                  absoluteBoundingBox: { x: 100, y: 200, width: 390, height: 844 },
                  layoutMode: "VERTICAL",
                  itemSpacing: 12,
                  paddingTop: 16,
                  paddingRight: 20,
                  paddingBottom: 16,
                  paddingLeft: 20,
                  children: [
                    {
                      id: "2:1",
                      name: "页面标题",
                      type: "TEXT",
                      characters: "行情",
                      absoluteBoundingBox: { x: 120, y: 230, width: 80, height: 24 },
                      style: { fontFamily: "PingFang SC", fontSize: 18, fontWeight: 600 },
                      fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }]
                    }
                  ]
                }
              }
            }
          };
        }

        return { images: { "1:2": "https://figma.test/render.png" } };
      },
      fetchImage: async () => new Response(new Uint8Array(renderedImage), { status: 200 })
    }
  );

  assert.equal(truth.source.fileKey, "FILE_KEY");
  assert.equal(truth.source.frameId, "1:2");
  assert.equal(truth.source.fileName, "金融 H5");
  assert.deepEqual(truth.render.viewport, { width: 390, height: 844 });
  assert.ok(truth.render.image.equals(renderedImage));
  assert.equal(truth.root.id, "1:2");
  assert.deepEqual(truth.root.box, { x: 0, y: 0, width: 390, height: 844 });
  assert.equal(truth.root.layout?.mode, "VERTICAL");
  assert.equal(truth.root.layout?.itemSpacing, 12);

  const title = truth.root.children[0];
  assert.equal(title.parentId, "1:2");
  assert.deepEqual(title.box, { x: 20, y: 30, width: 80, height: 24 });
  assert.deepEqual(title.relativeBox, { x: 20, y: 30, width: 80, height: 24 });
  assert.equal(title.style.fontFamily, "PingFang SC");
  assert.equal(title.style.fontSize, 18);
});

test("preserves Component, Instance, and custom Variant metadata", async () => {
  const renderedImage = await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const truth = await buildDesignTruthFromFigma(
    {
      frameUrl: "https://www.figma.com/design/FILE_KEY/Market?node-id=1-2",
      accessToken: "figma-token",
      locale: "zh-CN"
    },
    {
      requestJson: async (url) => url.includes("/nodes?")
        ? {
            nodes: {
              "1:2": {
                document: {
                  id: "1:2",
                  name: "行情组件样本",
                  type: "FRAME",
                  absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
                  children: [
                    {
                      id: "3:0",
                      name: "行情颜色",
                      type: "COMPONENT_SET",
                      absoluteBoundingBox: { x: 10, y: 10, width: 200, height: 120 },
                      componentPropertyDefinitions: {
                        "市场走势": {
                          type: "VARIANT",
                          defaultValue: "看涨态",
                          variantOptions: ["看涨态", "回落态", "横盘态"]
                        }
                      },
                      children: [
                        {
                          id: "3:1",
                          name: "市场走势=看涨态",
                          type: "COMPONENT",
                          componentSetId: "3:0",
                          variantProperties: { "市场走势": "看涨态" },
                          absoluteBoundingBox: { x: 10, y: 10, width: 90, height: 40 }
                        }
                      ]
                    },
                    {
                      id: "4:1",
                      name: "自选行情项",
                      type: "INSTANCE",
                      componentId: "3:1",
                      componentProperties: {
                        "市场走势": { type: "VARIANT", value: "看涨态" },
                        "显示箭头#业务": { type: "BOOLEAN", value: true }
                      },
                      absoluteBoundingBox: { x: 10, y: 160, width: 90, height: 40 }
                    }
                  ]
                }
              }
            }
          }
        : { images: { "1:2": "https://figma.test/render.png" } },
      fetchImage: async () => new Response(new Uint8Array(renderedImage), { status: 200 })
    }
  );

  const componentSet = truth.root.children[0];
  const component = componentSet.children[0];
  const instance = truth.root.children[1];

  assert.equal(componentSet.component?.kind, "component-set");
  assert.deepEqual(componentSet.component?.propertyDefinitions, {
    "市场走势": {
      type: "VARIANT",
      defaultValue: "看涨态",
      variantOptions: ["看涨态", "回落态", "横盘态"]
    }
  });
  assert.equal(component.component?.kind, "component");
  assert.equal(component.component?.componentSetId, "3:0");
  assert.deepEqual(component.component?.variantProperties, { "市场走势": "看涨态" });
  assert.equal(instance.component?.kind, "instance");
  assert.equal(instance.component?.componentId, "3:1");
  assert.deepEqual(instance.component?.properties, {
    "市场走势": { type: "VARIANT", value: "看涨态" },
    "显示箭头#业务": { type: "BOOLEAN", value: true }
  });
});

test("keeps nodes that omit optional Figma metadata", async () => {
  const renderedImage = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const truth = await buildDesignTruthFromFigma(
    {
      frameUrl: "https://www.figma.com/design/FILE_KEY/Sparse?node-id=1-2",
      accessToken: "figma-token",
      locale: "zh-CN"
    },
    {
      requestJson: async (url) => url.includes("/nodes?")
        ? {
            nodes: {
              "1:2": {
                document: {
                  id: "1:2",
                  type: "FRAME",
                  absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                  children: [{ id: "2:1" }]
                }
              }
            }
          }
        : { images: { "1:2": "https://figma.test/sparse.png" } },
      fetchImage: async () => new Response(new Uint8Array(renderedImage), { status: 200 })
    }
  );

  const sparseNode = truth.root.children[0];
  assert.equal(sparseNode.id, "2:1");
  assert.equal(sparseNode.parentId, "1:2");
  assert.equal(sparseNode.name, "2:1");
  assert.equal(sparseNode.type, "UNKNOWN");
  assert.equal(sparseNode.box, undefined);
  assert.equal(sparseNode.relativeBox, undefined);
  assert.equal(sparseNode.layout, undefined);
  assert.equal(sparseNode.component, undefined);
  assert.deepEqual(sparseNode.children, []);
});

test("preserves Auto Layout and source style evidence", async () => {
  const renderedImage = await sharp({
    create: {
      width: 200,
      height: 100,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const truth = await buildDesignTruthFromFigma(
    {
      frameUrl: "https://www.figma.com/design/FILE_KEY/Layout?node-id=1-2",
      accessToken: "figma-token",
      locale: "zh-CN"
    },
    {
      requestJson: async (url) => url.includes("/nodes?")
        ? {
            nodes: {
              "1:2": {
                document: {
                  id: "1:2",
                  name: "横向行情卡片",
                  type: "FRAME",
                  absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
                  layoutMode: "HORIZONTAL",
                  layoutSizingHorizontal: "HUG",
                  layoutSizingVertical: "FIXED",
                  layoutWrap: "WRAP",
                  primaryAxisSizingMode: "AUTO",
                  counterAxisSizingMode: "FIXED",
                  primaryAxisAlignItems: "SPACE_BETWEEN",
                  counterAxisAlignItems: "CENTER",
                  counterAxisAlignContent: "SPACE_BETWEEN",
                  itemSpacing: 8,
                  counterAxisSpacing: 6,
                  itemReverseZIndex: true,
                  strokesIncludedInLayout: true,
                  styles: { fill: "S:fill", effect: "S:shadow" },
                  fills: [{ type: "IMAGE", imageRef: "image-ref-1", scaleMode: "FILL" }],
                  effects: [{ type: "DROP_SHADOW", visible: true, radius: 12 }],
                  children: [
                    {
                      id: "2:1",
                      name: "行情名称",
                      type: "TEXT",
                      characters: "上证指数",
                      absoluteBoundingBox: { x: 12, y: 20, width: 80, height: 24 },
                      layoutSizingHorizontal: "FILL",
                      layoutSizingVertical: "HUG",
                      layoutAlign: "STRETCH",
                      layoutGrow: 1,
                      layoutPositioning: "AUTO"
                    }
                  ]
                }
              }
            }
          }
        : { images: { "1:2": "https://figma.test/layout.png" } },
      fetchImage: async () => new Response(new Uint8Array(renderedImage), { status: 200 })
    }
  );

  assert.deepEqual(truth.root.layout, {
    mode: "HORIZONTAL",
    sizingHorizontal: "HUG",
    sizingVertical: "FIXED",
    wrap: "WRAP",
    primaryAxisSizing: "AUTO",
    counterAxisSizing: "FIXED",
    primaryAxisAlign: "SPACE_BETWEEN",
    counterAxisAlign: "CENTER",
    counterAxisAlignContent: "SPACE_BETWEEN",
    itemSpacing: 8,
    counterAxisSpacing: 6,
    reverseZIndex: true,
    strokesIncluded: true
  });
  assert.deepEqual(truth.root.styleEvidence, {
    styleIds: { fill: "S:fill", effect: "S:shadow" },
    fills: [{ type: "IMAGE", imageRef: "image-ref-1", scaleMode: "FILL" }],
    effects: [{ type: "DROP_SHADOW", visible: true, radius: 12 }]
  });
  assert.deepEqual(truth.root.children[0].layout, {
    sizingHorizontal: "FILL",
    sizingVertical: "HUG",
    align: "STRETCH",
    grow: 1,
    positioning: "AUTO"
  });
});

test("keeps Figma resource catalogs for external component relationships", async () => {
  const renderedImage = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const truth = await buildDesignTruthFromFigma(
    {
      frameUrl: "https://www.figma.com/design/FILE_KEY/Resources?node-id=1-2",
      accessToken: "figma-token",
      locale: "zh-CN"
    },
    {
      requestJson: async (url) => url.includes("/nodes?")
        ? {
            nodes: {
              "1:2": {
                document: {
                  id: "1:2",
                  name: "外部组件实例",
                  type: "FRAME",
                  absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                  children: [
                    {
                      id: "2:1",
                      name: "行情项实例",
                      type: "INSTANCE",
                      componentId: "3:1",
                      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 }
                    }
                  ]
                },
                components: {
                  "3:1": {
                    key: "component-key",
                    name: "行情项/上涨",
                    description: "上涨行情样式",
                    componentSetId: "3:0"
                  }
                },
                componentSets: {
                  "3:0": {
                    key: "set-key",
                    name: "行情项",
                    description: "行情涨跌状态集合"
                  }
                },
                styles: {
                  "S:1": {
                    key: "style-key",
                    name: "行情/上涨色",
                    styleType: "FILL"
                  }
                }
              }
            }
          }
        : { images: { "1:2": "https://figma.test/resources.png" } },
      fetchImage: async () => new Response(new Uint8Array(renderedImage), { status: 200 })
    }
  );

  assert.equal(truth.root.children[0].component?.componentId, "3:1");
  assert.deepEqual(truth.resources.components["3:1"], {
    key: "component-key",
    name: "行情项/上涨",
    description: "上涨行情样式",
    componentSetId: "3:0"
  });
  assert.equal(truth.resources.componentSets["3:0"].name, "行情项");
  assert.equal(truth.resources.styles["S:1"].name, "行情/上涨色");
});
