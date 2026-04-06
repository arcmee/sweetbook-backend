import { describe, expect, it, vi } from "vitest";

import {
  createPrototypeSweetBookEstimateRunner,
  createPrototypeSweetBookSubmitRunner,
} from "../src/application/prototype-sweetbook-estimate";
import type { SweetBookReadClient } from "../src/application/ports/sweetbook-read-client";
import type { SweetBookClient } from "../src/application/ports/sweetbook-client";

describe("prototype SweetBook estimate runner", () => {
  it("returns blocked status when credits are insufficient", async () => {
    const readClient = {} as SweetBookReadClient;
    const writeClient: SweetBookClient = {
      createBook: vi.fn(async () => ({ bookUid: "bk_123" })),
      uploadCover: vi.fn(async () => ({ result: "inserted" })),
      uploadPhoto: vi.fn(async () => ({
        fileName: "photo-1.jpg",
        originalName: "photo-1.bmp",
        size: 100,
        mimeType: "image/jpeg",
        uploadedAt: "2026-04-06T00:00:00.000Z",
        isDuplicate: false,
        hash: "hash-1",
      })),
      uploadContents: vi
        .fn()
        .mockResolvedValueOnce({
          result: "inserted",
          breakBefore: "page",
          pageNum: 1,
          pageSide: "right",
          pageCount: 0,
        })
        .mockResolvedValueOnce({
          result: "inserted",
          breakBefore: "page",
          pageNum: 2,
          pageSide: "left",
          pageCount: 24,
        }),
      finalizeBook: vi.fn(async () => ({
        result: "completed",
        pageCount: 24,
        finalizedAt: "2026-04-06T00:00:00.000Z",
      })),
      estimateOrder: vi.fn(async () => ({
        items: [
          {
            bookUid: "bk_123",
            quantity: 1,
          },
        ],
        totalAmount: 3100,
        paidCreditAmount: 3410,
        creditBalance: 2590,
        creditSufficient: false,
        currency: "KRW",
      })),
      submitOrder: vi.fn(async () => ({
        orderUid: "ord_1",
        orderStatus: 20,
      })),
    };

    const runEstimate = createPrototypeSweetBookEstimateRunner({
      readClient,
      writeClient,
      now: () => 1,
    });

    const result = await runEstimate();

    expect(result.status).toBe("blocked_insufficient_credit");
    expect(result.pageCount).toBe(24);
    expect(result.estimate.creditSufficient).toBe(false);
    expect(writeClient.submitOrder).not.toHaveBeenCalled();
  });

  it("submits the order when estimate credits are sufficient", async () => {
    const readClient = {} as SweetBookReadClient;
    const writeClient: SweetBookClient = {
      createBook: vi.fn(async () => ({ bookUid: "bk_123" })),
      uploadCover: vi.fn(async () => ({ result: "inserted" })),
      uploadPhoto: vi.fn(async () => ({
        fileName: "photo-1.jpg",
        originalName: "photo-1.bmp",
        size: 100,
        mimeType: "image/jpeg",
        uploadedAt: "2026-04-06T00:00:00.000Z",
        isDuplicate: false,
        hash: "hash-1",
      })),
      uploadContents: vi
        .fn()
        .mockResolvedValueOnce({
          result: "inserted",
          breakBefore: "page",
          pageNum: 1,
          pageSide: "right",
          pageCount: 0,
        })
        .mockResolvedValueOnce({
          result: "inserted",
          breakBefore: "page",
          pageNum: 2,
          pageSide: "left",
          pageCount: 24,
        }),
      finalizeBook: vi.fn(async () => ({
        result: "completed",
        pageCount: 24,
        finalizedAt: "2026-04-06T00:00:00.000Z",
      })),
      estimateOrder: vi.fn(async () => ({
        items: [
          {
            bookUid: "bk_123",
            quantity: 1,
          },
        ],
        totalAmount: 3100,
        paidCreditAmount: 3100,
        creditBalance: 5000,
        creditSufficient: true,
        currency: "KRW",
      })),
      submitOrder: vi.fn(async () => ({
        orderUid: "ord_1",
        orderStatus: 20,
        orderStatusDisplay: "결제완료",
      })),
    };

    const runSubmit = createPrototypeSweetBookSubmitRunner({
      readClient,
      writeClient,
      now: () => 1,
    });

    const result = await runSubmit();

    expect(result.status).toBe("submitted");
    expect(result.order.orderUid).toBe("ord_1");
    expect(writeClient.submitOrder).toHaveBeenCalledTimes(1);
  });
});
