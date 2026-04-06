import { describe, expect, it, vi } from "vitest";

import {
  createPrototypeAuthSessionPostgresStore,
  initializePrototypeAuthSessionStore,
} from "../src/data/prototype-auth-session-postgres-store";

describe("prototype auth session postgres store", () => {
  it("initializes the prototype auth session table", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await initializePrototypeAuthSessionStore({ query });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain("CREATE TABLE IF NOT EXISTS prototype_auth_sessions");
  });

  it("saves, finds, and deletes a prototype auth session", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            token: "ptok_123",
            user_id: "user-demo",
            username: "demo",
            display_name: "SweetBook Demo User",
            role: "owner",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const store = createPrototypeAuthSessionPostgresStore({ query });

    await store.saveSession({
      token: "ptok_123",
      user: {
        userId: "user-demo",
        username: "demo",
        displayName: "SweetBook Demo User",
        role: "owner",
      },
    });

    const session = await store.findSession("ptok_123");
    await store.deleteSession("ptok_123");

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO prototype_auth_sessions"),
      ["ptok_123", "user-demo", "demo", "SweetBook Demo User", "owner"],
    );
    expect(session).toEqual({
      token: "ptok_123",
      user: {
        userId: "user-demo",
        username: "demo",
        displayName: "SweetBook Demo User",
        role: "owner",
      },
    });
    expect(query).toHaveBeenNthCalledWith(
      3,
      "DELETE FROM prototype_auth_sessions WHERE token = $1",
      ["ptok_123"],
    );
  });
});
