import { createPrototypeJwtService } from "./prototype-jwt";

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

export function createPrototypeAuthService(
  secret = process.env.PROTOTYPE_AUTH_JWT_SECRET ?? "groupictures-prototype-jwt-secret",
) {
  const jwtService = createPrototypeJwtService(secret);

  return {
    async login(input: PrototypeAuthLoginInput): Promise<PrototypeAuthSession> {
      if (
        input.username !== DEMO_ACCOUNT.username ||
        input.password !== DEMO_ACCOUNT.password
      ) {
        throw new Error("Invalid prototype credentials");
      }

      const token = jwtService.signToken(DEMO_ACCOUNT.user);
      const session = {
        token,
        user: DEMO_ACCOUNT.user,
      };

      return session;
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
  };
}
