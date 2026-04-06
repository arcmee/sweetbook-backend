import { describe, expect, it } from "vitest";

import { resolveDatabaseConfig } from "../src/data/database-config";

describe("database config", () => {
  it("returns the configured database url", () => {
    expect(
      resolveDatabaseConfig({
        DATABASE_URL: "postgres://sweetbook:sweetbook@localhost:5432/sweetbook",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      databaseUrl: "postgres://sweetbook:sweetbook@localhost:5432/sweetbook",
    });
  });

  it("throws when the database url is missing", () => {
    expect(() => resolveDatabaseConfig({} as NodeJS.ProcessEnv)).toThrow(
      "DATABASE_URL is required.",
    );
  });
});
