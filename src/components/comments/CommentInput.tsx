import { PostData } from "@/lib/types";
import { Loader2, SendHorizonal } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useSubmitCommentMutation } from "./mutation";

interface CommentInputProps {
  post: PostData;
}

export default function CommentInput({ post }: CommentInputProps) {
  const [input, setInput] = useState("");

  const mutation = useSubmitCommentMutation(post.id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // Prevent the default form submission behavior 

    if (!input) return; // If input is empty, do nothing

    mutation.mutate(
      {
        post, // Pass the post data to the mutation
        content: input,
      },
      {
        onSuccess: () => setInput(""), // Clear the input field on successful submission
      },
    );
  }

  return (
    <form className="flex w-full items-center gap-2" onSubmit={onSubmit}>
      <Input
        placeholder="Write a comment..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        autoFocus
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={!input.trim() || mutation.isPending} // Disable button if input is empty or mutation is pending
      >
        {!mutation.isPending ? ( // Check if mutation is pending
          <SendHorizonal /> // Show the icon when not pending
        ) : (
          <Loader2 className="animate-spin" />
        )}
      </Button>
    </form>
  );
}