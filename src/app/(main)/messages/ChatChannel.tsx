import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, MessageSquare } from "lucide-react";
import {
  Channel,
  ChannelHeader,
  ChannelHeaderProps,
  MessageInput,
  MessageList,
  Window,
} from "stream-chat-react";

interface ChatChannelProps {
  open: boolean;
  openSidebar: () => void;
}

export default function ChatChannel({ open, openSidebar }: ChatChannelProps) {
  return (
    <div className={cn("w-full md:block", !open && "hidden")}>
      <Channel
        EmptyPlaceholder={<EmptyChannelState openSidebar={openSidebar} />}
      >
        <Window>
          <CustomChannelHeader openSidebar={openSidebar} />
          <MessageList />
          <MessageInput />
        </Window>
      </Channel>
    </div>
  );
}

interface CustomChannelHeaderProps extends ChannelHeaderProps {
  openSidebar: () => void;
}

function CustomChannelHeader({
  openSidebar,
  ...props
}: CustomChannelHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-full p-2 md:hidden">
        <Button size="icon" variant="ghost" onClick={openSidebar}>
          <Menu className="size-5" />
        </Button>
      </div>
      <ChannelHeader {...props} />
    </div>
  );
}

interface EmptyChannelStateProps {
  openSidebar: () => void;
}

function EmptyChannelState({ openSidebar }: EmptyChannelStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-6">
        <MessageSquare className="size-12 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-xl font-semibold">No conversation selected</h3>
        <p className="mt-1 text-muted-foreground">
          Select a chat from the sidebar or start a new conversation
        </p>
      </div>
      <Button onClick={openSidebar} className="mt-4 md:hidden">
        Open Chats
      </Button>
    </div>
  );
}