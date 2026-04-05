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
});
