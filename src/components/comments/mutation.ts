import { CommentsPage } from "@/lib/types";
import {
  InfiniteData,
  QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import { deleteComment, submitComment } from "./action";

export function useSubmitCommentMutation(postId: string) {
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: submitComment,
    onSuccess: async (newComment) => {
      const queryKey: QueryKey = ["comments", postId]; // This is the query key for the comments of a specific post

      await queryClient.cancelQueries({ queryKey }); // Cancel any ongoing queries for this key

      queryClient.setQueryData<InfiniteData<CommentsPage, string | null>>( // Update the cache with the new comment
        queryKey, // Use the same query key to update the comments
        (oldData) => { // Get the old data for this query key
          const firstPage = oldData?.pages[0]; // Get the first page of comments

          if (firstPage) { // If there is a first page, we can add the new comment to it
            return {
              pageParams: oldData.pageParams, // Keep the existing page parameters
              pages: [ 
                {
                  previousCursor: firstPage.previousCursor, // Keep the previous cursor from the first page
                  comments: [...firstPage.comments, newComment], // Add the new comment to the first page
                },
                ...oldData.pages.slice(1), // Keep the rest of the pages unchanged
              ],
            };
          }
        },
      );

      queryClient.invalidateQueries({ // Invalidate the queries for the comments of this post
        queryKey, // This will refetch the comments if needed
        predicate(query) { // Predicate to check if the query is for the comments of this post
          return !query.state.data; // Only invalidate if there is no data in the query state
        },
      });

      toast({
        description: "Comment created", // Show a success toast
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to submit comment. Please try again.",
      });
    },
  });

  return mutation; // Return the mutation object to be used in the component
}

export function useDeleteCommentMutation() {
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: async (deletedComment) => {
      const queryKey: QueryKey = ["comments", deletedComment.postId]; // This is the query key for the comments of the post where the comment was deleted

      await queryClient.cancelQueries({ queryKey }); // Cancel any ongoing queries for this key

      queryClient.setQueryData<InfiniteData<CommentsPage, string | null>>( // Update the cache to remove the deleted comment
        queryKey, // Use the same query key to update the comments
        (oldData) => { // Get the old data for this query key
          if (!oldData) return; // If there is no old data, we cannot update it

          return {
            pageParams: oldData.pageParams, // Keep the existing page parameters
            pages: oldData.pages.map((page) => ({ // Map through each page of comments
              previousCursor: page.previousCursor, // Keep the previous cursor from the page
              comments: page.comments.filter((c) => c.id !== deletedComment.id), // Filter out the deleted comment from the comments array
            })),
          };
        },
      );

      toast({
        description: "Comment deleted",
      });
    },
    onError(error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to delete comment. Please try again.",
      });
    },
  });

  return mutation; // Return the mutation object to be used in the component
}