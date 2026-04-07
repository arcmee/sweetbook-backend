import { createPrototypeJwtService } from "./prototype-jwt";
import type {
  PrototypeAuthUserRecord,
  PrototypeAuthUserStore,
} from "./prototype-auth-user-store";

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

export interface PrototypeAuthSignupInput {
  displayName: string;
  username: string;
  password: string;
}

const DEMO_ACCOUNT: PrototypeAuthUserRecord = {
  userId: "user-demo",
  username: "demo",
  displayName: "SweetBook Demo User",
  role: "owner",
  password: "sweetbook123!",
};

const prototypeUsers = new Map<string, PrototypeAuthUserRecord>([
  [DEMO_ACCOUNT.username, DEMO_ACCOUNT],
]);

class InMemoryPrototypeAuthUserStore implements PrototypeAuthUserStore {
  async createUser(input: PrototypeAuthSignupInput): Promise<PrototypeAuthUser> {
    const username = input.username.trim();
    if (prototypeUsers.has(username)) {
      throw new Error("Prototype username is already in use");
    }

    const nextUser = {
      userId: `user-${username.toLowerCase()}`,
      username,
      displayName: input.displayName.trim(),
      role: "member",
      password: input.password,
    } satisfies PrototypeAuthUserRecord;
    prototypeUsers.set(username, nextUser);

    return {
      userId: nextUser.userId,
      username: nextUser.username,
      displayName: nextUser.displayName,
      role: nextUser.role,
    };
  }

  async findUserByUsername(username: string): Promise<PrototypeAuthUserRecord | null> {
    return prototypeUsers.get(username.trim()) ?? null;
  }

  async updatePassword(input: { nextPassword: string; userId: string }): Promise<void> {
    for (const [username, user] of prototypeUsers.entries()) {
      if (user.userId === input.userId) {
        prototypeUsers.set(username, {
          ...user,
          password: input.nextPassword,
        });
        return;
      }
    }
  }
}

export function createPrototypeAuthService(
  userStore: PrototypeAuthUserStore = new InMemoryPrototypeAuthUserStore(),
  secret = process.env.PROTOTYPE_AUTH_JWT_SECRET ?? "groupictures-prototype-jwt-secret",
) {
  const jwtService = createPrototypeJwtService(secret);

  return {
    async login(input: PrototypeAuthLoginInput): Promise<PrototypeAuthSession> {
      const user = await userStore.findUserByUsername(input.username);
      if (!user || input.password !== user.password) {
        throw new Error("Invalid prototype credentials");
      }

      const authUser = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      } satisfies PrototypeAuthUser;
      const token = jwtService.signToken(authUser);

      return {
        token,
        user: authUser,
      };
    },

    async signup(input: PrototypeAuthSignupInput): Promise<PrototypeAuthSession> {
      if (!input.displayName.trim() || !input.username.trim() || !input.password.trim()) {
        throw new Error("Display name, username, and password are required");
      }

      if (input.password.trim().length < 8) {
        throw new Error("Prototype password must be at least 8 characters");
      }

      const user = await userStore.createUser(input);
      const token = jwtService.signToken(user);

      return {
        token,
        user,
      };
    },

    async getSession(token: string): Promise<PrototypeAuthSession | null> {
      const user = jwtService.verifyToken(token);
      if (!user) {
        return null;
      }

      return {
        token,
        user,
      };
    },

    async logout(): Promise<void> {
      return Promise.resolve();
    },

    async changePassword(input: {
      currentPassword: string;
      nextPassword: string;
      token: string;
    }): Promise<void> {
      const session = await this.getSession(input.token);
      if (!session) {
        throw new Error("Prototype auth session was not found");
      }

      const user = await userStore.findUserByUsername(session.user.username);
      if (!user || user.password !== input.currentPassword) {
        throw new Error("Current prototype password is incorrect");
      }

      if (input.nextPassword.trim().length < 8) {
        throw new Error("Next prototype password must be at least 8 characters");
      }

      await userStore.updatePassword({
        userId: session.user.userId,
        nextPassword: input.nextPassword,
      });
    },
  };
}
