import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadLocalEnv } from "../src/data/local-env-loader";

describe("local env loader", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads .env values into the target env without overriding existing values", () => {
    const dir = mkdtempSync(join(tmpdir(), "sweetbook-env-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, ".env"),
      [
        "SWEETBOOK_ENV=sandbox",
        'SWEETBOOK_API_KEY="test-key"',
        "# comment",
        "PORT=3000",
      ].join("\n"),
      "utf8",
    );

    const env: NodeJS.ProcessEnv = {
      PORT: "4000",
    };

    loadLocalEnv(env, dir);

    expect(env.SWEETBOOK_ENV).toBe("sandbox");
    expect(env.SWEETBOOK_API_KEY).toBe("test-key");
    expect(env.PORT).toBe("4000");
  });
});
