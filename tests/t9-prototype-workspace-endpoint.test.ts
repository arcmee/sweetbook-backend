import { describe, expect, it } from "vitest";

import { buildApp } from "../src/presentation/app";

describe("prototype workspace endpoint", () => {
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
});
