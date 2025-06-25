"use server";

import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { createPostSchema } from "@/lib/validation";

export async function submitPost(input: {
  content: string;
  mediaIds: string[];
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content, mediaIds } = createPostSchema.parse(input);

  const newPost = await prisma.post.create({
    data: {
      content,
      userId: user.id,
      attachments: {
        connect: mediaIds.map((id) => ({ id })), // 
      }, // Connect existing media by their IDs 
    },
    include: getPostDataInclude(user.id),
  });

  return newPost;
}