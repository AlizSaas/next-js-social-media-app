import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LikeInfo } from "@/lib/types";

export async function GET(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        likes: {
          where: {
            userId: loggedInUser.id, // Check if the logged-in user has liked the post
          },
          select: {
            userId: true, // Select only the userId to check if the user has liked the post
          },
        },
        _count: {
          select: {
            likes: true, // Count the number of likes on the post
          },
        },
      },
    }); // Find the post by ID and include likes and count 

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    const data: LikeInfo = {
      likes: post._count.likes, // Get the count of likes
      isLikedByUser: !!post.likes.length, // Check if the logged-in user has liked the post
    }; // Prepare the response data

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }, // Find the post by ID
      select: {
        userId: true,
      }, // Select the userId of the post owner
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.like.upsert({
        where: {
          userId_postId: {
            userId: loggedInUser.id,
            postId,
          }, // Upsert a like for the post
        },
        create: {
          userId: loggedInUser.id,
          postId,
        }, // Create a new like if it doesn't exist
        update: {}, // No update needed if it already exists
      }),
      ...(loggedInUser.id !== post.userId // Only create a notification if the liker is not the post owner
        ? [
            prisma.notification.create({
              data: {
                issuerId: loggedInUser.id, // The user who liked the post
                recipientId: post.userId, // The post owner
                postId, // The post that was liked
                type: "LIKE",
              },
            }), // Create a notification for the post owner
          ]
        : []),
    ]);

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }, // Find the post by ID
      select: {
        userId: true,
      }, // Select the userId of the post owner
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.like.deleteMany({
        where: {
          userId: loggedInUser.id,
          postId,
        },
      }), // Delete the like for the post by the logged-in user
      prisma.notification.deleteMany({
        where: {
          issuerId: loggedInUser.id, // Delete notifications where the liker is the logged-in user
          recipientId: post.userId, // and the recipient is the post owner
          postId, // and the type is "LIKE"
          type: "LIKE",
        },
      }),

    ]); // Delete any notifications related to the like

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}