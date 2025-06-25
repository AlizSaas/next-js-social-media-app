import kyInstance from "@/lib/ky";
import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useSession } from "../SessionProvider";

export default function useInitializeChatClient() {
  const { user } = useSession();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!); // Ensure you have the Stream key set in your environment variables

    client
      .connectUser(
        {
          id: user.id, // Use user ID as the Stream user ID
          username: user.username, // Use username for the Stream user
          name: user.displayName, // Use display name for the Stream user
          image: user.avatarUrl, // Use avatar URL for the Stream user
        },
        async () =>
          kyInstance
            .get("/api/get-token") // Adjust the endpoint to match your API route for getting the token
            .json<{ token: string }>() // Fetch the token from your API
            .then((data) => data.token), // Use the token from your API
      )
      .catch((error) => console.error("Failed to connect user", error))
      .then(() => setChatClient(client));

    return () => {
      setChatClient(null); // Clear the chat client on unmount
      client
        .disconnectUser() // Disconnect the user when the component unmounts
        .catch((error) => console.error("Failed to disconnect user", error)) // Ensure to handle any errors during disconnection
        .then(() => console.log("Connection closed")); // Log when the connection is closed
    };
  }, [user.id, user.username, user.displayName, user.avatarUrl]); // Ensure to include all necessary user properties

  return chatClient;
}