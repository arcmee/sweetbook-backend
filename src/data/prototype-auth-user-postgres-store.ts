import type { Pool } from "pg";

import type {
  PrototypeAuthUser,
} from "../application/auth/prototype-auth-service";
import type {
  PrototypeAuthUserRecord,
  PrototypeAuthUserStore,
} from "../application/auth/prototype-auth-user-store";

const PROTOTYPE_AUTH_SEED_USERS = [
  {
    userId: "user-demo",
    username: "demo",
    displayName: "SweetBook Demo User",
    role: "owner",
    password: "sweetbook123!",
  },
  {
    userId: "user-mina",
    username: "mina",
    displayName: "Mina",
    role: "member",
    password: "prototype123!",
  },
  {
    userId: "user-joon",
    username: "joon",
    displayName: "Joon",
    role: "member",
    password: "prototype123!",
  },
  {
    userId: "user-ara",
    username: "ara",
    displayName: "Ara",
    role: "member",
    password: "prototype123!",
  },
  {
    userId: "user-soo",
    username: "soo",
    displayName: "Soo",
    role: "owner",
    password: "prototype123!",
  },
  {
    userId: "user-yuri",
    username: "yuri",
    displayName: "Yuri",
    role: "member",
    password: "prototype123!",
  },
  {
    userId: "user-haru",
    username: "haru",
    displayName: "Haru",
    role: "member",
    password: "prototype123!",
  },
  {
    userId: "user-sena",
    username: "sena",
    displayName: "Sena",
    role: "owner",
    password: "prototype123!",
  },
] as const;

type PrototypeAuthUserRow = {
  display_name: string;
  id: string;
  password: string;
  role: string;
  username: string;
};

export async function initializePrototypeAuthUserStore(
  pool: Pick<Pool, "query">,
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prototype_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function seedPrototypeAuthUserStore(
  pool: Pick<Pool, "query">,
): Promise<void> {
  for (const user of PROTOTYPE_AUTH_SEED_USERS) {
    await pool.query(
      `
        INSERT INTO prototype_users (id, username, display_name, password, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `,
      [user.userId, user.username, user.displayName, user.password, user.role],
    );
  }
}

export function createPrototypeAuthUserPostgresStore(
  pool: Pick<Pool, "query">,
): PrototypeAuthUserStore {
  return {
    async createUser(input) {
      const nextUser = {
        userId: `user-${input.username.trim().toLowerCase()}`,
        username: input.username.trim(),
        displayName: input.displayName.trim(),
        role: "member",
      } satisfies PrototypeAuthUser;

      await pool.query(
        `
          INSERT INTO prototype_users (id, username, display_name, password, role)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [nextUser.userId, nextUser.username, nextUser.displayName, input.password, nextUser.role],
      );

      return nextUser;
    },

    async findUserByUsername(username) {
      const result = await pool.query<PrototypeAuthUserRow>(
        `
          SELECT id, username, display_name, password, role
          FROM prototype_users
          WHERE username = $1
        `,
        [username.trim()],
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        userId: row.id,
        username: row.username,
        displayName: row.display_name,
        password: row.password,
        role: row.role,
      } satisfies PrototypeAuthUserRecord;
    },

    async updatePassword(input) {
      await pool.query(
        `
          UPDATE prototype_users
          SET password = $2
          WHERE id = $1
        `,
        [input.userId, input.nextPassword],
      );
    },
  };
}

export function createPrototypeUserSearch(
  pool: Pick<Pool, "query">,
): (input: {
  query: string;
}) => Promise<Array<{ userId: string; username: string; displayName: string }>> {
  return async (input) => {
    const normalizedQuery = `%${input.query.trim().toLowerCase()}%`;
    if (normalizedQuery === "%%") {
      return [];
    }

    const result = await pool.query<{
      display_name: string;
      id: string;
      username: string;
    }>(
      `
        SELECT id, username, display_name
        FROM prototype_users
        WHERE LOWER(id) LIKE $1
          OR LOWER(username) LIKE $1
          OR LOWER(display_name) LIKE $1
        ORDER BY username ASC
      `,
      [normalizedQuery],
    );

    return result.rows.map((row) => ({
      userId: row.id,
      username: row.username,
      displayName: row.display_name,
    }));
  };
}

export async function loadPrototypeUserDisplayMap(
  pool: Pick<Pool, "query">,
): Promise<Map<string, string>> {
  const result = await pool.query<{
    display_name: string;
    id: string;
  }>(`
    SELECT id, display_name
    FROM prototype_users
  `);

  return new Map(result.rows.map((row) => [row.id, row.display_name]));
}
