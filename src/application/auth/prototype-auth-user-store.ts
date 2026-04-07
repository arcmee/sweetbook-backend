import type { PrototypeAuthUser } from "./prototype-auth-service";

export interface PrototypeAuthUserRecord extends PrototypeAuthUser {
  password: string;
}

export interface PrototypeAuthUserStore {
  createUser(input: {
    displayName: string;
    password: string;
    username: string;
  }): Promise<PrototypeAuthUser>;
  findUserByUsername(username: string): Promise<PrototypeAuthUserRecord | null>;
  updatePassword(input: {
    nextPassword: string;
    userId: string;
  }): Promise<void>;
}
