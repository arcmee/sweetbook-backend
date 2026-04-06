import { Pool } from "pg";

import type { DatabaseConfig } from "./database-config";

export function createPostgresPool(config: DatabaseConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
  });
}
