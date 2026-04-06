import type { PrototypeAuthSession } from "./prototype-auth-service";

export interface PrototypeAuthSessionStore {
  saveSession(session: PrototypeAuthSession): Promise<void>;
  findSession(token: string): Promise<PrototypeAuthSession | null>;
  deleteSession(token: string): Promise<void>;
}
