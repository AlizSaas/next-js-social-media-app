import { createHash, randomBytes } from "node:crypto";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey() {
  const rawKey = `sm_live_${randomBytes(32).toString("base64url")}`;

  return {
    rawKey,  // this is the plain text API key that should be shown to the user only once
    keyHash: hashApiKey(rawKey), // this is the hashed version of the API key that can be safely stored in the database
    prefix: rawKey.slice(0, 12), // this is the prefix of the API key that can be used to identify it without exposing the full key
  };
}
