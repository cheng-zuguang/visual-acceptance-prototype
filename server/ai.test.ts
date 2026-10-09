import assert from "node:assert/strict";
import test from "node:test";
import type {
  AgentElementBindingRequest,
  AgentHypothesisRequest,
  PageAlignmentPlan,
  ReviewIssue
} from "../src/types";
import {
  generateAiAdvice,
  generateDynamicHypothesis,
  generateElementBindings,
  resolveElementBindingTimeoutMs
} from "./ai";

test("bounds the configurable element-binding timeout", () => {
  assert.equal(resolveElementBindingTimeoutMs({}), 60_000);
  assert.equal(resolveElementBindingTimeoutMs({ DIFFLAB_AI_BINDING_TIMEOUT_MS: "120000" }), 120_000);
  assert.equal(resolveElementBindingTimeoutMs({ DIFFLAB_AI_BINDING_TIMEOUT_MS: "1000" }), 10_000);
  assert.equal(resolveElementBindingTimeoutMs({ DIFFLAB_AI_BINDING_TIMEOUT_MS: "999999" }), 180_000);
  assert.equal(resolveElementBindingTimeoutMs({ DIFFLAB_AI_BINDING_TIMEOUT_MS: "invalid" }), 60_000);
});

const groundedIssue: ReviewIssue = {
  id: "issue-position-1",
  category: "布局",
  severity: "error",
  title: "利率观察模块整体位置偏移",
  summary: "已匹配模块相对设计稿下移 24px。",
  expected: "y=120",
  actual: "y=144",
  suggestion: "调整已匹配模块的容器位置。",
  rule: "position",
  evidenceConfidence: {
    score: 0.98,
    level: "high",
    basis: ["geometric-alignment"],
    reasons: ["两个稳定结构锚点支持该结论。"]
  },
  priority: "P0",
  location: {
    selector: "#rate-observation",
    figmaNodeId: "2:matched",
    description: "利率观察"
  },
  primaryAction: "将 #rate-observation 上移 24px。",
  evidence: []
};

test("large advice reviews retain completed rankings when a later bounded batch times out", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const refs: string[] = body.text.format.schema.properties.summaryEvidenceRefs.items.enum;
    assert.ok(refs.length <= 64);
    if (++calls === 2) throw new DOMException("timeout", "TimeoutError");
    return new Response(JSON.stringify({ output_text: JSON.stringify({ summaryEvidenceRefs: [refs[0]], priorities: [{ evidenceRefs: [refs[0]] }] }) }));
  };
  try {
    await assert.rejects(generateAiAdvice({ apiUrl: "https://api.example.test/v1", locale: "zh-CN",
      issues: Array.from({ length: 80 }, (_, i) => ({ ...groundedIssue, id: `issue-${i}`,
        ...(i === 79 ? { rule: "missing_module" } : {}) })),
      pageAlignment: { regions: [], summary: "", rejectedRegionCount: 0 }
    }), (error: any) => {
      assert.equal(error.name, "TimeoutError");
      assert.deepEqual(error.partialAdvice.summaryEvidenceRefs, ["review-issue:issue-79", "review-issue:issue-0"]);
      assert.match(error.partialAdvice.summary, /部分/);
      return true;
    });
  } finally { globalThis.fetch = originalFetch; }
});

test("AI cannot omit a published module requiring verification or rewrite it as confirmed missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({
    summaryEvidenceRefs: ["review-issue:issue-position-1"], priorities: [{ evidenceRefs: ["review-issue:issue-position-1"] }]
  }) }));
  const pending: ReviewIssue = { ...groundedIssue, id: "coverage:vote", rule: "design_coverage_unverified", severity: "pending", priority: "Pending",
    title: "投票 模块疑似缺失（待核验）", summary: "对应关系未验证", primaryAction: "核查投票模块；确认缺失后补齐。",
    coverageModule: { id: "vote", name: "投票", nodeIds: ["vote"] } };
  try {
    const advice = await generateAiAdvice({ apiKey: "test", apiUrl: "https://api.example.test/v1", model: "test",
      issues: [groundedIssue, pending], pageAlignment: alignmentPlanWithUnmatchedDesignNode, locale: "zh-CN" });
    assert.ok(advice.summaryEvidenceRefs.includes("review-issue:coverage:vote"));
    assert.equal(advice.priorities[0].title, pending.title);
    assert.equal(advice.priorities[0].action, pending.primaryAction);
  } finally { globalThis.fetch = originalFetch; }
});

test("a module verification reference buried in a mixed priority still gets its own action", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({
    summaryEvidenceRefs: ["review-issue:issue-position-1"],
    priorities: [{ evidenceRefs: ["review-issue:issue-position-1", "review-issue:coverage:vote"] }]
  }) }));
  const pending: ReviewIssue = { ...groundedIssue, id: "coverage:vote", rule: "design_coverage_unverified", severity: "pending", priority: "Pending",
    title: "投票待核验", coverageModule: { id: "vote", name: "投票", nodeIds: ["vote"] } };
  try {
    const advice = await generateAiAdvice({ apiKey: "test", apiUrl: "https://api.example.test/v1", model: "test", issues: [groundedIssue, pending],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode, locale: "zh-CN" });
    assert.ok(advice.priorities.some(priority => priority.title === pending.title));
  } finally { globalThis.fetch = originalFetch; }
});

const structuralMissingIssue: ReviewIssue = {
  ...groundedIssue,
  id: "missing-module:2:unmatched-vote",
  rule: "missing_module",
  title: "投票模块缺失",
  summary: "相邻已匹配模块的位移阶跃与投票模块的设计高度一致。",
  suggestion: "先恢复投票模块，再处理下游元素位移。",
  primaryAction: "先恢复投票模块，再处理下游元素位移。",
  location: {
    figmaNodeId: "2:unmatched-vote",
    description: "投票模块"
  }
};

const alignmentPlanWithUnmatchedDesignNode: PageAlignmentPlan = {
  summary: "设计侧还有一个未匹配的投票模块。",
  rejectedRegionCount: 0,
  regions: [
    {
      designParentFigmaNodeId: "2:matched",
      designPath: ["利率观察"],
      status: "matched",
      actualParentSelector: "#rate-observation",
      displacement: { x: 0, y: 24 },
      confidence: 0.98,
      reason: "多个稳定结构锚点形成一致位移。",
      source: "deterministic",
      anchorStats: {
        candidateCount: 3,
        stableCount: 3,
        dynamicExcludedCount: 1,
        structuralAnchorCount: 2,
        inlierCount: 3,
        residualPx: 0.5
      },
      scoreBreakdown: {
        anchorEvidenceApplied: true,
        baseScoreCap: 1,
        weightedScore: 0.98,
        finalScore: 0.98,
        components: {
          stabilityCoverage: { value: 1, weight: 0.2, contribution: 0.2 },
          anchorSufficiency: { value: 1, weight: 0.2, contribution: 0.2 },
          inlierRatio: { value: 1, weight: 0.2, contribution: 0.2 },
          residualQuality: { value: 0.9, weight: 0.15, contribution: 0.135 },
          dynamicCleanliness: { value: 1, weight: 0.1, contribution: 0.1 },
          structuralSupport: { value: 1, weight: 0.15, contribution: 0.15 }
        },
        levelThresholds: { highMin: 0.85, mediumMin: 0.65, lowMin: 0.45 }
      },
      evidenceConfidence: groundedIssue.evidenceConfidence
    },
    {
      designParentFigmaNodeId: "2:unmatched-vote",
      designPath: ["投票模块（仅设计侧存在）"],
      status: "missing-in-actual",
      confidence: 0.9,
      reason: "开发页中没有对应节点。",
      source: "agent-verified",
      anchorStats: {
        candidateCount: 0,
        stableCount: 0,
        dynamicExcludedCount: 0,
        structuralAnchorCount: 0,
        inlierCount: 0,
        residualPx: null
      },
      scoreBreakdown: {
        anchorEvidenceApplied: false,
        baseScoreCap: 0.9,
        weightedScore: 0.9,
        finalScore: 0.9,
        components: {
          stabilityCoverage: { value: 0, weight: 0.2, contribution: 0 },
          anchorSufficiency: { value: 0, weight: 0.2, contribution: 0 },
          inlierRatio: { value: 0, weight: 0.2, contribution: 0 },
          residualQuality: { value: 0, weight: 0.15, contribution: 0 },
          dynamicCleanliness: { value: 0, weight: 0.1, contribution: 0 },
          structuralSupport: { value: 0, weight: 0.15, contribution: 0 }
        },
        levelThresholds: { highMin: 0.85, mediumMin: 0.65, lowMin: 0.45 }
      },
      evidenceConfidence: {
        score: 0.9,
        level: "high",
        basis: ["agent-hypothesis"],
        reasons: ["Agent 提议，但该节点不在交集内。"]
      }
    }
  ]
};

test("publishes AI advice only from final ReviewIssues and verified matched alignment", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        summaryEvidenceRefs: ["review-issue:issue-position-1"],
        priorities: [{ evidenceRefs: ["review-issue:issue-position-1"] }]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.equal(advice.priorities[0].title, groundedIssue.title);
    assert.equal(advice.priorities[0].action, groundedIssue.primaryAction);
    assert.deepEqual(advice.summaryEvidenceRefs, ["review-issue:issue-position-1"]);
    assert.deepEqual(advice.priorities[0].evidenceRefs, ["review-issue:issue-position-1"]);
    assert.doesNotMatch(JSON.stringify(advice), /恢复|投票模块|未匹配/);

    const content = (requestBody?.input as Array<{ content: Array<{ type: string; text?: string }> }>)[0].content;
    assert.deepEqual(content.map((item) => item.type), ["input_text"]);
    assert.doesNotMatch(content[0].text ?? "", /投票模块|missing-in-actual|恢复/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarizes grouped evidence with one action instead of concatenating selectors", async () => {
  const originalFetch = globalThis.fetch;
  const selector = "body > div > div:nth-of-type(1) > span";
  const issue = {...groundedIssue, location: {...groundedIssue.location, selector}, primaryAction: `检查 ${selector} 的定位、间距。`};
  const sibling = {...issue, id: "second", title: "概率 位置偏移"};
  globalThis.fetch = async () => new Response(JSON.stringify({output_text: JSON.stringify({
    summaryEvidenceRefs: [`review-issue:${issue.id}`],
    priorities: [{evidenceRefs: [`review-issue:${issue.id}`, "review-issue:second"]}]
  })}));
  try {
    const advice = await generateAiAdvice({issues: [issue, sibling], pageAlignment: {summary: "", regions: [], rejectedRegionCount: 0}, locale: "zh-CN", apiKey: "test"});
    assert.equal(advice.priorities[0].title, issue.title);
    assert.doesNotMatch(advice.priorities[0].action, /body >|nth-of-type/);
    assert.equal(advice.priorities[0].evidenceRefs.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("lets AI prioritize a structurally verified missing-module ReviewIssue", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        summaryEvidenceRefs: ["review-issue:missing-module:2:unmatched-vote"],
        priorities: [{ evidenceRefs: ["review-issue:missing-module:2:unmatched-vote"] }]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [structuralMissingIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.equal(advice.priorities[0].title, "投票模块缺失");
    assert.equal(advice.priorities[0].action, "先恢复投票模块，再处理下游元素位移。");
    assert.deepEqual(advice.priorities[0].evidenceRefs, [
      "review-issue:missing-module:2:unmatched-vote"
    ]);

    const content = (requestBody?.input as Array<{ content: Array<{ type: string; text?: string }> }>)[0].content;
    assert.match(content[0].text ?? "", /review-issue:missing-module:2:unmatched-vote/);
    assert.doesNotMatch(content[0].text ?? "", /page-alignment:2:unmatched-vote/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps a blocking missing-module issue in AI advice when the model omits it", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: JSON.stringify({
      summaryEvidenceRefs: ["review-issue:issue-position-1"],
      priorities: [{ evidenceRefs: ["review-issue:issue-position-1"] }]
    })
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue, structuralMissingIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.deepEqual(advice.summaryEvidenceRefs, [
      "review-issue:missing-module:2:unmatched-vote",
      "review-issue:issue-position-1"
    ]);
    assert.deepEqual(advice.priorities[0].evidenceRefs, [
      "review-issue:missing-module:2:unmatched-vote"
    ]);
    assert.equal(advice.priorities[0].title, "投票模块缺失");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts a schema-valid grounded evidence selection wrapped in a Markdown code fence", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: `\`\`\`json
{"summaryEvidenceRefs":["review-issue:issue-position-1"],"priorities":[{"evidenceRefs":["review-issue:issue-position-1"]}]}
\`\`\``
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.match(advice.summary, new RegExp(groundedIssue.title));
    assert.equal(advice.priorities[0].action, groundedIssue.primaryAction);
    assert.equal(advice.model, "test-model");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts a Gemini Responses fenced evidence-reference array as shorthand", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      id: "gemini-response",
      object: "response",
      status: "completed",
      output: [{
        type: "message",
        role: "assistant",
        content: [{
          type: "output_text",
          text: `\`\`\`json
[
  "review-issue:issue-position-1"
]
\`\`\``
        }],
        status: "completed"
      }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "gemini-3.8-flash-tiered",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.equal(calls, 1);
    assert.deepEqual(advice.summaryEvidenceRefs, ["review-issue:issue-position-1"]);
    assert.deepEqual(advice.priorities[0].evidenceRefs, ["review-issue:issue-position-1"]);
    assert.equal(advice.priorities[0].action, groundedIssue.primaryAction);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects Gemini shorthand arrays that reference unpublished evidence", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        role: "assistant",
        content: [{
          type: "output_text",
          text: `\`\`\`json
["review-issue:not-published"]
\`\`\``
        }],
        status: "completed"
      }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await assert.rejects(generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "gemini-3.8-flash-tiered",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    }), /outside the published review boundary/);

    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repairs a plain Markdown response once into grounded evidence references", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    const outputText = calls === 1
      ? "## 视觉验收修复优先级\n1. 先修复页面结构"
      : JSON.stringify({
          summaryEvidenceRefs: ["review-issue:issue-position-1"],
          priorities: [{ evidenceRefs: ["review-issue:issue-position-1"] }]
        });
    return new Response(JSON.stringify({ output_text: outputText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const advice = await generateAiAdvice({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.equal(calls, 2);
    assert.match(advice.summary, new RegExp(groundedIssue.title));
    assert.equal(advice.priorities[0].title, groundedIssue.title);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repairs parseable JSON that does not satisfy the AI advice contract", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      output_text: calls === 1
        ? JSON.stringify({ summaryEvidenceRefs: ["review-issue:issue-position-1"] })
        : JSON.stringify({
            summaryEvidenceRefs: ["review-issue:issue-position-1"],
            priorities: [{ evidenceRefs: ["review-issue:issue-position-1"] }]
          })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const advice = await generateAiAdvice({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    });

    assert.equal(calls, 2);
    assert.match(advice.summary, new RegExp(groundedIssue.title));
    assert.equal(advice.priorities[0].action, groundedIssue.primaryAction);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects ungrounded Markdown when the format repair is still invalid", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      output_text: "## 视觉验收修复优先级\n\n1. **先修复模块结构**\n2. 再处理字体和间距"
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await assert.rejects(generateAiAdvice({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    }), /Unexpected token|AI advice selection/);

    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects AI references to design-only unmatched nodes after one repair attempt", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        summaryEvidenceRefs: ["page-alignment:2:unmatched-vote"],
        priorities: [{ evidenceRefs: ["page-alignment:2:unmatched-vote"] }]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await assert.rejects(generateAiAdvice({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      issues: [groundedIssue],
      pageAlignment: alignmentPlanWithUnmatchedDesignNode,
      locale: "zh-CN"
    }), /outside the published review boundary/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requests a strict AgentHypothesis using only the bounded candidate evidence", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        candidateType: "market-value",
        binding: { figmaNodeId: "2:price", fingerprintKey: "figma:2:price" },
        strategy: "normalize-market-value-text",
        normalizedProperties: ["text"],
        reasons: ["多帧文本变化。"]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const request: AgentHypothesisRequest = {
    locale: "zh-CN",
    candidate: {
      design: {
        figmaNodeId: "2:price",
        name: "最新价",
        text: "行情占位",
        box: { x: 4, y: 8, width: 40, height: 16 }
      },
      actual: {
        fingerprintKey: "figma:2:price",
        selector: "#price",
        observedTexts: ["候选甲", "候选乙", "候选丙"],
        box: { x: 4, y: 8, width: 40, height: 16 }
      },
      observations: {
        sampleCount: 3,
        presentInAllSamples: true,
        textChanged: true,
        geometryChanged: false,
        styleChanged: false
      }
    }
  };

  try {
    const hypothesis = await generateDynamicHypothesis({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request
    });

    assert.equal(hypothesis.binding.figmaNodeId, "2:price");
    const input = requestBody?.input as Array<{ content: Array<{ type: string; text?: string }> }>;
    assert.equal(input.length, 1);
    assert.deepEqual(input[0].content.map((item) => item.type), ["input_text"]);
    assert.match(input[0].content[0].text ?? "", /figma:2:price/);
    assert.equal((requestBody?.text as { format: { type: string; strict: boolean } }).format.type, "json_schema");
    assert.equal((requestBody?.text as { format: { type: string; strict: boolean } }).format.strict, true);
    const schema = (requestBody?.text as {
      format: { schema: { properties: { candidateType: { enum: string[] }; strategy: { enum: string[] } } } }
    }).format.schema;
    assert.deepEqual(schema.properties.candidateType.enum, [
      "market-value", "date-time", "countdown", "probability"
    ]);
    assert.deepEqual(schema.properties.strategy.enum, [
      "normalize-market-value-text",
      "normalize-date-time-text",
      "normalize-countdown-text",
      "normalize-probability-text"
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requests a structured PageAlignmentPlan before element bindings", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        pageSummary: "开发页缺少投票模块。",
        alignmentPlan: {
          regions: [{
            designParentFigmaNodeId: "2:poll",
            designPath: ["美联储观察", "投票模块"],
            status: "missing-in-actual",
            actualParentSelector: null,
            displacement: null,
            confidence: 0.94,
            reason: "没有对应开发模块。"
          }]
        },
        bindings: []
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const request: AgentElementBindingRequest = {
    locale: "zh-CN",
    designCandidates: [{
      figmaNodeId: "2:poll-card",
      parentFigmaNodeId: "2:poll",
      ancestorPath: ["美联储观察", "投票模块"],
      name: "投票卡片",
      type: "RECTANGLE",
      box: { x: 0, y: 100, width: 375, height: 200 }
    }],
    actualCandidates: [{
      fingerprintKey: "dom:article:.news-card",
      selector: ".news-card",
      parentSelector: ".news-list",
      tag: "article",
      box: { x: 0, y: 100, width: 375, height: 200 }
    }]
  };

  try {
    const result = await generateElementBindings({
      apiKey: "test-key",
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request,
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    });

    assert.equal(result.alignmentPlan?.regions[0]?.status, "missing-in-actual");
    const input = requestBody?.input as Array<{ content: Array<{ type: string; text?: string }> }>;
    const prompt = input[0].content[0].text ?? "";
    assert.match(prompt, /alignmentPlan/);
    assert.match(prompt, /missing-in-actual/);
    const schema = (requestBody?.text as {
      format: {
        schema: {
          required: string[];
          properties: {
            alignmentPlan: {
              properties: {
                regions: { maxItems: number; items: { properties: { status: { enum: string[] } } } };
              };
            };
            bindings: { maxItems: number };
          };
        };
      };
    }).format.schema;
    assert.equal(schema.required.includes("alignmentPlan"), true);
    assert.equal(schema.properties.alignmentPlan.properties.regions.maxItems, 40);
    assert.equal(schema.properties.bindings.maxItems, 60);
    assert.deepEqual(
      schema.properties.alignmentPlan.properties.regions.items.properties.status.enum,
      ["matched", "missing-in-actual", "uncertain"]
    );
    const regionSchema = schema.properties.alignmentPlan.properties.regions.items as unknown as {
      required: string[];
      properties: {
        actualParentSelector: { type: string[] };
        displacement: { anyOf: Array<{ type: string }> };
      };
    };
    assert.equal(regionSchema.required.includes("actualParentSelector"), true);
    assert.equal(regionSchema.required.includes("displacement"), true);
    assert.deepEqual(regionSchema.properties.actualParentSelector.type, ["string", "null"]);
    assert.equal(regionSchema.properties.displacement.anyOf.some((item) => item.type === "null"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepts a fenced structured element-binding response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: "```json\n{\"pageSummary\":\"对应关系待核验\",\"alignmentPlan\":{\"regions\":[]},\"bindings\":[]}\n```"
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    });
    assert.equal(result.pageSummary, "对应关系待核验");
    assert.deepEqual(result.alignmentPlan.regions, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads the final output text when a response includes an earlier commentary block", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output: [
      { type: "reasoning", content: [{ type: "text", text: "I will compare the page." }] },
      { type: "message", content: [{ type: "output_text", text: JSON.stringify({
        pageSummary: "模块对应", alignmentPlan: { regions: [] }, bindings: []
      }) }] }
    ]
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    });
    assert.equal(result.pageSummary, "模块对应");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the last final message when a compatible API emits multiple messages", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output: [
      { type: "message", content: [{ type: "output_text", text: "I will compare the page." }] },
      { type: "message", content: [{ type: "output_text", text: JSON.stringify({
        pageSummary: "最终判断", alignmentPlan: { regions: [] }, bindings: []
      }) }] }
    ]
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    });
    assert.equal(result.pageSummary, "最终判断");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a partial element-binding result as a format error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: JSON.stringify({ pageSummary: "分析完成", alignmentPlan: { regions: [] } })
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    }), SyntaxError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed region entries before deterministic verification", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: JSON.stringify({
      pageSummary: "分析完成",
      alignmentPlan: { regions: [null] },
      bindings: []
    })
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    await assert.rejects(generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    }), SyntaxError);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bounds large semantic requests without dropping candidate identities", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, any> | undefined;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      output_text: JSON.stringify({ pageSummary: "仅报告关键模块", alignmentPlan: { regions: [] }, bindings: [] })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const candidates = Array.from({ length: 101 }, (_, index) => ({
    figmaNodeId: `node-${index}`, name: `候选 ${index}`, type: "RECTANGLE",
    box: { x: 0, y: index, width: 10, height: 10 }
  }));
  try {
    await generateElementBindings({
      apiUrl: "https://api.example.test/v1",
      model: "test-model",
      request: { locale: "zh-CN", designCandidates: candidates, actualCandidates: [] },
      referenceImage: Buffer.from("design"),
      actualImage: Buffer.from("actual")
    });
    const schema = requestBody?.text.format.schema;
    assert.equal(schema.properties.alignmentPlan.properties.regions.maxItems, 16);
    assert.equal(schema.properties.bindings.maxItems, 24);
    const prompt = requestBody?.input[0].content[0].text as string;
    assert.match(prompt, /node-100/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps structural identities while trimming repeated region context", async () => {
  const originalFetch = globalThis.fetch;
  let prompt = "";
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    prompt = body.input[0].content[0].text;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({ pageSummary: "结构待核验", alignmentPlan: { regions: [] }, bindings: [] })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    await generateElementBindings({
      apiUrl: "https://api.example.test/v1", model: "test-model",
      request: {
        locale: "zh-CN",
        designRegions: Array.from({ length: 50 }, (_, index) => ({
          figmaNodeId: `region-${index}`, parentFigmaNodeId: "root",
          designPath: ["root", "page", `region-${index}`],
          box: { x: 0, y: index * 10, width: 10, height: 10 },
          contextTexts: Array.from({ length: 12 }, (_, textIndex) => `${index}-${textIndex}-${"x".repeat(120)}`)
        })),
        designCandidates: [{ figmaNodeId: "design-target", name: "目标", type: "TEXT",
          box: { x: 0, y: 0, width: 10, height: 10 } }],
        actualCandidates: [{ fingerprintKey: "actual-target", selector: ".target", tag: "span",
          box: { x: 0, y: 0, width: 10, height: 10 } }]
      },
      referenceImage: Buffer.from("design"), actualImage: Buffer.from("actual")
    });
    assert.match(prompt, /region-49/);
    assert.match(prompt, /design-target/);
    assert.match(prompt, /actual-target/);
    assert.doesNotMatch(prompt, /x{100}/);
    assert.ok(prompt.length < 30_000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes a compatible provider's selector-based bindings without trusting incomplete module claims", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: `\`\`\`json\n${JSON.stringify({
    pageSummary: "候选对应",
    alignmentPlan: [{ designParentFigmaNodeId: "module", designPath: ["页面", "模块"],
      status: "missing-in-actual", actualParentSelector: null, displacement: null }],
    elementBindings: [{ designCandidateFigmaNodeId: "design-card", actualCandidateSelector: ".card",
      confidence: 0.91 }]
  })}\n\`\`\`` }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1", model: "test-model",
      request: { locale: "zh-CN", designCandidates: [{ figmaNodeId: "design-card", name: "卡片",
        type: "RECTANGLE", box: { x: 0, y: 0, width: 10, height: 10 } }],
        actualCandidates: [{ fingerprintKey: "actual-card-key", selector: ".card", tag: "div",
          box: { x: 0, y: 0, width: 10, height: 10 } }] },
      referenceImage: Buffer.from("design"), actualImage: Buffer.from("actual")
    });
    assert.deepEqual(result.alignmentPlan.regions, []);
    assert.equal(result.bindings.length, 1);
    assert.equal(result.bindings[0].figmaNodeId, "design-card");
    assert.equal(result.bindings[0].fingerprintKey, "actual-card-key");
    assert.match(result.bindings[0].reason, /未附理由/);
  } finally { globalThis.fetch = originalFetch; }
});

test("passes an unknown selector proposal to deterministic rejection and correction", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({
    pageSummary: "候选对应", alignmentPlan: [],
    elementBindings: [{ designCandidateFigmaNodeId: "design-card", actualCandidateSelector: ".unknown",
      confidence: 0.91 }]
  }) }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1", model: "test-model",
      request: { locale: "zh-CN", designCandidates: [{ figmaNodeId: "design-card", name: "卡片",
        type: "RECTANGLE", box: { x: 0, y: 0, width: 10, height: 10 } }], actualCandidates: [] },
      referenceImage: Buffer.from("design"), actualImage: Buffer.from("actual")
    });
    assert.equal(result.bindings[0].fingerprintKey, ".unknown");
  } finally { globalThis.fetch = originalFetch; }
});

test("accepts a complete fenced binding result preceded by provider commentary", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text:
    `Here is the result:\n\`\`\`json\n${JSON.stringify({ pageSummary: "对应关系", alignmentPlan: { regions: [] }, bindings: [] })}\n\`\`\``
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1", model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"), actualImage: Buffer.from("actual")
    });
    assert.equal(result.pageSummary, "对应关系");
  } finally { globalThis.fetch = originalFetch; }
});

test("accepts a provider's module array with standard binding entries", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({
    pageSummary: "模块候选",
    alignmentPlan: [{ designParentFigmaNodeId: "module", designPath: ["页面", "模块"],
      status: "uncertain", actualParentSelector: null, displacement: null }],
    bindings: [{ figmaNodeId: "design-card", fingerprintKey: "actual-card-key", confidence: 0.91,
      reason: "名称和尺寸相同" }]
  }) }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await generateElementBindings({
      apiUrl: "https://api.example.test/v1", model: "test-model",
      request: { locale: "zh-CN", designCandidates: [], actualCandidates: [] },
      referenceImage: Buffer.from("design"), actualImage: Buffer.from("actual")
    });
    assert.deepEqual(result.alignmentPlan.regions, []);
    assert.equal(result.bindings[0].fingerprintKey, "actual-card-key");
  } finally { globalThis.fetch = originalFetch; }
});
