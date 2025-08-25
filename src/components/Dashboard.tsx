
import React, { useEffect } from 'react';
import { VisibilityChart } from '@/components/charts/VisibilityChart';
import { RecentMentions } from '@/components/tables/RecentMentions';
import { MentionsMetrics } from '@/components/tables/MentionsMetrics';
import { VisibilityPieChart } from '@/components/charts/VisibilityPieChart';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useTimeRange } from '@/hooks/useTimeRange';
import { useDailyVisibility } from '@/hooks/useDailyVisibility';
import { useRecentMentions } from '@/hooks/useRecentMentions';
import { Separator } from "@/components/ui/separator"

export function Dashboard() {
  const { selectedBrand, getSelectedBrandName } = useBrands();
  const { selectedModel, getSelectedModelName } = useModels();
  const { selectedRange } = useTimeRange();
  const { data: dailyVisibilityData, loading: dailyVisibilityLoading } = useDailyVisibility();
  const { data: allVisibilityData, loading: allVisibilityLoading } = useDailyVisibility({ ignoreBrandFilter: true });
  const { data: recentMentionsData, loading: recentMentionsLoading } = useRecentMentions();

  useEffect(() => {
    console.log('Dashboard data refresh triggered by state change:', {
      brand: getSelectedBrandName,
      model: getSelectedModelName(),
      timeRange: selectedRange.label,
      dateRange: {
        start: selectedRange.start,
        end: selectedRange.end
      }
    });
  }, [selectedBrand, selectedModel, selectedRange, getSelectedBrandName, getSelectedModelName]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-6">
        <div className="min-h-full">
          <VisibilityChart data={allVisibilityData} loading={allVisibilityLoading} selectedBrand={selectedBrand}/>
        </div>
        
        <Separator orientation="vertical" className="hidden lg:block" />

        <div className="min-h-full">
          <MentionsMetrics data={dailyVisibilityData} loading={dailyVisibilityLoading} />
        </div>
      </div>

      <Separator className="my-2" />
      
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.5fr)_auto_minmax(0,1.5fr)] items-stretch gap-6">
        <div className="min-h-full">
          <RecentMentions data={recentMentionsData} loading={recentMentionsLoading} />
        </div>

        <Separator orientation="vertical" className="hidden lg:block" />

        <div className="min-h-full">
          <VisibilityPieChart data={allVisibilityData} loading={allVisibilityLoading} selectedBrand={selectedBrand}/>
        </div>
      </div>
    </div>
  );
}
