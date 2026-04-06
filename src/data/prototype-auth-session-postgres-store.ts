import type { Pool } from "pg";

import type { PrototypeAuthSession } from "../application/auth/prototype-auth-service";
import type { PrototypeAuthSessionStore } from "../application/auth/prototype-auth-session-store";

export async function initializePrototypeAuthSessionStore(
  pool: Pick<Pool, "query">,
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export function createPrototypeAuthSessionPostgresStore(
  pool: Pick<Pool, "query">,
): PrototypeAuthSessionStore {
  return {
    async saveSession(session: PrototypeAuthSession): Promise<void> {
      await pool.query(
        `
          INSERT INTO prototype_auth_sessions (
            token,
            user_id,
            username,
            display_name,
            role
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (token)
          DO UPDATE SET
            user_id = EXCLUDED.user_id,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            role = EXCLUDED.role
        `,
        [
          session.token,
          session.user.userId,
          session.user.username,
          session.user.displayName,
          session.user.role,
        ],
      );
    },

    async findSession(token: string): Promise<PrototypeAuthSession | null> {
      const result = await pool.query<{
        token: string;
        user_id: string;
        username: string;
        display_name: string;
        role: string;
      }>(
        `
          SELECT token, user_id, username, display_name, role
          FROM prototype_auth_sessions
          WHERE token = $1
        `,
        [token],
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        token: row.token,
        user: {
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name,
          role: row.role,
        },
      };
    },

    async deleteSession(token: string): Promise<void> {
      await pool.query("DELETE FROM prototype_auth_sessions WHERE token = $1", [token]);
    },
  };
}
