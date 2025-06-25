import kyInstance from "@/lib/ky";
import { CommentsPage, PostData } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import Comment from "./Comment";
import CommentInput from "./CommentInput";

interface CommentsProps {
  post: PostData;
}

export default function Comments({ post }: CommentsProps) {
  const { data, fetchNextPage, hasNextPage, isFetching, status } =
    useInfiniteQuery({
      queryKey: ["comments", post.id], // Unique key for the query
      queryFn: ({ pageParam }) => // Fetch comments for the post
        kyInstance // Fetch comments for the post
          .get(
            `/api/posts/${post.id}/comments`, // API endpoint to fetch comments
            pageParam ? { searchParams: { cursor: pageParam } } : {}, // Include cursor if available
          )
          .json<CommentsPage>(), // Parse the response as CommentsPage type
      initialPageParam: null as string | null, // Initial page parameter is null
      getNextPageParam: (firstPage) => firstPage.previousCursor, // Get the next page parameter from the first page
      select: (data) => ({ // Select and transform the data
        pages: [...data.pages].reverse(), // Reverse the order of pages
        pageParams: [...data.pageParams].reverse(), // Reverse the order of page parameters
      }),
    });

  const comments = data?.pages.flatMap((page) => page.comments) || [];

  return (
    <div className="space-y-3">
      <CommentInput post={post} />
      {hasNextPage && (
        <Button
          variant="link"
          className="mx-auto block"
          disabled={isFetching}
          onClick={() => fetchNextPage()}
        >
          Load previous comments
        </Button>
      )}
      {status === "pending" && <Loader2 className="mx-auto animate-spin" />}
      {status === "success" && !comments.length && (
        <p className="text-center text-muted-foreground">No comments yet.</p>
      )}
      {status === "error" && (
        <p className="text-center text-destructive">
          An error occurred while loading comments.
        </p>
      )}
      <div className="divide-y">
        {comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
}