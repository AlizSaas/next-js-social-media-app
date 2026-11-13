"use server";

import { generateApiKey } from "@/lib/apiKey";
import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

const MAX_ACTIVE_KEYS = 5;

export async function createApiKey(name: string) {
  const { user, session } = await validateRequest();
  if (!user || !session) throw new Error("Unauthorized");

  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 50
  ) {
    throw new Error("Key name must be between 1 and 50 characters.");
  }

  const trimmedName = name.trim();

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;

    const currentSession = await tx.session.findUnique({
      where: { id: session.id },
      select: { userId: true, expiresAt: true },
    });
    if (
      !currentSession ||
      currentSession.userId !== user.id ||
      currentSession.expiresAt <= new Date()
    ) {
      throw new Error("Unauthorized");
    }

    const activeKeys = await tx.apiKey.count({
      where: { userId: user.id, revokedAt: null },
    });

    if (activeKeys >= MAX_ACTIVE_KEYS) {
      throw new Error("You can have at most 5 active API keys.");
    }

    const { rawKey, keyHash, prefix } = generateApiKey();
    await tx.apiKey.create({
      data: { userId: user.id, name: trimmedName, keyHash, prefix },
      select: { id: true },
    });

    return rawKey;
  });
}

export async function listApiKeys() {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  return prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(id: string) {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  if (typeof id !== "string" || !id) {
    throw new Error("API key not found or already revoked.");
  }

  const result = await prisma.apiKey.updateMany({
    where: { id, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count !== 1) {
    throw new Error("API key not found or already revoked.");
  }
}
