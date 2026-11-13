import { apiPostSelect, parseLimit } from "@/lib/apiPost";
import prisma from "@/lib/prisma";
import { requireApiKey } from "@/lib/requireApiKey";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const owner = await requireApiKey(req);
    if (owner instanceof Response) return owner;

    const { searchParams } = req.nextUrl;

    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseLimit(searchParams);

    const posts = await prisma.post.findMany({
      select: apiPostSelect,
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