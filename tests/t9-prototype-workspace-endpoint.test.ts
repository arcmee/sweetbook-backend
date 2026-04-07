import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/presentation/app";

describe("prototype workspace endpoint", () => {
  it("issues a prototype auth session for the demo credentials", async () => {
    const app = await buildApp();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/login",
      payload: {
        username: "demo",
        password: "sweetbook123!",
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toMatchObject({
      token: expect.stringMatching(/^[^.]+\.[^.]+\.[^.]+$/),
      user: {
        userId: "user-demo",
        username: "demo",
      },
    });
  });

  it("rejects invalid prototype auth credentials", async () => {
    const app = await buildApp();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/login",
      payload: {
        username: "demo",
        password: "wrong-password",
      },
    });

    expect(loginResponse.statusCode).toBe(401);
    expect(loginResponse.json()).toEqual({
      message: "Invalid prototype credentials",
    });
  });

  it("creates and restores a prototype auth session", async () => {
    const app = await buildApp();
    const signupResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/signup",
      payload: {
        displayName: "Tester",
        username: "tester",
        password: "password123",
      },
    });

    expect(signupResponse.statusCode).toBe(201);
    expect(signupResponse.json()).toMatchObject({
      user: {
        username: "tester",
      },
    });
  });

  it("restores a prototype auth session through bearer auth", async () => {
    const app = await buildApp();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/login",
      payload: {
        username: "demo",
        password: "sweetbook123!",
      },
    });
    const session = loginResponse.json();

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/prototype/auth/session",
      headers: {
        authorization: `Bearer ${session.token}`,
      },
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      token: session.token,
      user: {
        username: "demo",
      },
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/logout",
    });

    expect(logoutResponse.statusCode).toBe(204);

    const restoredSessionResponse = await app.inject({
      method: "GET",
      url: "/api/prototype/auth/session",
      headers: {
        authorization: `Bearer ${session.token}`,
      },
    });

    expect(restoredSessionResponse.statusCode).toBe(200);
    expect(restoredSessionResponse.json()).toMatchObject({
      token: session.token,
      user: {
        username: "demo",
      },
    });
  });

  it("returns a workspace snapshot for the frontend prototype", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/workspace",
    });

    expect(response.statusCode).toBe(200);

    const payload = response.json();

    expect(payload.workspace.groupSummary.totalGroups).toBe(2);
    expect(payload.workspace.groups[0]?.name).toBe("Han family");
    expect(payload.photoWorkflows[0]?.activeEventName).toBe("First birthday album");
    expect(payload.workspace.events[0]?.operationSummary.label).toBe("Voting in progress");
    expect(payload.workspace.events[0]?.ownerApproved).toBe(false);
    expect(payload.candidateReviews[0]?.candidates[0]?.rank).toBe(1);
    expect(payload.orderEntries[0]?.operationSummary.stage).toBe("ready_for_handoff");
    expect(payload.orderEntries[0]?.readinessSummary.minimumSelectedPhotoCount).toBe(3);
    expect(payload.orderEntries[0]?.readinessSummary.meetsMinimumPhotoCount).toBe(true);
    expect(payload.orderEntries[0]?.reviewSummary.draftPageCount).toBe(2);
    expect(payload.orderEntries[0]?.reviewSummary.ownerApprovalRequired).toBe(true);
    expect(payload.orderEntries[0]?.handoffSummary.bookFormat).toBe("Hardcover square");
  });

  it("delegates the workspace endpoint to an injected snapshot loader", async () => {
    const app = await buildApp({
      prototypeWorkspaceSnapshotLoader: async () => ({
        workspace: {
          groupSummary: {
            totalGroups: 1,
            totalMembers: 2,
          },
          groups: [
            {
              id: "group-db",
              name: "Database group",
              memberCount: 2,
              role: "Owner",
              eventCount: 1,
            },
          ],
          events: [
            {
              id: "event-db",
              name: "Database event",
              groupName: "Database group",
              status: "ready",
              photoCount: 12,
            },
          ],
        },
        photoWorkflows: [],
        candidateReviews: [],
        orderEntries: [],
      }),
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/workspace",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      workspace: {
        groups: [
          {
            name: "Database group",
          },
        ],
        events: [
          {
            name: "Database event",
          },
        ],
      },
    });
  });

  it("delegates the prototype group creation endpoint to the injected creator", async () => {
    const creator = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeGroupCreator: creator,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/groups",
      payload: {
        name: "New family group",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(creator).toHaveBeenCalledWith({
      name: "New family group",
      userId: "user-demo",
    });
  });

  it("delegates the prototype event creation endpoint to the injected creator", async () => {
    const creator = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeEventCreator: creator,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/events",
      payload: {
        groupId: "group-han",
        title: "Second birthday album",
        description: "Collect the best second birthday moments before the vote closes.",
        votingStartsAt: "2026-04-10T09:00:00.000Z",
        votingEndsAt: "2026-04-20T09:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(creator).toHaveBeenCalledWith({
      groupId: "group-han",
      title: "Second birthday album",
      description: "Collect the best second birthday moments before the vote closes.",
      votingStartsAt: "2026-04-10T09:00:00.000Z",
      votingEndsAt: "2026-04-20T09:00:00.000Z",
    });
  });

  it("accepts a simple prototype password change", async () => {
    const app = await buildApp();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/login",
      payload: {
        username: "demo",
        password: "sweetbook123!",
      },
    });
    const session = loginResponse.json();
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/account/password",
      headers: {
        authorization: `Bearer ${session.token}`,
      },
      payload: {
        currentPassword: "sweetbook123!",
        nextPassword: "sweetbook456!",
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it("delegates the prototype user search endpoint to the injected searcher", async () => {
    const searcher = vi.fn().mockResolvedValue([
      {
        userId: "user-haru",
        username: "haru",
        displayName: "Haru",
      },
    ]);
    const app = await buildApp({
      prototypeUserSearch: searcher,
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/users/search?q=haru",
    });

    expect(response.statusCode).toBe(200);
    expect(searcher).toHaveBeenCalledWith({
      query: "haru",
    });
  });

  it("delegates the prototype group invite endpoint to the injected creator", async () => {
    const inviteCreator = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeGroupInviteCreator: inviteCreator,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/groups/group-han/invitations",
      payload: {
        userId: "user-haru",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(inviteCreator).toHaveBeenCalledWith({
      groupId: "group-han",
      userId: "user-haru",
      invitedByUserId: "user-demo",
    });
  });

  it("delegates the invitation accept and decline endpoints to the injected actions", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const decline = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeGroupInvitationAcceptor: accept,
      prototypeGroupInvitationDecliner: decline,
    });

    const acceptResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/invitations/invite-kim/accept",
      payload: {
        userId: "user-demo",
      },
    });
    const declineResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/invitations/invite-kim/decline",
      payload: {
        userId: "user-demo",
      },
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(declineResponse.statusCode).toBe(200);
    expect(accept).toHaveBeenCalledWith({
      invitationId: "invite-kim",
      userId: "user-demo",
    });
    expect(decline).toHaveBeenCalledWith({
      invitationId: "invite-kim",
      userId: "user-demo",
    });
  });

  it("delegates the prototype owner transfer endpoint to the injected transfer action", async () => {
    const transfer = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeOwnerTransfer: transfer,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/groups/group-han/owner",
      payload: {
        nextOwnerUserId: "user-mina",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(transfer).toHaveBeenCalledWith({
      groupId: "group-han",
      nextOwnerUserId: "user-mina",
    });
  });

  it("delegates the prototype group leave endpoint to the injected leave action", async () => {
    const leaveAction = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeGroupLeaveAction: leaveAction,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/groups/group-han/leave",
      payload: {
        userId: "user-demo",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(leaveAction).toHaveBeenCalledWith({
      groupId: "group-han",
      userId: "user-demo",
    });
  });

  it("delegates the prototype event voting close endpoint to the injected closer", async () => {
    const closer = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeEventVotingCloser: closer,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/close-voting",
    });

    expect(response.statusCode).toBe(200);
    expect(closer).toHaveBeenCalledWith({
      eventId: "event-birthday",
    });
  });

  it("delegates the prototype event voting extend endpoint to the injected extender", async () => {
    const extender = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeEventVotingExtender: extender,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/extend-voting",
      payload: {
        votingEndsAt: "2026-04-21T09:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(extender).toHaveBeenCalledWith({
      eventId: "event-birthday",
      votingEndsAt: "2026-04-21T09:00:00.000Z",
    });
  });

  it("delegates the prototype owner approval endpoint to the injected updater", async () => {
    const updater = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeEventOwnerApprovalUpdater: updater,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/owner-approval",
      payload: {
        ownerApproved: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(updater).toHaveBeenCalledWith({
      eventId: "event-birthday",
      ownerApproved: true,
    });
  });

  it("delegates the prototype page plan update endpoints to the injected actions", async () => {
    const updateSelection = vi.fn().mockResolvedValue(undefined);
    const updateCover = vi.fn().mockResolvedValue(undefined);
    const updateLayout = vi.fn().mockResolvedValue(undefined);
    const updateNote = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypeOrderSelectionUpdater: updateSelection,
      prototypeOrderCoverUpdater: updateCover,
      prototypeOrderPageLayoutUpdater: updateLayout,
      prototypeOrderPageNoteUpdater: updateNote,
    });

    const selectionResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/page-plan/selection",
      payload: {
        selectedPhotoIds: ["photo-cake", "photo-family"],
      },
    });
    const coverResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/page-plan/cover",
      payload: {
        coverPhotoId: "photo-family",
      },
    });
    const layoutResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/page-plan/pages/spread-1/layout",
      payload: {
        layout: "Collage spread",
      },
    });
    const noteResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/events/event-birthday/page-plan/pages/spread-1/note",
      payload: {
        note: "Use the candid moments here.",
      },
    });

    expect(selectionResponse.statusCode).toBe(200);
    expect(coverResponse.statusCode).toBe(200);
    expect(layoutResponse.statusCode).toBe(200);
    expect(noteResponse.statusCode).toBe(200);
    expect(updateSelection).toHaveBeenCalledWith({
      eventId: "event-birthday",
      selectedPhotoIds: ["photo-cake", "photo-family"],
    });
    expect(updateCover).toHaveBeenCalledWith({
      eventId: "event-birthday",
      coverPhotoId: "photo-family",
    });
    expect(updateLayout).toHaveBeenCalledWith({
      eventId: "event-birthday",
      pageId: "spread-1",
      layout: "Collage spread",
    });
    expect(updateNote).toHaveBeenCalledWith({
      eventId: "event-birthday",
      pageId: "spread-1",
      note: "Use the candid moments here.",
    });
  });

  it("delegates the prototype photo creation endpoint to the injected creator", async () => {
    const creator = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypePhotoCreator: creator,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/photos",
      payload: {
        eventId: "event-birthday",
        caption: "Cake table setup",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(creator).toHaveBeenCalledWith({
      eventId: "event-birthday",
      caption: "Cake table setup",
    });
  });

  it("delegates the prototype photo like endpoint to the injected adder", async () => {
    const adder = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypePhotoLikeAdder: adder,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/photos/photo-cake/likes",
      payload: {
        userId: "user-demo",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(adder).toHaveBeenCalledWith({
      photoId: "photo-cake",
      userId: "user-demo",
    });
  });

  it("delegates the prototype photo upload endpoint to the injected uploader", async () => {
    const uploader = vi.fn().mockResolvedValue(undefined);
    const app = await buildApp({
      prototypePhotoUploader: uploader,
    });
    const formData = new FormData();
    formData.set("eventId", "event-birthday");
    formData.set("caption", "Balloon arch");
    formData.set(
      "file",
      new File(["demo-image"], "balloon-arch.jpg", {
        type: "image/jpeg",
      }),
    );
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/photo-uploads",
      payload: formData,
    });

    expect(response.statusCode).toBe(201);
    expect(uploader).toHaveBeenCalledWith({
      eventId: "event-birthday",
      caption: "Balloon arch",
      originalFileName: "balloon-arch.jpg",
      mediaType: "image/jpeg",
      fileBytes: expect.any(Uint8Array),
    });
  });

  it("serves a prototype photo asset through the injected loader", async () => {
    const app = await buildApp({
      prototypePhotoAssetLoader: async () => ({
        mediaType: "image/jpeg",
        body: new Uint8Array([1, 2, 3]),
      }),
    });
    const response = await app.inject({
      method: "GET",
      url: "/api/prototype/photos/photo-cake/asset",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/jpeg");
  });

  it("returns 503 for the SweetBook prototype estimate endpoint when no runner is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/estimate",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message: "SweetBook prototype estimate runner is not configured",
    });
  });

  it("delegates the SweetBook prototype estimate endpoint to the injected runner", async () => {
    const runner = vi.fn().mockResolvedValue({
        status: "blocked_insufficient_credit",
        bookUid: "bk_123",
        uploadedPhotoFileName: "photo-1.jpg",
        pageCount: 24,
        contentInsertions: [],
        estimate: {
          totalAmount: 3100,
          paidCreditAmount: 3410,
          creditBalance: 2590,
          creditSufficient: false,
          currency: "KRW",
        },
      });
    const app = await buildApp({
      prototypeSweetBookEstimateRunner: runner,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/estimate",
      payload: {
        eventId: "event-birthday",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(runner).toHaveBeenCalledWith({
      eventId: "event-birthday",
    });
    expect(response.json()).toMatchObject({
      status: "blocked_insufficient_credit",
      bookUid: "bk_123",
      pageCount: 24,
    });
  });

  it("returns 503 for the SweetBook prototype submit endpoint when no runner is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/submit",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message: "SweetBook prototype submit runner is not configured",
    });
  });

  it("delegates the SweetBook prototype submit endpoint to the injected runner", async () => {
    const runner = vi.fn().mockResolvedValue({
        status: "submitted",
        bookUid: "bk_123",
        uploadedPhotoFileName: "photo-1.jpg",
        pageCount: 24,
        contentInsertions: [],
        estimate: {
          totalAmount: 3100,
          paidCreditAmount: 3100,
          creditBalance: 5000,
          creditSufficient: true,
          currency: "KRW",
        },
        order: {
          orderUid: "ord_1",
          orderStatus: 20,
          orderStatusDisplay: "결제완료",
        },
      });
    const app = await buildApp({
      prototypeSweetBookSubmitRunner: runner,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/submit",
      payload: {
        eventId: "event-birthday",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(runner).toHaveBeenCalledWith({
      eventId: "event-birthday",
    });
    expect(response.json()).toMatchObject({
      status: "submitted",
      bookUid: "bk_123",
      order: {
        orderUid: "ord_1",
      },
    });
  });
});
