import {
  createOrderLifecycleService,
  type OrderLifecycleDependencies,
  type OrderRecord,
  type OrderStatus
} from "./order-lifecycle-service";
import type { ProcessedWebhookEventStore } from "./processed-webhook-event-store";
import type { WebhookVerifier } from "./webhook-verifier";

export interface WebhookEventInput {
  eventId: string;
  orderId: string;
  status: OrderStatus;
  occurredAt: Date;
  signature?: string;
}

export interface OrderWebhookDependencies extends OrderLifecycleDependencies {
  processedEventStore: ProcessedWebhookEventStore;
  webhookVerifier: WebhookVerifier;
}

export interface WebhookProcessingResult {
  duplicate: boolean;
  order: OrderRecord;
}

export function createOrderWebhookProcessor(dependencies: OrderWebhookDependencies) {
  const lifecycle = createOrderLifecycleService(dependencies);

  return {
    async handleWebhook(input: WebhookEventInput): Promise<WebhookProcessingResult> {
      await dependencies.webhookVerifier.verify(input);

      const existing = dependencies.orders.get(input.orderId);

      if (await dependencies.processedEventStore.has(input.eventId)) {
        if (!existing) {
          throw new Error("order not found");
        }

        return {
          duplicate: true,
          order: existing
        };
      }

      let order = existing;
      if (!order) {
        throw new Error("order not found");
      }

      order = await lifecycle.applyRemoteUpdate({
        orderId: input.orderId,
        status: input.status,
        updatedAt: input.occurredAt
      });

      await dependencies.processedEventStore.markProcessed(input.eventId);

      return {
        duplicate: false,
        order
      };
    }
  };
}
