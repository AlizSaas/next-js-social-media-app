"use client";

import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Chat as StreamChat } from "stream-chat-react";
import ChatChannel from "./ChatChannel";
import ChatSidebar from "./ChatSidebar";
import useInitializeChatClient from "./useInitializeChatClient";
import "stream-chat-react/dist/css/v2/index.css";

// Chat container height calculation:
// - Mobile (12rem offset): navbar (5rem) + padding (5rem) + bottom menubar (2rem)
// - Desktop (8rem offset): navbar (5rem) + padding (3rem)
const CHAT_HEIGHT_MOBILE = "calc(100vh - 12rem)";
const CHAT_HEIGHT_DESKTOP = "calc(100vh - 8rem)";

export default function Chat() {
  const chatClient = useInitializeChatClient();

  const { resolvedTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!chatClient) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-card p-8 shadow-sm">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main
      className="relative w-full overflow-hidden rounded-2xl bg-card shadow-sm"
      style={{
        height: `var(--chat-height, ${CHAT_HEIGHT_MOBILE})`,
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          main { --chat-height: ${CHAT_HEIGHT_DESKTOP}; }
        }
      `}</style>
      <div className="absolute inset-0 flex">
        <StreamChat
          client={chatClient}
          theme={
            resolvedTheme === "dark"
              ? "str-chat__theme-dark"
              : "str-chat__theme-light"
          }
        >
          <ChatSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <ChatChannel
            open={!sidebarOpen}
            openSidebar={() => setSidebarOpen(true)}
          />
        </StreamChat>
      </div>
    </main>
  );
}