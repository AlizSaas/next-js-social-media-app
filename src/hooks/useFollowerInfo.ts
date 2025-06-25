import kyInstance from "@/lib/ky";
import { FollowerInfo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export default function useFollowerInfo(
  userId: string,
  initialState: FollowerInfo,
) {
  const query = useQuery({
    queryKey: ["follower-info", userId], // Unique key for the query to prevent conflicts
    queryFn: () =>
      kyInstance.get(`/api/users/${userId}/followers`).json<FollowerInfo>(), // Fetch follower info from the API
    initialData: initialState,
    staleTime: Infinity, // Set stale time to Infinity to prevent refetching  
  });

  return query; // Return the query object directly
  // This allows you to access data, isLoading, error, etc. directly from the returned query object
} // / Use this hook in your components to get follower info 