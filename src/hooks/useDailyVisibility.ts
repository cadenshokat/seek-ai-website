
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useTimeRange } from '@/hooks/useTimeRange';

export interface DailyVisibilityData {
  day: string;
  entity_id: string;
  entity_type: string;
  mentions: number;
  total_runs: number;
  platform_id?: string;
  avg_sentiment_score?: number | null;
}

export function useDailyVisibility(opts?: { ignoreBrandFilter?: boolean }) {
  const [data, setData] = useState<DailyVisibilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedBrand } = useBrands();
  const { selectedModel } = useModels();
  const { selectedRange } = useTimeRange();

  useEffect(() => {
    let isCancelled = false;

    async function fetchDailyVisibility() {
      if (isCancelled) return;

      setLoading(true);
      try {
        let query = supabase
          .from('daily_visibility_stats')
          .select('*')
          .gte('day', selectedRange.start.toISOString().split('T')[0])
          .lte('day', selectedRange.end.toISOString().split('T')[0])
          .order('day');

        if (selectedBrand && !opts?.ignoreBrandFilter) {
          query = query.eq('entity_id', selectedBrand);
        }
        if (selectedModel) {
          query = query.eq('platform_id', selectedModel);
        }

        const { data: visibilityData, error } = await query;
        if (error) throw error;
        if (isCancelled) return;

        setData(visibilityData || []);
      } catch (error) {
        if (!isCancelled) console.error('Error fetching daily visibility data:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchDailyVisibility();
    return () => { isCancelled = true; };
  }, [selectedBrand, selectedModel, selectedRange, opts?.ignoreBrandFilter]);

  return { data, loading };
}
