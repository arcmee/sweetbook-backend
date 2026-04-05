import {
  createOrderLifecycleService,
  type OrderLifecycleDependencies,
  type OrderRecord,
  type OrderStatus
} from "./order-lifecycle-service";

export interface WebhookEventInput {
  eventId: string;
  orderId: string;
  status: OrderStatus;
  occurredAt: Date;
  verified: boolean;
}

export interface OrderWebhookDependencies extends OrderLifecycleDependencies {
  processedEvents: Set<string>;
}

export interface WebhookProcessingResult {
  duplicate: boolean;
  order: OrderRecord;
}

export function createOrderWebhookProcessor(dependencies: OrderWebhookDependencies) {
  const lifecycle = createOrderLifecycleService(dependencies);

  return {
    async handleWebhook(input: WebhookEventInput): Promise<WebhookProcessingResult> {
      if (!input.verified) {
        throw new Error("webhook not verified");
      }

      const existing = dependencies.orders.get(input.orderId);

      if (dependencies.processedEvents.has(input.eventId)) {
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

      dependencies.processedEvents.add(input.eventId);

      return {
        duplicate: false,
        order
      };
    }
  };
}
