import { describe, expect, it } from "vitest";
import type { Photo } from "../src/domain/photo";
import type { PhotoLikeRepository } from "../src/application/ports/photo-like-repository";
import type { PhotoRepository } from "../src/application/ports/photo-repository";

describe("T4 album selection engine", () => {
  it("ranks photos by like count with deterministic tie-breaking", async () => {
    const { createAlbumSelectionEngine } = await import(
      "../src/application/selection/album-selection-engine"
    );
    const engine = createAlbumSelectionEngine(createDependencies());

    const result = await engine.selectForEvent({
      eventId: "event-1",
      selectionSize: 3,
      pageSize: 2
    });

    expect(result.selectedPhotos.map((photo) => photo.photoId)).toEqual([
      "photo-b",
      "photo-a",
      "photo-c"
    ]);
  });

  it("selects only the top N photos from the ranked set", async () => {
    const { createAlbumSelectionEngine } = await import(
      "../src/application/selection/album-selection-engine"
    );
    const engine = createAlbumSelectionEngine(createDependencies());

    const result = await engine.selectForEvent({
      eventId: "event-1",
      selectionSize: 2,
      pageSize: 2
    });

    expect(result.selectedPhotos.map((photo) => photo.photoId)).toEqual(["photo-b", "photo-a"]);
  });

  it("generates deterministic page candidates from the selected order", async () => {
    const { createAlbumSelectionEngine } = await import(
      "../src/application/selection/album-selection-engine"
    );
    const engine = createAlbumSelectionEngine(createDependencies());

    const result = await engine.selectForEvent({
      eventId: "event-1",
      selectionSize: 3,
      pageSize: 2
    });

    expect(result.pageCandidates).toEqual([
      {
        pageNumber: 1,
        photoIds: ["photo-b", "photo-a"]
      },
      {
        pageNumber: 2,
        photoIds: ["photo-c"]
      }
    ]);
  });

  it("rejects a non-positive selection size", async () => {
    const { AlbumSelectionError, createAlbumSelectionEngine } = await import(
      "../src/application/selection/album-selection-engine"
    );
    const engine = createAlbumSelectionEngine(createDependencies());

    await expect(
      engine.selectForEvent({
        eventId: "event-1",
        selectionSize: 0,
        pageSize: 2
      })
    ).rejects.toBeInstanceOf(AlbumSelectionError);
  });

  it("rejects a non-positive page size", async () => {
    const { AlbumSelectionError, createAlbumSelectionEngine } = await import(
      "../src/application/selection/album-selection-engine"
    );
    const engine = createAlbumSelectionEngine(createDependencies());

    await expect(
      engine.selectForEvent({
        eventId: "event-1",
        selectionSize: 2,
        pageSize: 0
      })
    ).rejects.toBeInstanceOf(AlbumSelectionError);
  });
});

function createDependencies() {
  const photos = new Map<string, Photo>([
    [
      "photo-a",
      {
        id: "photo-a",
        eventId: "event-1",
        uploadedByUserId: "uploader-1",
        filename: "a.jpg",
        createdAt: new Date("2026-01-01T10:00:00.000Z")
      }
    ],
    [
      "photo-b",
      {
        id: "photo-b",
        eventId: "event-1",
        uploadedByUserId: "uploader-2",
        filename: "b.jpg",
        createdAt: new Date("2026-01-01T09:00:00.000Z")
      }
    ],
    [
      "photo-c",
      {
        id: "photo-c",
        eventId: "event-1",
        uploadedByUserId: "uploader-3",
        filename: "c.jpg",
        createdAt: new Date("2026-01-01T11:00:00.000Z")
      }
    ],
    [
      "photo-d",
      {
        id: "photo-d",
        eventId: "event-2",
        uploadedByUserId: "uploader-4",
        filename: "d.jpg",
        createdAt: new Date("2026-01-01T12:00:00.000Z")
      }
    ]
  ]);

  const likes = new Map<string, number>([
    ["photo-a", 5],
    ["photo-b", 5],
    ["photo-c", 2],
    ["photo-d", 10]
  ]);

  const photoRepository: PhotoRepository = {
    async findById(id: string) {
      return photos.get(id) ?? null;
    },
    async findByEventId(eventId: string) {
      return [...photos.values()].filter((photo) => photo.eventId === eventId);
    },
    async save() {
      throw new Error("not implemented in test");
    }
  };

  const photoLikeRepository: PhotoLikeRepository = {
    async countByPhotoId(photoId: string) {
      return likes.get(photoId) ?? 0;
    },
    async addLikeIfAbsent() {
      throw new Error("not implemented in test");
    }
  };

  return {
    photoRepository,
    photoLikeRepository
  };
}
