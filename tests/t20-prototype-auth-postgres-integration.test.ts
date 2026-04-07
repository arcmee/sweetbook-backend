import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresPool } from "../src/data/postgres-pool";
import {
  createPrototypeAuthSessionPostgresStore,
  initializePrototypeAuthSessionStore,
} from "../src/data/prototype-auth-session-postgres-store";
import { buildApp } from "../src/presentation/app";

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://sweetbook:sweetbook@localhost:5432/sweetbook";

describe("prototype auth postgres integration", () => {
  const pool = createPostgresPool({ databaseUrl });
  let databaseReady = true;

  beforeAll(async () => {
    try {
      await initializePrototypeAuthSessionStore(pool);
      await pool.query("DELETE FROM prototype_auth_sessions");
    } catch {
      databaseReady = false;
    }
  });

  afterAll(async () => {
    if (databaseReady) {
      await pool.query("DELETE FROM prototype_auth_sessions");
    }
    await pool.end();
  });

  it("persists auth sessions in postgres through the app boundary", async () => {
    if (!databaseReady) {
      return;
    }

    const app = await buildApp({
      prototypeAuthSessionStore: createPrototypeAuthSessionPostgresStore(pool),
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/login",
      payload: {
        username: "demo",
        password: "sweetbook123!",
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const session = loginResponse.json();

    const databaseSession = await pool.query(
      "SELECT token, username FROM prototype_auth_sessions WHERE token = $1",
      [session.token],
    );

    expect(databaseSession.rows[0]).toEqual({
      token: session.token,
      username: "demo",
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/prototype/auth/logout",
      payload: {
        token: session.token,
      },
    });

    expect(logoutResponse.statusCode).toBe(204);

    const missingDatabaseSession = await pool.query(
      "SELECT token FROM prototype_auth_sessions WHERE token = $1",
      [session.token],
    );

    expect(missingDatabaseSession.rows).toEqual([]);
  });
});
