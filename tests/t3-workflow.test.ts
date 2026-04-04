import { describe, expect, it } from "vitest";
import type { Event } from "../src/domain/event";
import type { Group } from "../src/domain/group";
import type { Photo } from "../src/domain/photo";
import {
  WorkflowError,
  createGroupEventPhotoLikeWorkflow
} from "../src/application/workflows/group-event-photo-like-workflow";
import type { EventRepository } from "../src/application/ports/event-repository";
import type { GroupRepository } from "../src/application/ports/group-repository";
import type { PhotoLikeRepository } from "../src/application/ports/photo-like-repository";
import type { PhotoRepository } from "../src/application/ports/photo-repository";

describe("T3 group, event, photo, and like workflow", () => {
  it("creates a group, persists it, and returns the saved group", async () => {
    const deps = createDependencies();
    const workflow = createGroupEventPhotoLikeWorkflow(deps);

    const group = await workflow.createGroup({
      id: "group-1",
      name: "Weekend Trip",
      ownerId: "owner-1"
    });

    expect(group).toMatchObject({
      id: "group-1",
      name: "Weekend Trip",
      ownerId: "owner-1"
    });
    expect(deps.groupRepository.groups.get("group-1")).toBe(group);
  });

  it("rejects event creation when the actor is not allowed for the target group", async () => {
    const deps = createDependencies();
    const workflow = createGroupEventPhotoLikeWorkflow(deps);
    await workflow.createGroup({
      id: "group-1",
      name: "Weekend Trip",
      ownerId: "owner-1"
    });

    await expect(
      workflow.createEvent(
        {
          id: "event-1",
          groupId: "group-1",
          title: "Private dinner",
          occurredAt: new Date("2026-01-01T00:00:00.000Z"),
          actorId: "intruder"
        } as never
      )
    ).rejects.toBeInstanceOf(WorkflowError);

    expect(deps.eventRepository.events.size).toBe(0);
  });

  it("rejects photo upload when the caller identity does not match the uploader", async () => {
    const deps = createDependencies();
    const workflow = createGroupEventPhotoLikeWorkflow(deps);
    await workflow.createGroup({
      id: "group-1",
      name: "Weekend Trip",
      ownerId: "owner-1"
    });
    await workflow.createEvent({
      id: "event-1",
      groupId: "group-1",
      title: "Private dinner",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      actorId: "owner-1"
    });

    await expect(
      workflow.createPhoto(
        {
          id: "photo-1",
          eventId: "event-1",
          uploadedByUserId: "uploader-1",
          filename: "dinner.jpg",
          createdAt: new Date("2026-01-01T00:10:00.000Z"),
          actorId: "intruder"
        } as never
      )
    ).rejects.toBeInstanceOf(WorkflowError);

    expect(deps.photoRepository.photos.size).toBe(0);
  });

  it("deduplicates likes through an atomic boundary rather than a read-then-write race", async () => {
    const deps = createDependencies();
    const workflow = createGroupEventPhotoLikeWorkflow(deps);
    await workflow.createGroup({
      id: "group-1",
      name: "Weekend Trip",
      ownerId: "owner-1"
    });
    await workflow.createEvent({
      id: "event-1",
      groupId: "group-1",
      title: "Private dinner",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      actorId: "owner-1"
    });
    await workflow.createPhoto({
      id: "photo-1",
      eventId: "event-1",
      uploadedByUserId: "uploader-1",
      filename: "dinner.jpg",
      createdAt: new Date("2026-01-01T00:10:00.000Z"),
      actorId: "uploader-1"
    });

    const firstLike = workflow.addLike({ photoId: "photo-1", userId: "fan-1" });
    const secondLike = workflow.addLike({ photoId: "photo-1", userId: "fan-1" });

    await Promise.resolve();
    await Promise.resolve();

    await deps.photoLikeRepository.releasePendingRecords();

    await Promise.all([firstLike, secondLike]);

    expect(deps.photoLikeRepository.recordLikeCalls).toBe(1);
    expect(await workflow.getLikeCount("photo-1")).toBe(1);
  });
});

function createDependencies() {
  const groupRepository = new InMemoryGroupRepository();
  const eventRepository = new InMemoryEventRepository();
  const photoRepository = new InMemoryPhotoRepository();
  const photoLikeRepository = new AtomicPhotoLikeRepository();

  return {
    groupRepository,
    eventRepository,
    photoRepository,
    photoLikeRepository
  };
}

class InMemoryGroupRepository implements GroupRepository {
  public readonly groups = new Map<string, Group>();

  async findById(id: string): Promise<Group | null> {
    return this.groups.get(id) ?? null;
  }

  async save(group: Group): Promise<void> {
    this.groups.set(group.id, group);
  }
}

class InMemoryEventRepository implements EventRepository {
  public readonly events = new Map<string, Event>();

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null;
  }

  async findByGroupId(groupId: string): Promise<Event[]> {
    return [...this.events.values()].filter((event) => event.groupId === groupId);
  }

  async save(event: Event): Promise<void> {
    this.events.set(event.id, event);
  }
}

class InMemoryPhotoRepository implements PhotoRepository {
  public readonly photos = new Map<string, Photo>();

  async findById(id: string): Promise<Photo | null> {
    return this.photos.get(id) ?? null;
  }

  async findByEventId(eventId: string): Promise<Photo[]> {
    return [...this.photos.values()].filter((photo) => photo.eventId === eventId);
  }

  async save(photo: Photo): Promise<void> {
    this.photos.set(photo.id, photo);
  }
}

class AtomicPhotoLikeRepository implements PhotoLikeRepository {
  public recordLikeCalls = 0;
  private readonly likes = new Set<string>();
  private readonly pendingKeys = new Set<string>();
  private pendingCommits: Array<() => void> = [];

  async countByPhotoId(photoId: string): Promise<number> {
    return [...this.likes].filter((likeKey) => likeKey.startsWith(`${photoId}:`)).length;
  }

  async addLikeIfAbsent(photoId: string, userId: string): Promise<{ added: boolean; count: number }> {
    const key = this.key(photoId, userId);
    if (this.likes.has(key) || this.pendingKeys.has(key)) {
      return {
        added: false,
        count: await this.countByPhotoId(photoId)
      };
    }

    this.pendingKeys.add(key);
    this.recordLikeCalls += 1;

    await new Promise<void>((resolve) => {
      this.pendingCommits.push(() => {
        this.likes.add(key);
        this.pendingKeys.delete(key);
        resolve();
      });
    });

    return {
      added: true,
      count: await this.countByPhotoId(photoId)
    };
  }

  async releasePendingRecords(): Promise<void> {
    const commits = [...this.pendingCommits];
    this.pendingCommits = [];
    commits.forEach((commit) => commit());
    await Promise.resolve();
  }

  private key(photoId: string, userId: string): string {
    return `${photoId}:${userId}`;
  }
}
