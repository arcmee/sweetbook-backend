import { Blob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";

import {
  createSweetBookOrchestrationService,
  SweetBookInsufficientCreditError,
} from "../src/application/sweetbook-orchestration-service";
import type { SweetBookClient } from "../src/application/ports/sweetbook-client";

describe("SweetBook orchestration service", () => {
  it("runs the SweetBook workflow in the expected order and aggregates results", async () => {
    const events: string[] = [];

    const client: SweetBookClient = {
      createBook: vi.fn(async () => {
        events.push("createBook");
        return { bookUid: "bk_123" };
      }),
      uploadCover: vi.fn(async () => {
        events.push("uploadCover");
        return { result: "inserted" };
      }),
      uploadPhoto: vi.fn(async () => {
        events.push("uploadPhoto");
        return {
          fileName: `uploaded-${events.filter((item) => item === "uploadPhoto").length}.jpg`,
          originalName: "photo.jpg",
          size: 12,
          mimeType: "image/jpeg",
          uploadedAt: "2026-04-06T00:00:00.000Z",
          isDuplicate: false,
          hash: "hash-1",
        };
      }),
      uploadContents: vi.fn(async () => {
        events.push("uploadContents");
        return {
          result: "inserted",
          breakBefore: "page",
          pageNum: 1,
          pageSide: "right",
          pageCount: 2,
        };
      }),
      finalizeBook: vi.fn(async () => {
        events.push("finalizeBook");
        return {
          result: "completed",
          pageCount: 24,
          finalizedAt: "2026-04-06T00:00:00.000Z",
        };
      }),
      estimateOrder: vi.fn(async () => {
        events.push("estimateOrder");
        return {
          items: [
            {
              bookUid: "bk_123",
              quantity: 1,
            },
          ],
          totalAmount: 100,
          currency: "KRW",
        };
      }),
      submitOrder: vi.fn(async () => {
        events.push("submitOrder");
        return {
          orderUid: "ord_1",
          orderStatus: "PAID",
        };
      }),
    };

    const service = createSweetBookOrchestrationService({ sweetBookClient: client });
    const result = await service.publishAlbumProject({
      albumTitle: "SweetBook Prototype",
      bookSpecUid: "SQUAREBOOK_HC",
      quantity: 1,
      shipping: {
        recipientName: "SweetBook Tester",
        recipientPhone: "010-1234-5678",
        postalCode: "06236",
        address1: "Seoul Test Road 123",
        address2: "Suite 4",
      },
      cover: {
        templateUid: "tmpl-cover",
        parameters: {
          title: "SweetBook Prototype",
        },
        frontPhoto: {
          fileName: "front.jpg",
          contentType: "image/jpeg",
          bytes: new Blob(["front"]),
        },
      },
      photos: [
        {
          fileName: "photo-1.jpg",
          contentType: "image/jpeg",
          bytes: new Blob(["photo-1"]),
        },
        {
          fileName: "photo-2.jpg",
          contentType: "image/jpeg",
          bytes: new Blob(["photo-2"]),
        },
      ],
      contents: [
        {
          templateUid: "tmpl-content",
          breakBefore: "page",
          parameters: {
            childName: "Mina",
          },
        },
      ],
      idempotency: {
        createBook: "book-1",
        submitOrder: "order-1",
      },
    });

    expect(events).toEqual([
      "createBook",
      "uploadCover",
      "uploadPhoto",
      "uploadPhoto",
      "uploadContents",
      "finalizeBook",
      "estimateOrder",
      "submitOrder",
    ]);
    expect(result.bookUid).toBe("bk_123");
    expect(result.uploadedPhotos).toHaveLength(2);
    expect(result.order.orderUid).toBe("ord_1");
  });

  it("stops before submitOrder when the estimate reports insufficient credit", async () => {
    const events: string[] = [];

    const client: SweetBookClient = {
      createBook: vi.fn(async () => {
        events.push("createBook");
        return { bookUid: "bk_123" };
      }),
      uploadCover: vi.fn(async () => {
        events.push("uploadCover");
        return { result: "inserted" };
      }),
      uploadPhoto: vi.fn(async () => {
        events.push("uploadPhoto");
        return {
          fileName: "uploaded-1.jpg",
          originalName: "photo.jpg",
          size: 12,
          mimeType: "image/jpeg",
          uploadedAt: "2026-04-06T00:00:00.000Z",
          isDuplicate: false,
          hash: "hash-1",
        };
      }),
      uploadContents: vi.fn(async () => {
        events.push("uploadContents");
        return {
          result: "inserted",
          breakBefore: "page",
          pageNum: 1,
          pageSide: "right",
          pageCount: 24,
        };
      }),
      finalizeBook: vi.fn(async () => {
        events.push("finalizeBook");
        return {
          result: "completed",
          pageCount: 24,
          finalizedAt: "2026-04-06T00:00:00.000Z",
        };
      }),
      estimateOrder: vi.fn(async () => {
        events.push("estimateOrder");
        return {
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
        };
      }),
      submitOrder: vi.fn(async () => {
        events.push("submitOrder");
        return {
          orderUid: "ord_1",
          orderStatus: 20,
        };
      }),
    };

    const service = createSweetBookOrchestrationService({ sweetBookClient: client });

    await expect(
      service.publishAlbumProject({
        albumTitle: "SweetBook Prototype",
        bookSpecUid: "SQUAREBOOK_HC",
        quantity: 1,
        shipping: {
          recipientName: "SweetBook Tester",
          recipientPhone: "010-1234-5678",
          postalCode: "06236",
          address1: "Seoul Test Road 123",
          address2: "Suite 4",
        },
        cover: {
          templateUid: "tmpl-cover",
          parameters: {
            title: "SweetBook Prototype",
          },
          frontPhoto: {
            fileName: "front.jpg",
            contentType: "image/jpeg",
            bytes: new Blob(["front"]),
          },
        },
        photos: [
          {
            fileName: "photo-1.jpg",
            contentType: "image/jpeg",
            bytes: new Blob(["photo-1"]),
          },
        ],
        contents: [
          {
            templateUid: "tmpl-content",
            breakBefore: "page",
            parameters: {
              childName: "Mina",
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(SweetBookInsufficientCreditError);

    expect(events).toEqual([
      "createBook",
      "uploadCover",
      "uploadPhoto",
      "uploadContents",
      "finalizeBook",
      "estimateOrder",
    ]);
    expect(client.submitOrder).not.toHaveBeenCalled();
  });
});
