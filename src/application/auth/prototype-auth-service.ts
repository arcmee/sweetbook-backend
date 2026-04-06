import { randomUUID } from "node:crypto";

import type { PrototypeAuthSessionStore } from "./prototype-auth-session-store";

export interface PrototypeAuthUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

export interface PrototypeAuthSession {
  token: string;
  user: PrototypeAuthUser;
}

export interface PrototypeAuthLoginInput {
  username: string;
  password: string;
}

const DEMO_ACCOUNT = {
  username: "demo",
  password: "sweetbook123!",
  user: {
    userId: "user-demo",
    username: "demo",
    displayName: "SweetBook Demo User",
    role: "owner",
  },
} as const;

const sessions = new Map<string, PrototypeAuthUser>();

class InMemoryPrototypeAuthSessionStore implements PrototypeAuthSessionStore {
  async saveSession(session: PrototypeAuthSession): Promise<void> {
    sessions.set(session.token, session.user);
  }

  async findSession(token: string): Promise<PrototypeAuthSession | null> {
    const user = sessions.get(token);

    if (!user) {
      return null;
    }

    return {
      token,
      user,
    };
  }

  async deleteSession(token: string): Promise<void> {
    sessions.delete(token);
  }
}

export function createPrototypeAuthService(
  sessionStore: PrototypeAuthSessionStore = new InMemoryPrototypeAuthSessionStore(),
) {
  return {
    async login(input: PrototypeAuthLoginInput): Promise<PrototypeAuthSession> {
      if (
        input.username !== DEMO_ACCOUNT.username ||
        input.password !== DEMO_ACCOUNT.password
      ) {
        throw new Error("Invalid prototype credentials");
      }

      const token = `ptok_${randomUUID()}`;
      const session = {
        token,
        user: DEMO_ACCOUNT.user,
      };
      await sessionStore.saveSession(session);

      return session;
    },

    async getSession(token: string): Promise<PrototypeAuthSession | null> {
      return sessionStore.findSession(token);
    },

    async logout(token: string): Promise<void> {
      await sessionStore.deleteSession(token);
    },
  };
}
