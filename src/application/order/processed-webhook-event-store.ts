export interface ProcessedWebhookEventStore {
  has(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export const ProcessedWebhookEventStore = Symbol("ProcessedWebhookEventStore");
