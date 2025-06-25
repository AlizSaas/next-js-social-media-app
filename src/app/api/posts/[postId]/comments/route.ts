import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CommentsPage, getCommentDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params: { postId } }: { params: { postId: string } }, // Ensure postId is a string
) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined; // Get the cursor from query parameters

    const pageSize = 3; // Define the number of comments per page

    const { user } = await validateRequest(); // Validate the request and get the user

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    } // Check if user is authenticated

    const comments = await prisma.comment.findMany({
      where: { postId }, // Filter comments by postId
      include: getCommentDataInclude(user.id),
      orderBy: { createdAt: "asc" }, // Order comments by creation date
      take: -pageSize - 1, // Fetch one extra comment to check for pagination
      cursor: cursor ? { id: cursor } : undefined, // Use cursor for pagination
    }); // Fetch comments with cursor pagination

    const previousCursor = comments.length > pageSize ? comments[0].id : null; // Get the cursor for the next page

    const data: CommentsPage = {
      comments: comments.length > pageSize ? comments.slice(1) : comments, // Exclude the extra comment used for pagination
      previousCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}