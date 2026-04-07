import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresPool } from "../src/data/postgres-pool";
import {
  createPrototypeEventCreator,
  createPrototypeEventVotingCloser,
  createPrototypeEventVotingExtender,
  createPrototypePhotoCreator,
  createPrototypePhotoLikeAdder,
  createPrototypeWorkspaceSnapshotLoader,
  initializePrototypeWorkspaceStore,
  seedPrototypeWorkspaceStore,
} from "../src/data/prototype-workspace-postgres-store";
import { buildApp } from "../src/presentation/app";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://sweetbook:sweetbook@localhost:5432/sweetbook";

describe("prototype workspace postgres integration", () => {
  const pool = createPostgresPool({ databaseUrl });
  let databaseReady = true;

  beforeAll(async () => {
    try {
      await initializePrototypeWorkspaceStore(pool);
      await pool.query("DELETE FROM prototype_photo_likes");
      await pool.query("DELETE FROM prototype_photos");
      await pool.query("DELETE FROM prototype_photo_workflows");
      await pool.query("DELETE FROM prototype_events");
      await pool.query("DELETE FROM prototype_group_invitations");
      await pool.query("DELETE FROM prototype_group_memberships");
      await pool.query("DELETE FROM prototype_groups");
      await seedPrototypeWorkspaceStore(pool);
    } catch {
      databaseReady = false;
    }
  });

  afterAll(async () => {
    if (databaseReady) {
      await pool.query("DELETE FROM prototype_photo_likes");
      await pool.query("DELETE FROM prototype_photos");
      await pool.query("DELETE FROM prototype_photo_workflows");
      await pool.query("DELETE FROM prototype_events");
      await pool.query("DELETE FROM prototype_group_invitations");
      await pool.query("DELETE FROM prototype_group_memberships");
      await pool.query("DELETE FROM prototype_groups");
    }
    await pool.end();
  });

  it("serves the seeded workspace snapshot through the app boundary", async () => {
    if (!databaseReady) {
      return;
    }

    const app = await buildApp({
      prototypeWorkspaceSnapshotLoader: createPrototypeWorkspaceSnapshotLoader(pool),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/workspace",
    });

    expect(response.statusCode).toBe(200);

    const payload = response.json();
    expect(payload.workspace.groupSummary.totalGroups).toBe(3);
    expect(payload.workspace.groupSummary.totalMembers).toBe(8);
    expect(payload.workspace.groups[0]?.name).toBe("Han family");
    expect(payload.workspace.events[0]?.name).toBe("First birthday album");
    expect(payload.pendingInvitations[0]?.groupName).toBe("Kim family moments");
  });

  it("recomputes candidate review and order summaries after photo and like writes", async () => {
    if (!databaseReady) {
      return;
    }

    const createPhoto = createPrototypePhotoCreator(pool);
    const addLike = createPrototypePhotoLikeAdder(pool);
    const loadSnapshot = createPrototypeWorkspaceSnapshotLoader(pool);

    await createPhoto({
      eventId: "event-holiday",
      caption: "Balloon arch",
    });
    await addLike({
      photoId: "photo-created-5",
      userId: "user-demo",
    });

    const snapshot = await loadSnapshot();
    const holidayReview = snapshot.candidateReviews.find(
      (review) => review.activeEventId === "event-holiday",
    );
    const holidayOrderEntry = snapshot.orderEntries.find(
      (entry) => entry.activeEventId === "event-holiday",
    );

    expect(holidayReview?.candidates.some((candidate) => candidate.caption === "Balloon arch")).toBe(
      true,
    );
    expect(
      holidayOrderEntry?.selectedCandidateCount,
    ).toBe(holidayReview?.candidates.length);
    expect(holidayReview?.pagePreview[0]?.title).toBe("Cover preview");
  });

  it("keeps event lifecycle fields consistent across create, close, and extend actions", async () => {
    if (!databaseReady) {
      return;
    }

    const createEvent = createPrototypeEventCreator(pool);
    const closeVoting = createPrototypeEventVotingCloser(pool);
    const extendVoting = createPrototypeEventVotingExtender(pool);
    const loadSnapshot = createPrototypeWorkspaceSnapshotLoader(pool);

    await createEvent({
      groupId: "group-han",
      title: "Spring family book",
      description: "Collect the best spring moments before the family vote opens.",
      votingStartsAt: "2026-04-20T09:00:00.000Z",
      votingEndsAt: "2026-04-27T09:00:00.000Z",
    });

    let snapshot = await loadSnapshot();
    let createdEvent = snapshot.workspace.events.find(
      (event) => event.name === "Spring family book",
    );

    expect(createdEvent?.status).toBe("draft");
    expect(createdEvent?.canVote).toBe(false);
    expect(createdEvent?.canOwnerSelectPhotos).toBe(false);
    expect(createdEvent?.operationSummary.stage).toBe("setup");

    if (!createdEvent?.id) {
      throw new Error("Expected created event to exist");
    }

    await closeVoting({
      eventId: createdEvent.id,
    });

    snapshot = await loadSnapshot();
    createdEvent = snapshot.workspace.events.find((event) => event.id === createdEvent?.id);

    expect(createdEvent?.status).toBe("ready");
    expect(createdEvent?.canVote).toBe(false);
    expect(createdEvent?.canOwnerSelectPhotos).toBe(true);
    expect(createdEvent?.operationSummary.stage).toBe("owner_review");

    await extendVoting({
      eventId: createdEvent.id,
      votingEndsAt: "2026-05-01T09:00:00.000Z",
    });

    snapshot = await loadSnapshot();
    createdEvent = snapshot.workspace.events.find((event) => event.id === createdEvent?.id);

    expect(createdEvent?.status).toBe("draft");
    expect(createdEvent?.canVote).toBe(false);
    expect(createdEvent?.canOwnerSelectPhotos).toBe(false);
    expect(createdEvent?.operationSummary.stage).toBe("setup");
  });
});
