import { createHmac } from "node:crypto";

export type ReviewWebhookEventType = "review.completed" | "review.failed" | "review.cancelled";

export interface ReviewWebhookEvent {
  eventId: string;
  eventType: ReviewWebhookEventType;
  occurredAt: string;
  reviewId: string;
  status: "succeeded" | "failed" | "cancelled";
  verdict?: "passed" | "failed" | "needs_review";
  resultUrl: string;
}

export interface WebhookDeliveryRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface WebhookDeliveryResult {
  status: "delivered" | "failed";
  attempts: number;
  lastStatus?: number;
  lastError?: string;
}

export async function deliverSignedWebhook(input: {
  url: string;
  secret: string;
  event: ReviewWebhookEvent;
  maxAttempts: number;
  initialDelayMs: number;
  now: () => Date;
  send: (request: WebhookDeliveryRequest) => Promise<{ status: number }>;
  sleep: (delayMs: number) => Promise<void>;
  beforeAttempt?: () => Promise<void>;
  onAttempt?: (attempt: number, result: { status?: number; error?: string }) => void;
}): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(input.event);
  let lastStatus: number | undefined;
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= input.maxAttempts; attempt += 1) {
    if (attempt > 1) await input.sleep(input.initialDelayMs * (2 ** (attempt - 2)));
    try {
      await input.beforeAttempt?.();
      const timestamp = Math.floor(input.now().getTime() / 1000).toString();
      const signature = createHmac("sha256", input.secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");
      const response = await input.send({
        url: input.url,
        headers: {
          "content-type": "application/json",
          "x-difflab-event-id": input.event.eventId,
          "x-difflab-timestamp": timestamp,
          "x-difflab-signature": `v1=${signature}`
        },
        body
      });
      lastStatus = response.status;
      input.onAttempt?.(attempt, { status: response.status });
      if (response.status >= 200 && response.status < 300) {
        return { status: "delivered", attempts: attempt, lastStatus: response.status };
      }
      lastError = `Webhook endpoint returned HTTP ${response.status}.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      input.onAttempt?.(attempt, { error: lastError });
    }
  }
  return {
    status: "failed",
    attempts: input.maxAttempts,
    ...(lastStatus !== undefined ? { lastStatus } : {}),
    ...(lastError ? { lastError } : {})
  };
}
