export interface WebhookVerificationInput {
  eventId: string;
  orderId: string;
  status: string;
  occurredAt: Date;
  signature?: string;
}

export interface WebhookVerifier {
  verify(input: WebhookVerificationInput): Promise<void>;
}

export const WebhookVerifier = Symbol("WebhookVerifier");
