import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { RecentMentionEnriched } from "@/hooks/useRecentMentions";
import { getRunUuidByTrip } from "@/lib/getRunId";

type Trip = {
  run_id?: string | null;
  model_id?: string | null;
  prompt_id?: string | null;
};

export function useOpenChatFromMention() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const open = useCallback(async (m: RecentMentionEnriched) => {
    const runUuid = await getRunUuidByTrip({
      run_id: m.run_id ?? null,
      model_id: m.model?.id ?? null,
      prompt_id: m.prompt?.id ?? null,
    });

    if (!runUuid) {
      toast({
        title: "Run not found",
        description: "We couldn’t resolve the chat for this mention.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/chats/${runUuid}`);
  }, [navigate, toast]);

  return { open };
}

export function useOpenChatFromTrip() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const openTrip = useCallback(async ({ run_id, model_id, prompt_id }: Trip) => {
    const id = await getRunUuidByTrip({ run_id, model_id, prompt_id });
    if (!id) {
      toast({
        title: "Run not found",
        description: "We couldn’t resolve the chat for this row.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/chats/${id}`);
  }, [navigate, toast]);

  return { openTrip };
}
