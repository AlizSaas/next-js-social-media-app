import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        recipientId: user.id, // Ensure we only update notifications for the authenticated user
        read: false, // Only update unread notifications
      },
      data: {
        read: true,
      },
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}