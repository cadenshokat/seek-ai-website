import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecTarget {
  rec_id: string;
  target_type: string | null;
  target_value: string | null;
}

export function useRecTargets() {
  const [data, setData] = useState<RecTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchTargets() {
      if (isCancelled) return;
      setLoading(true);
      try {
        const { data, error } = await (supabase
          .from('rec_targets' as any) as any)
          .select('rec_id, target_type, target_value');
        if (error) throw error;
        if (isCancelled) return;
        setData(((data as unknown) as RecTarget[]) || []);
      } catch (err) {
        if (!isCancelled) setError(err instanceof Error ? err.message : "Failed to fetch targets");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTargets();
    return () => {
      isCancelled = true;
    };
  }, []);

  return { data, loading, error };
}
