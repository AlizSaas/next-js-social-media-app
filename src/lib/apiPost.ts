import { Prisma } from "@prisma/client";

// Shared `select` used by every /api/v1/.../posts route so the public
// JSON shape stays consistent and never leaks fields like email or passwordHash.
export const apiPostSelect = {
  id: true,
  content: true,
  createdAt: true,
  user: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  attachments: {
    select: { url: true, type: true },
  },
  _count: {
    select: { likes: true, comments: true },
  },
} satisfies Prisma.PostSelect;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Parses the "limit" query param, falling back to DEFAULT_LIMIT and
// never exceeding MAX_LIMIT.
export function parseLimit(searchParams: URLSearchParams) {
  const parsedLimit = Number(searchParams.get("limit"));
  return Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;
}
