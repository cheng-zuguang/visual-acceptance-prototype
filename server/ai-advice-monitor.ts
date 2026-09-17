import type {
  AiAdviceRejectionCode,
  BatchReviewResult
} from "../src/types";

export const AI_ADVICE_REJECTION_CODES: AiAdviceRejectionCode[] = [
  "ai_timeout",
  "ai_format_error",
  "ai_generation_failed",
  "evidence_integrity_failed"
];

interface TenantAiAdviceCounters {
  attempts: number;
  danglingEvidenceAttempts: number;
  rejections: Record<AiAdviceRejectionCode, number>;
}

interface AiAdviceWindowEvent {
  occurredAtMs: number;
  rejectionCode?: AiAdviceRejectionCode;
  hasDanglingEvidence: boolean;
}

export interface AiAdviceAlertOptions {
  minAttempts?: number;
  timeoutRatio?: number;
  evidenceDanglingRatio?: number;
  now?: () => number;
}

function boundedRatio(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function emptyCounters(): TenantAiAdviceCounters {
  return {
    attempts: 0,
    danglingEvidenceAttempts: 0,
    rejections: Object.fromEntries(
      AI_ADVICE_REJECTION_CODES.map((code) => [code, 0])
    ) as Record<AiAdviceRejectionCode, number>
  };
}

export class AiAdviceMonitor {
  private readonly countersByTenant = new Map<string, TenantAiAdviceCounters>();
  private readonly eventsByTenant = new Map<string, AiAdviceWindowEvent[]>();
  private readonly minAttempts: number;
  private readonly timeoutAlertRatio: number;
  private readonly evidenceDanglingAlertRatio: number;
  private readonly now: () => number;

  constructor(options: AiAdviceAlertOptions = {}) {
    this.minAttempts = typeof options.minAttempts === "number" && Number.isFinite(options.minAttempts)
      ? Math.max(1, Math.floor(options.minAttempts))
      : 20;
    this.timeoutAlertRatio = boundedRatio(options.timeoutRatio, 0.2);
    this.evidenceDanglingAlertRatio = boundedRatio(options.evidenceDanglingRatio, 0.1);
    this.now = options.now ?? Date.now;
  }

  recordBatch(tenantId: string, result: BatchReviewResult): void {
    const counters = this.countersByTenant.get(tenantId) ?? emptyCounters();
    const occurredAtMs = this.now();
    const events = this.recentEvents(tenantId, occurredAtMs);
    for (const page of result.pages) {
      const report = page.report;
      if (!report?.aiAdvice && !report?.aiAdviceRejection) continue;
      counters.attempts += 1;
      events.push({
        occurredAtMs,
        rejectionCode: report.aiAdviceRejection?.code,
        hasDanglingEvidence: Boolean(report.aiAdviceRejection?.danglingRefs.length)
      });
      if (report.aiAdviceRejection) {
        counters.rejections[report.aiAdviceRejection.code] += 1;
        if (report.aiAdviceRejection.danglingRefs.length > 0) {
          counters.danglingEvidenceAttempts += 1;
        }
      }
    }
    this.countersByTenant.set(tenantId, counters);
    this.eventsByTenant.set(tenantId, events);
  }

  prometheus(tenantId: string): string {
    const counters = this.countersByTenant.get(tenantId) ?? emptyCounters();
    const currentTime = this.now();
    const events = this.recentEvents(tenantId, currentTime);
    this.eventsByTenant.set(tenantId, events);
    const windows = this.windows(events, currentTime);
    const ratio = (value: number) => counters.attempts > 0
      ? Number((value / counters.attempts).toFixed(6))
      : 0;
    const timeoutRatio = ratio(counters.rejections.ai_timeout);
    const evidenceDanglingRatio = ratio(counters.danglingEvidenceAttempts);
    const evaluationReady = counters.attempts >= this.minAttempts;
    return [
      "# HELP ai_advice_attempts_total AI advice generation attempts observed in completed page reviews.",
      "# TYPE ai_advice_attempts_total counter",
      `ai_advice_attempts_total ${counters.attempts}`,
      "# HELP ai_advice_rejections_total AI advice rejections partitioned by stable rejection code.",
      "# TYPE ai_advice_rejections_total counter",
      ...AI_ADVICE_REJECTION_CODES.map((code) =>
        `ai_advice_rejections_total{code="${code}"} ${counters.rejections[code]}`
      ),
      "# HELP ai_advice_evidence_dangling_attempts_total AI advice attempts rejected with at least one dangling evidence reference.",
      "# TYPE ai_advice_evidence_dangling_attempts_total counter",
      `ai_advice_evidence_dangling_attempts_total ${counters.danglingEvidenceAttempts}`,
      "# HELP ai_advice_window_attempts AI advice attempts completed inside a fixed recent time window.",
      "# TYPE ai_advice_window_attempts gauge",
      ...windows.map(({ label, events: windowEvents }) =>
        `ai_advice_window_attempts{window="${label}"} ${windowEvents.length}`
      ),
      "# HELP ai_advice_window_rejections AI advice rejections completed inside a fixed recent time window.",
      "# TYPE ai_advice_window_rejections gauge",
      ...windows.flatMap(({ label, events: windowEvents }) =>
        AI_ADVICE_REJECTION_CODES.map((code) =>
          `ai_advice_window_rejections{window="${label}",code="${code}"} ${windowEvents.filter((event) => event.rejectionCode === code).length}`
        )
      ),
      "# HELP ai_advice_window_evidence_dangling_attempts AI advice attempts with dangling evidence inside a fixed recent time window.",
      "# TYPE ai_advice_window_evidence_dangling_attempts gauge",
      ...windows.map(({ label, events: windowEvents }) =>
        `ai_advice_window_evidence_dangling_attempts{window="${label}"} ${windowEvents.filter((event) => event.hasDanglingEvidence).length}`
      ),
      "# HELP ai_advice_timeout_ratio Fraction of completed AI advice attempts rejected by timeout.",
      "# TYPE ai_advice_timeout_ratio gauge",
      `ai_advice_timeout_ratio ${timeoutRatio}`,
      "# HELP ai_advice_evidence_dangling_ratio Fraction of completed AI advice attempts containing at least one dangling evidence reference.",
      "# TYPE ai_advice_evidence_dangling_ratio gauge",
      `ai_advice_evidence_dangling_ratio ${evidenceDanglingRatio}`,
      "# HELP ai_advice_alert_evaluation_ready Whether the tenant has enough completed advice attempts to evaluate alerts.",
      "# TYPE ai_advice_alert_evaluation_ready gauge",
      `ai_advice_alert_evaluation_ready ${evaluationReady ? 1 : 0}`,
      "# HELP ai_advice_alert Whether an AI advice rejection-rate alert is active after the minimum sample gate.",
      "# TYPE ai_advice_alert gauge",
      `ai_advice_alert{type="timeout_rate"} ${evaluationReady && timeoutRatio >= this.timeoutAlertRatio ? 1 : 0}`,
      `ai_advice_alert{type="evidence_dangling_rate"} ${evaluationReady && evidenceDanglingRatio >= this.evidenceDanglingAlertRatio ? 1 : 0}`,
      "# HELP ai_advice_alert_threshold_ratio Configured rejection-rate alert threshold.",
      "# TYPE ai_advice_alert_threshold_ratio gauge",
      `ai_advice_alert_threshold_ratio{type="timeout_rate"} ${this.timeoutAlertRatio}`,
      `ai_advice_alert_threshold_ratio{type="evidence_dangling_rate"} ${this.evidenceDanglingAlertRatio}`,
      "# HELP ai_advice_alert_min_attempts Minimum completed AI advice attempts required before alerts can fire.",
      "# TYPE ai_advice_alert_min_attempts gauge",
      `ai_advice_alert_min_attempts ${this.minAttempts}`,
      ""
    ].join("\n");
  }

  private recentEvents(tenantId: string, currentTime: number): AiAdviceWindowEvent[] {
    const cutoff = currentTime - 15 * 60 * 1000;
    return (this.eventsByTenant.get(tenantId) ?? []).filter((event) => event.occurredAtMs >= cutoff);
  }

  private windows(events: AiAdviceWindowEvent[], currentTime: number): Array<{
    label: "5m" | "15m";
    events: AiAdviceWindowEvent[];
  }> {
    return ([
      { label: "5m", durationMs: 5 * 60 * 1000 },
      { label: "15m", durationMs: 15 * 60 * 1000 }
    ] as const).map(({ label, durationMs }) => ({
      label,
      events: events.filter((event) => event.occurredAtMs >= currentTime - durationMs)
    }));
  }
}
