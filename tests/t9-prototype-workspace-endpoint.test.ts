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
      token: expect.stringContaining("ptok_"),
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

  it("restores and clears a prototype auth session", async () => {
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
      url: `/api/prototype/auth/session?token=${session.token}`,
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
      payload: {
        token: session.token,
      },
    });

    expect(logoutResponse.statusCode).toBe(204);

    const missingSessionResponse = await app.inject({
      method: "GET",
      url: `/api/prototype/auth/session?token=${session.token}`,
    });

    expect(missingSessionResponse.statusCode).toBe(401);
    expect(missingSessionResponse.json()).toEqual({
      message: "Prototype auth session was not found",
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
    expect(payload.candidateReviews[0]?.candidates[0]?.rank).toBe(1);
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
      },
    });

    expect(response.statusCode).toBe(201);
    expect(creator).toHaveBeenCalledWith({
      groupId: "group-han",
      title: "Second birthday album",
    });
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
    const app = await buildApp({
      prototypeSweetBookEstimateRunner: async () => ({
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
      }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/estimate",
    });

    expect(response.statusCode).toBe(200);
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
    const app = await buildApp({
      prototypeSweetBookSubmitRunner: async () => ({
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
      }),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/prototype/sweetbook/submit",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "submitted",
      bookUid: "bk_123",
      order: {
        orderUid: "ord_1",
      },
    });
  });
});
