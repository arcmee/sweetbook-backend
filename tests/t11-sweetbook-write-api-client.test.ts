import { describe, expect, it, vi } from "vitest";

import { createSweetBookWriteApiClient } from "../src/data/sweetbook-write-api-client";

describe("SweetBook write api client", () => {
  it("creates a book with a JSON body and idempotency header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Book created",
        data: {
          bookUid: "bk_123",
        },
      }),
    });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.createBook({
      title: "SweetBook Prototype",
      bookSpecUid: "SQUAREBOOK_HC",
      idempotencyKey: "book-create-1",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
          "Idempotency-Key": "book-create-1",
        }),
        body: JSON.stringify({
          title: "SweetBook Prototype",
          bookSpecUid: "SQUAREBOOK_HC",
        }),
      }),
    );
    expect(result.bookUid).toBe("bk_123");
  });

  it("finalizes a book and returns the finalized page count", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Book finalized",
        data: {
          result: "completed",
          pageCount: 24,
          finalizedAt: "2026-04-06T00:00:00.000Z",
        },
      }),
    });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const result = await client.finalizeBook({
      bookUid: "bk_123",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-sandbox.sweetbook.com/v1/books/bk_123/finalization",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result.pageCount).toBe(24);
  });

  it("submits an order estimate and an order with idempotency support", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Estimate created",
          data: {
            estimateId: "est_1",
            totalAmount: 100,
            currency: "KRW",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Order created",
          data: {
            orderUid: "ord_1",
            orderStatus: "PAID",
          },
        }),
      });

    const client = createSweetBookWriteApiClient(
      {
        apiKey: "test-key",
        baseUrl: "https://api-sandbox.sweetbook.com/v1",
        environment: "sandbox",
      },
      fetchImpl as typeof fetch,
    );

    const estimate = await client.estimateOrder({
      bookUid: "bk_123",
      quantity: 1,
    });
    const order = await client.submitOrder({
      bookUid: "bk_123",
      quantity: 1,
      idempotencyKey: "order-1",
    });

    expect(estimate.estimateId).toBe("est_1");
    expect(order.orderUid).toBe("ord_1");
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api-sandbox.sweetbook.com/v1/orders",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "order-1",
        }),
      }),
    );
  });
});
