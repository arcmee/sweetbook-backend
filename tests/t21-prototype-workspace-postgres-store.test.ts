import { describe, expect, it, vi } from "vitest";

import {
  createPrototypePhotoCreator,
  createPrototypePhotoLikeAdder,
  createPrototypeWorkspaceSnapshotLoader,
  initializePrototypeWorkspaceStore,
  seedPrototypeWorkspaceStore,
} from "../src/data/prototype-workspace-postgres-store";

describe("prototype workspace postgres store", () => {
  it("initializes and seeds the prototype workspace tables", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await initializePrototypeWorkspaceStore({ query });
    await seedPrototypeWorkspaceStore({ query });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS prototype_groups"),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO prototype_groups"),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO prototype_events"),
    );
  });

  it("loads the workspace snapshot from postgres rows", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: "group-han",
            name: "Han family",
            member_count: "4",
            viewer_role: "Owner",
            event_count: "1",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "event-birthday",
            name: "First birthday album",
            group_name: "Han family",
            status: "collecting",
            photo_count: "124",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            total_memberships: "4",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            active_event_id: "event-birthday",
            active_event_name: "First birthday album",
            pending_count: "3",
            uploaded_count: "124",
            helper_text: "Upload queue is local-only until backend adapters land.",
            photo_id: "photo-cake",
            caption: "Cake table setup",
            uploaded_by: "Mina",
            like_count: "12",
            liked_by_viewer: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            active_event_id: "event-birthday",
            active_event_name: "First birthday album",
            photo_id: "photo-cake",
            caption: "Cake table setup",
            rank: "1",
            like_count: "12",
            why_selected:
              "Selected because this photo combines strong likes with a clear milestone moment.",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            active_event_id: "event-birthday",
            page_number: "1",
            title: "Cover preview",
            photo_caption: "Cake table setup",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            active_event_id: "event-birthday",
            active_event_name: "First birthday album",
            selected_candidate_count: "3",
            book_format: "Hardcover square",
            note: "Review this summary before backend submission is wired.",
            payload_section: "selected photos",
          },
        ],
      });

    const loadSnapshot = createPrototypeWorkspaceSnapshotLoader({ query });
    const snapshot = await loadSnapshot();

    expect(snapshot.workspace.groupSummary.totalGroups).toBe(1);
    expect(snapshot.workspace.groupSummary.totalMembers).toBe(4);
    expect(snapshot.workspace.groups[0]).toMatchObject({
      name: "Han family",
      role: "Owner",
    });
    expect(snapshot.workspace.events[0]).toMatchObject({
      name: "First birthday album",
      photoCount: 124,
    });
    expect(snapshot.photoWorkflows[0]?.activeEventId).toBe("event-birthday");
  });

  it("creates a photo and records a viewer like through postgres updates", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            count: "3",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            inserted: "1",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const createPhoto = createPrototypePhotoCreator({ query });
    const addLike = createPrototypePhotoLikeAdder({ query });

    await createPhoto({
      eventId: "event-birthday",
      caption: "New milestone",
    });
    await addLike({
      photoId: "photo-created-4",
      userId: "user-demo",
    });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO prototype_photos"),
      ["photo-created-4", "event-birthday", "New milestone"],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO prototype_photo_likes"),
      ["photo-created-4", "user-demo"],
    );
  });
});
