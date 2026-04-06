import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresPool } from "../src/data/postgres-pool";
import {
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

  beforeAll(async () => {
    await initializePrototypeWorkspaceStore(pool);
    await pool.query("DELETE FROM prototype_photo_likes");
    await pool.query("DELETE FROM prototype_photos");
    await pool.query("DELETE FROM prototype_photo_workflows");
    await pool.query("DELETE FROM prototype_events");
    await pool.query("DELETE FROM prototype_group_memberships");
    await pool.query("DELETE FROM prototype_groups");
    await seedPrototypeWorkspaceStore(pool);
  });

  afterAll(async () => {
    await pool.query("DELETE FROM prototype_photo_likes");
    await pool.query("DELETE FROM prototype_photos");
    await pool.query("DELETE FROM prototype_photo_workflows");
    await pool.query("DELETE FROM prototype_events");
    await pool.query("DELETE FROM prototype_group_memberships");
    await pool.query("DELETE FROM prototype_groups");
    await pool.end();
  });

  it("serves the seeded workspace snapshot through the app boundary", async () => {
    const app = await buildApp({
      prototypeWorkspaceSnapshotLoader: createPrototypeWorkspaceSnapshotLoader(pool),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/workspace",
    });

    expect(response.statusCode).toBe(200);

    const payload = response.json();
    expect(payload.workspace.groupSummary.totalGroups).toBe(2);
    expect(payload.workspace.groupSummary.totalMembers).toBe(7);
    expect(payload.workspace.groups[0]?.name).toBe("Han family");
    expect(payload.workspace.events[0]?.name).toBe("First birthday album");
  });

  it("recomputes candidate review and order summaries after photo and like writes", async () => {
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
});
