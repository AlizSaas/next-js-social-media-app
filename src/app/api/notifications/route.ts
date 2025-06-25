import { validateRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notificationsInclude, NotificationsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

    const pageSize = 10;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id, // Ensure we only fetch notifications for the authenticated user
      },
      include: notificationsInclude, // Include necessary data like issuer and post
      orderBy: { createdAt: "desc" }, // Order notifications by creation date, most recent first
      take: pageSize + 1, // Fetch one more than the page size to check for next page
      cursor: cursor ? { id: cursor } : undefined, // Use cursor for pagination if provided
    });

    const nextCursor =
      notifications.length > pageSize ? notifications[pageSize].id : null; // If we have more than pageSize notifications, set the next cursor

    const data: NotificationsPage = {
      notifications: notifications.slice(0, pageSize),
      nextCursor,
    }; // Return the notifications and the next cursor

    return Response.json(data); // Return the notifications page data
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}