import prisma from "@/lib/prisma";
import { requireApiKey } from "@/lib/requireApiKey";
import { NextRequest } from "next/server";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const owner = await requireApiKey(req);
    if (owner instanceof Response) return owner;

    const { searchParams } = req.nextUrl;

    const cursor = searchParams.get("cursor") || undefined;

    const parsedLimit = Number(searchParams.get("limit"));
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const posts = await prisma.post.findMany({
      select: {
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
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = posts.length > limit ? posts[limit].id : null;

    return Response.json({
      data: posts.slice(0, limit),
      nextCursor,
    });
  } catch (error) {
    console.error("GET /api/v1/post failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}