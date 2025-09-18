import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";

export type EntityType = "brand" | "rbrand" | "competitor";

export interface RecentMentionEnriched {
  id: string;
  sentence: string | null;
  position: number | null;
  date: string;
  run_id: string | null;

  entity: {
    id: string | null;
    type: EntityType | null;
    name: string | null;
    logo?: string | null;
  } | null;

  model: {
    id: string | null;
    name: string | null;
    logo?: string | null;
  } | null;

  prompt: {
    id: string | null;
    text: string | null;
  } | null;
}

type RpcRow = {
  id: string;
  sentence: string | null;
  position: number | null;
  run_id: string | null;
  date: string; // timestamptz comes back as ISO string
  entity_id: string | null;
  entity_type: EntityType | null;
  brand_name: string | null;
  brand_logo: string | null;
  model_id: string | null;
  model_name: string | null;
  model_logo: string | null;
  prompt_id: string | null;
  prompt_text: string | null;
};

export function useRecentMentions(limit = 10) {
  const [data, setData] = useState<RecentMentionEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selectedBrand } = useBrands();   // UUID or null
  const { selectedModel } = useModels();   // UUID or null
  const { selectedRange } = useTimeRange();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rows, error } = await supabase.rpc(
          "get_recent_mentions_enriched",
          {
            p_start: selectedRange.start.toISOString(),
            p_end: selectedRange.end.toISOString(),
            p_entity_id: selectedBrand ?? null,
            p_model_id: selectedModel ?? null,
            p_limit: limit,
          }
        );

        const mapped: RecentMentionEnriched[] = (rows ?? []).map((r) => ({
          id: r.id,
          sentence: r.sentence ?? null,
          position: r.position ?? null,
          date: r.date,
          run_id: r.run_id ?? null,        // <-- ADD THIS LINE
          entity: r.entity_id || r.entity_type
            ? {
                id: r.entity_id ?? null,
                type: (r.entity_type ?? null) as EntityType | null,
                name: r.brand_name ?? null,
                logo: r.brand_logo ?? null,
              }
            : null,
          model: r.model_id
            ? { id: r.model_id, name: r.model_name ?? null, logo: r.model_logo ?? null }
            : null,
          prompt: r.prompt_id
            ? { id: r.prompt_id, text: r.prompt_text ?? null }
            : null,
        }));


        setData(mapped);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching enriched recent mentions (RPC):", e);
          setError(e instanceof Error ? e.message : "Failed to fetch recent mentions");
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBrand, selectedModel, selectedRange, limit]);

  return { data, loading, error };
}
