"use server";

import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude, PostData } from "@/lib/types";
import { createCommentSchema } from "@/lib/validation";

export async function submitComment({
  post,
  content,
}: {
  post: PostData;
  content: string;
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content: contentValidated } = createCommentSchema.parse({ content });

  const [newComment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content: contentValidated, // Validate content
        postId: post.id, // Ensure post exists
        userId: user.id, // Associate comment with the user
      },
      include: getCommentDataInclude(user.id),
    }),
    ...(post.user.id !== user.id // Only create notification if the comment is not by the post owner
      ? [
          prisma.notification.create({
            data: {
              issuerId: user.id, // The user who made the comment
              recipientId: post.user.id, // The post owner
              postId: post.id, // The post that was commented on
              type: "COMMENT", // Type of notification
            },
          }),
        ]
      : []),
  ]);

  return newComment; // Return the newly created comment 
}

export async function deleteComment(id: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) throw new Error("Comment not found");

  if (comment.userId !== user.id) throw new Error("Unauthorized");

  const deletedComment = await prisma.comment.delete({
    where: { id },
    include: getCommentDataInclude(user.id),
  });

  return deletedComment;
}