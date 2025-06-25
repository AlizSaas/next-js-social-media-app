"use client";

import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { NotificationCountInfo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";




interface NotificationsButtonProps {
  initialState: NotificationCountInfo;
}

export default function NotificationsButton({
  initialState,
}: NotificationsButtonProps) {
  const { data } = useQuery({
    queryKey: ["unread-notification-count"],// Unique key for the query
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count") // API endpoint to fetch unread notification count
        .json<NotificationCountInfo>(),
    initialData: initialState,
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return (
    <Button
      variant="ghost"
      className="flex items-center justify-start gap-3"
      title="Notifications"
      asChild
    >
      <Link href="/notifications">
        <div className="relative">
          <Bell />
          {!!data.unreadCount && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs font-medium tabular-nums text-primary-foreground">
              {data.unreadCount}
            </span>
          )}
        </div>
        <span className="hidden lg:inline">Notifications</span>
      </Link>
    </Button>
  );
}