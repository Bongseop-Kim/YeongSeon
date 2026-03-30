import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDesignSessionMessages,
  getDesignSessions,
  saveDesignSession,
  type SaveDesignSessionParams,
} from "@/entities/design";

const DESIGN_SESSIONS_QUERY_KEY = ["design-sessions"] as const;

const designSessionMessagesQueryKey = (sessionId: string) =>
  ["design-session-messages", sessionId] as const;

export function useDesignSessionsQuery() {
  return useQuery({
    queryKey: DESIGN_SESSIONS_QUERY_KEY,
    queryFn: getDesignSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDesignSessionMessagesQuery(sessionId: string) {
  return useQuery({
    queryKey: designSessionMessagesQueryKey(sessionId),
    queryFn: () => getDesignSessionMessages(sessionId),
    enabled: sessionId.length > 0,
  });
}

export function useSaveDesignSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, SaveDesignSessionParams>({
    mutationFn: saveDesignSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DESIGN_SESSIONS_QUERY_KEY,
      });
    },
  });
}
