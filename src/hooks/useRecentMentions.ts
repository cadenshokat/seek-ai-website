import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";   // for filtering by selected brand id (optional)
import { useModels } from "@/hooks/useModels";   // for filtering by selected model id (optional)
import { useTimeRange } from "@/hooks/useTimeRange";

export type EntityType = "brand" | "rbrand" | "competitor";

export interface RecentMentionEnriched {
  id: string;
  sentence: string | null;
  position: number | null;
  date: string;

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
        let query = supabase
          .from("v_recent_mentions_enriched")
          .select(
            `
            id, sentence, position, date,
            entity_id, entity_type, model_id, prompt_id,
            brand_name, brand_logo,
            model_name, model_logo,
            prompt_text
          `
          )
          .gte("date", selectedRange.start.toISOString())
          .lte("date", selectedRange.end.toISOString())
          .order("date", { ascending: false })
          .limit(limit);

        if (selectedBrand) {
          // Filters by the entity UUID regardless of which table it originated from
          query = query.eq("entity_id", selectedBrand);
        }
        if (selectedModel) {
          query = query.eq("model_id", selectedModel);
        }

        const { data: rows, error } = await query;
        if (error) throw error;
        if (cancelled) return;

        const mapped: RecentMentionEnriched[] = (rows ?? []).map((r: any) => ({
          id: r.id,
          sentence: r.sentence ?? null,
          position: r.position ?? null,
          date: r.date,
          entity:
            r.entity_id || r.entity_type
              ? {
                  id: r.entity_id ?? null,
                  type: (r.entity_type ?? null) as EntityType | null,
                  name: r.brand_name ?? null,
                  logo: r.brand_logo ?? null,
                }
              : null,
          model: r.model_id
            ? {
                id: r.model_id,
                name: r.model_name ?? null,
                logo: r.model_logo ?? null,
              }
            : null,
          prompt: r.prompt_id
            ? {
                id: r.prompt_id,
                text: r.prompt_text ?? null,
              }
            : null,
        }));

        setData(mapped);
      } catch (e) {
        if (!cancelled) {
          console.error("Error fetching enriched recent mentions:", e);
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
