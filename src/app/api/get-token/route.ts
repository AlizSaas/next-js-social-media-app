import { validateRequest } from "@/lib/auth";
import streamServerClient from "@/lib/stream";

export async function GET() {
  try {
    const { user } = await validateRequest();

    console.log("Calling get-token for user: ", user?.id);

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour expiration

    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

    const token = streamServerClient.createToken(
      user.id, // Use user ID as the Stream user ID
      expirationTime, // Set expiration time to 1 hour from now
      issuedAt, // Set issued at time to 1 minute ago
    );

    return Response.json({ token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}