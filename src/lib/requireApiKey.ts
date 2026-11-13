import { hashApiKey } from "@/lib/apiKey";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function requireApiKey(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const match = authorization?.match(
    /^Bearer[ \t]+(sm_live_[A-Za-z0-9_-]{43})$/i,
  );

  if (!match) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(match[1]) },
    select: { id: true, revokedAt: true, user: { select: { id: true } } },
  });

  if (!apiKey || apiKey.revokedAt) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await prisma.apiKey.updateMany({
    where: { id: apiKey.id, revokedAt: null },
    data: { lastUsedAt: new Date() },
  });

  if (updated.count !== 1) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return apiKey.user;
}
