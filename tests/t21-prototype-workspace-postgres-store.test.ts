import { describe, expect, it, vi } from "vitest";

import {
  createPrototypeEventOwnerApprovalUpdater,
  createPrototypePhotoCreator,
  createPrototypePhotoLikeAdder,
  createPrototypeEventVotingCloser,
  createPrototypeEventVotingExtender,
  createPrototypeGroupInviteCreator,
  createPrototypeInvitationAcceptor,
  createPrototypeInvitationDecliner,
  createPrototypeGroupLeaveAction,
  createPrototypeOwnerTransfer,
  createPrototypeUserSearch,
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
    const query = vi.fn()
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
            description: "Collect the best first birthday moments before the family vote closes.",
            voting_starts_at: "2026-04-20T09:00:00.000Z",
            voting_ends_at: "2026-04-30T09:00:00.000Z",
            voting_closed_manually: false,
            owner_approved: true,
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
            group_id: "group-han",
            user_id: "user-demo",
            role: "Owner",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            invitation_id: "invite-kim",
            group_id: "group-kim",
            group_name: "Kim family moments",
            invited_user_id: "user-demo",
            invited_by_user_id: "user-sena",
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
            original_file_name: null,
            media_type: null,
            storage_path: null,
          },
          {
            active_event_id: "event-birthday",
            active_event_name: "First birthday album",
            pending_count: "3",
            uploaded_count: "124",
            helper_text: "Upload queue is local-only until backend adapters land.",
            photo_id: "photo-family",
            caption: "Family portrait",
            uploaded_by: "Joon",
            like_count: "9",
            liked_by_viewer: false,
            original_file_name: null,
            media_type: null,
            storage_path: null,
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
      ownerApproved: true,
      operationSummary: {
        stage: "setup",
        label: "Setup in progress",
      },
    });
    expect(snapshot.groupMembers?.[0]).toMatchObject({
      groupId: "group-han",
      displayName: "SweetBook Demo User",
    });
    expect(snapshot.pendingInvitations?.[0]).toMatchObject({
      invitationId: "invite-kim",
      groupId: "group-kim",
      groupName: "Kim family moments",
      invitedByDisplayName: "Sena",
    });
    expect(snapshot.photoWorkflows[0]?.activeEventId).toBe("event-birthday");
    expect(snapshot.candidateReviews[0]?.candidates[0]).toMatchObject({
      photoId: "photo-cake",
      rank: 1,
      likeCount: 12,
    });
    expect(snapshot.orderEntries[0]).toMatchObject({
      activeEventId: "event-birthday",
      selectedCandidateCount: 2,
      operationSummary: {
        stage: "ready_for_handoff",
        label: "Ready for handoff prep",
      },
      readinessSummary: {
        minimumSelectedPhotoCount: 3,
        selectedPhotoCount: 2,
        meetsMinimumPhotoCount: false,
      },
    });
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

  it("updates event voting state through postgres actions", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            voting_starts_at: "2026-04-01T09:00:00.000Z",
            voting_ends_at: "2026-04-14T09:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            voting_starts_at: "2026-04-01T09:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const closeVoting = createPrototypeEventVotingCloser({ query });
    const extendVoting = createPrototypeEventVotingExtender({ query });

    await closeVoting({
      eventId: "event-birthday",
    });
    await extendVoting({
      eventId: "event-birthday",
      votingEndsAt: "2026-04-21T09:00:00.000Z",
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT voting_starts_at::text, voting_ends_at::text"),
      ["event-birthday"],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET"),
      ["event-birthday", "ready"],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SELECT voting_starts_at::text"),
      ["event-birthday"],
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("SET"),
      ["event-birthday", "2026-04-21T09:00:00.000Z", "collecting"],
    );
  });

  it("updates owner approval through postgres actions", async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount: 1,
      rows: [],
    });

    const updateOwnerApproval = createPrototypeEventOwnerApprovalUpdater({ query });

    await updateOwnerApproval({
      eventId: "event-birthday",
      ownerApproved: true,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET owner_approved = $2"),
      ["event-birthday", true],
    );
  });

  it("searches users and updates invitations and group memberships", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            count: "1",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            group_id: "group-han",
            invited_user_id: "user-haru",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            role: "Editor",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const searchUsers = createPrototypeUserSearch();
    const inviteMember = createPrototypeGroupInviteCreator({ query });
    const acceptInvitation = createPrototypeInvitationAcceptor({ query });
    const declineInvitation = createPrototypeInvitationDecliner({ query });
    const transferOwner = createPrototypeOwnerTransfer({ query });
    const leaveGroup = createPrototypeGroupLeaveAction({ query });

    const results = await searchUsers({
      query: "haru",
    });
    await inviteMember({
      groupId: "group-han",
      userId: "user-haru",
    });
    await acceptInvitation({
      invitationId: "invite-created-1",
      userId: "user-haru",
    });
    await declineInvitation({
      invitationId: "invite-kim",
      userId: "user-demo",
    });
    await transferOwner({
      groupId: "group-han",
      nextOwnerUserId: "user-mina",
    });
    await leaveGroup({
      groupId: "group-han",
      userId: "user-demo",
    });

    expect(results[0]?.displayName).toBe("Haru");
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT role"),
      ["group-han", "user-haru"],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SELECT COUNT(*)::text AS count FROM prototype_group_invitations"),
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO prototype_group_invitations"),
      ["invite-created-1", "group-han", "user-haru", "user-demo"],
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("SELECT group_id, invited_user_id"),
      ["invite-created-1"],
    );
    expect(query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("INSERT INTO prototype_group_memberships"),
      ["group-han", "user-haru"],
    );
    expect(query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("DELETE FROM prototype_group_invitations"),
      ["invite-created-1"],
    );
    expect(query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("DELETE FROM prototype_group_invitations"),
      ["invite-kim", "user-demo"],
    );
    expect(query).toHaveBeenNthCalledWith(
      8,
      expect.stringContaining("SET role = 'Editor'"),
      ["group-han"],
    );
    expect(query).toHaveBeenNthCalledWith(
      9,
      expect.stringContaining("SET role = 'Owner'"),
      ["group-han", "user-mina"],
    );
    expect(query).toHaveBeenNthCalledWith(
      10,
      expect.stringContaining("SELECT role"),
      ["group-han", "user-demo"],
    );
    expect(query).toHaveBeenNthCalledWith(
      11,
      expect.stringContaining("DELETE FROM prototype_group_memberships"),
      ["group-han", "user-demo"],
    );
  });
});
