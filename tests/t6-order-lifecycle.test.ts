import { describe, expect, it } from "vitest";

describe("T6 order lifecycle and webhook handling", () => {
  it("stores an order aggregate from SweetBook integration output", async () => {
    const { createOrderLifecycleService } = await import(
      "../src/application/order/order-lifecycle-service"
    );

    const service = createOrderLifecycleService(createInMemoryOrderDependencies());

    const order = await service.createOrder({
      orderId: "order-1",
      quoteId: "quote-1",
      finalizationId: "final-1",
      status: "pending"
    });

    expect(order).toEqual({
      orderId: "order-1",
      quoteId: "quote-1",
      finalizationId: "final-1",
      status: "pending",
      version: 1
    });
  });

  it("applies a valid remote status progression and ignores stale updates", async () => {
    const { createOrderLifecycleService } = await import(
      "../src/application/order/order-lifecycle-service"
    );

    const service = createOrderLifecycleService(createInMemoryOrderDependencies());

    await service.createOrder({
      orderId: "order-1",
      quoteId: "quote-1",
      finalizationId: "final-1",
      status: "pending"
    });

    const progressed = await service.applyRemoteUpdate({
      orderId: "order-1",
      status: "confirmed",
      updatedAt: new Date("2026-02-01T10:00:00.000Z")
    });

    expect(progressed.status).toBe("confirmed");

    const stale = await service.applyRemoteUpdate({
      orderId: "order-1",
      status: "pending",
      updatedAt: new Date("2026-02-01T09:59:00.000Z")
    });

    expect(stale.status).toBe("confirmed");

    const semanticallyStale = await service.applyRemoteUpdate({
      orderId: "order-1",
      status: "pending",
      updatedAt: new Date("2026-02-01T10:01:00.000Z")
    });

    expect(semanticallyStale.status).toBe("confirmed");
  });

  it("processes the same webhook event twice without duplicating state changes", async () => {
    const { createOrderWebhookProcessor } = await import(
      "../src/application/order/order-webhook-processor"
    );

    const processor = createOrderWebhookProcessor(createInMemoryOrderDependencies());

    await expect(
      processor.handleWebhook({
        eventId: "evt-unverified",
        orderId: "order-1",
        status: "confirmed",
        occurredAt: new Date("2026-02-01T09:59:00.000Z"),
        verified: false
      } as never)
    ).rejects.toThrow();

    await expect(
      processor.handleWebhook({
        eventId: "evt-missing-order",
        orderId: "order-1",
        status: "confirmed",
        occurredAt: new Date("2026-02-01T10:00:00.000Z"),
        verified: true
      } as never)
    ).rejects.toThrow();

    const seededDependencies = createInMemoryOrderDependencies();
    seededDependencies.orders.set("order-1", {
      orderId: "order-1",
      quoteId: "quote-1",
      finalizationId: "final-1",
      status: "pending",
      version: 1
    });
    const seededProcessor = createOrderWebhookProcessor(seededDependencies);

    await seededProcessor.handleWebhook({
      eventId: "evt-1",
      orderId: "order-1",
      status: "confirmed",
      occurredAt: new Date("2026-02-01T10:00:00.000Z"),
      verified: true
    });

    const second = await seededProcessor.handleWebhook({
      eventId: "evt-1",
      orderId: "order-1",
      status: "confirmed",
      occurredAt: new Date("2026-02-01T10:00:00.000Z"),
      verified: true
    });

    expect(second.duplicate).toBe(true);
    expect(second.order.status).toBe("confirmed");
    expect(second.order.version).toBe(2);
  });
});

function createInMemoryOrderDependencies() {
  return {
    orders: new Map<string, { orderId: string; quoteId: string; finalizationId: string; status: string; version: number; updatedAt?: Date }>(),
    processedEvents: new Set<string>()
  };
}
