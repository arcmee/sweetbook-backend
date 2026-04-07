import { createHmac, timingSafeEqual } from "node:crypto";

import type { PrototypeAuthUser } from "./prototype-auth-service";

type PrototypeJwtPayload = {
  exp: number;
  sub: string;
  username: string;
  displayName: string;
  role: string;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createPrototypeJwtService(secret: string) {
  function signToken(user: PrototypeAuthUser): string {
    const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = encodeBase64Url(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        sub: user.userId,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      } satisfies PrototypeJwtPayload),
    );
    const signature = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    return `${header}.${payload}.${signature}`;
  }

  function verifyToken(token: string): PrototypeAuthUser | null {
    const segments = token.split(".");
    if (segments.length !== 3) {
      return null;
    }

    const [header, payload, signature] = segments;
    const expectedSignature = createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (
      signature.length !== expectedSignature.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    try {
      const decoded = JSON.parse(decodeBase64Url(payload)) as PrototypeJwtPayload;
      if (decoded.exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        userId: decoded.sub,
        username: decoded.username,
        displayName: decoded.displayName,
        role: decoded.role,
      };
    } catch {
      return null;
    }
  }

  return {
    signToken,
    verifyToken,
  };
}
