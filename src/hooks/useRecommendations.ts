import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Recommendation {
  id: string;
  title?: string | null;
  recommendation?: string | null;
  status?: string | null;
  effort?: number | null;
  impact?: number | null;
  confidence?: number | null;
  owner?: string | null;
  created_at: string;
  priority?: number | null;
  type?: string | null; // optional - not in schema but supported if exists
  detail_md?: string | null;
}

export function useRecommendations(params?: {
  type?: string;
  status?: string;
  priority?: number | string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const [data, setData] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { type, status, priority, search, page = 1, pageSize = 10 } = params || {};

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      if (cancelled) return;
      setLoading(true);
      try {
        let query: any = (supabase.from('recommendation' as any) as any)
          .select('*', { count: 'exact' });

        if (type) query = query.eq('type', type);
        if (status) query = query.eq('status', status);
        if (priority !== undefined && priority !== null && priority !== '') {
          const p = typeof priority === 'string' ? parseInt(priority) : priority;
          if (!Number.isNaN(p)) query = query.eq('priority', p);
        }
        if (search && search.trim()) {
          const s = `%${search.trim()}%`;
          query = query.or(`title.ilike.${s},detail_md.ilike.${s},owner.ilike.${s}`);
        }

        query = query.order('priority', { ascending: true }).order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await query;

        if (error) throw error;
        if (cancelled) return;

        setData((data as Recommendation[]) || []);
        setTotal(count ?? 0);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, [type, status, priority, search, page, pageSize]);

  return { data, total, isLoading: loading, loading, error };
}
