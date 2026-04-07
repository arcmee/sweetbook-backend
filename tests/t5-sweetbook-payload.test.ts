import { describe, expect, it } from "vitest";

describe("T5 SweetBook payload and API adapter", () => {
  it("maps the T4 selection result into a SweetBook payload while preserving page order", async () => {
    const { mapSelectionToSweetBookPayload } = await import(
      "../src/application/payload/sweetbook-payload-mapper"
    );

    const payload = mapSelectionToSweetBookPayload({
      albumTitle: "Weekend Trip",
      selection: {
        selectedPhotos: [
          { photoId: "photo-b", likeCount: 5 },
          { photoId: "photo-a", likeCount: 5 },
          { photoId: "photo-c", likeCount: 2 }
        ],
        pageCandidates: [
          { pageNumber: 1, photoIds: ["photo-b", "photo-a"] },
          { pageNumber: 2, photoIds: ["photo-c"] }
        ]
      }
    });

    expect(payload).toEqual({
      albumTitle: "Weekend Trip",
      selectedPhotos: [
        { photoId: "photo-b", likeCount: 5 },
        { photoId: "photo-a", likeCount: 5 },
        { photoId: "photo-c", likeCount: 2 }
      ],
      pages: [
        {
          pageNumber: 1,
          photoIds: ["photo-b", "photo-a"]
        },
        {
          pageNumber: 2,
          photoIds: ["photo-c"]
        }
      ]
    });
  });

  it("maps persisted planner selection into a SweetBook handoff payload", async () => {
    const { mapPlannerSelectionToSweetBookPayload } = await import(
      "../src/application/payload/sweetbook-payload-mapper"
    );

    const payload = mapPlannerSelectionToSweetBookPayload({
      albumTitle: "First birthday album SweetBook Draft",
      selection: {
        selectedPhotos: [
          { photoId: "photo-cake", caption: "Cake table setup", assetFileName: "cake.png" },
          { photoId: "photo-family", caption: "Family portrait", assetFileName: "family.png" },
          { photoId: "photo-gift", caption: "Gift opening moment", assetFileName: "gift.png" }
        ],
        coverPhotoId: "photo-family",
        pageLayouts: {
          cover: "Full-bleed cover",
          "spread-1": "Balanced two-photo spread"
        },
        pageNotes: {
          cover: "Lead with the family portrait on the cover.",
          "spread-1": "Balance the milestone moment with reactions."
        }
      }
    });

    expect(payload).toEqual({
      albumTitle: "First birthday album SweetBook Draft",
      coverPhotoId: "photo-family",
      selectedPhotos: [
        { photoId: "photo-cake", caption: "Cake table setup", assetFileName: "cake.png" },
        { photoId: "photo-family", caption: "Family portrait", assetFileName: "family.png" },
        { photoId: "photo-gift", caption: "Gift opening moment", assetFileName: "gift.png" }
      ],
      pages: [
        {
          pageId: "cover",
          layout: "Full-bleed cover",
          note: "Lead with the family portrait on the cover.",
          photoIds: ["photo-family"]
        },
        {
          pageId: "spread-1",
          layout: "Balanced two-photo spread",
          note: "Balance the milestone moment with reactions.",
          photoIds: ["photo-cake", "photo-gift"]
        }
      ]
    });
  });

  it("exposes SweetBook client adapter boundaries for book creation, finalization, estimate, and order submission", async () => {
    const module = await import("../src/application/ports/sweetbook-client");

    expect(module).toHaveProperty("SweetBookClient");
    expect(module).toHaveProperty("SweetBookBookCreationResult");
    expect(module).toHaveProperty("SweetBookFinalizeResult");
    expect(module).toHaveProperty("SweetBookOrderEstimateResult");
    expect(module).toHaveProperty("SweetBookOrderResult");
  });

  it("translates a SweetBook response into an internal adapter result shape", async () => {
    const { translateSweetBookResponse } = await import(
      "../src/data/sweetbook-response-translator"
    );

    const result = translateSweetBookResponse({
      quoteId: "quote-1",
      finalizationId: "final-1",
      orderId: "order-1",
      status: "accepted"
    });

    expect(result).toEqual({
      quoteId: "quote-1",
      finalizationId: "final-1",
      orderId: "order-1",
      status: "accepted"
    });
  });
});
