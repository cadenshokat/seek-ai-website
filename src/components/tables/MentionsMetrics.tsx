
import React, { useMemo } from 'react';
import { useBrands } from '@/hooks/useBrands';
import { DailyVisibilityData } from '@/hooks/useDailyVisibility';

interface BrandMetric {
  id: string;
  name: string;
  logo: string;
  position: number;
  sentiment: number;
  visibility: number;
  color?: string;
  mentions: number;
}

interface MentionsMetricsProps {
  data: DailyVisibilityData[];
  loading: boolean;
}

export function MentionsMetrics({ data, loading }: MentionsMetricsProps) {
  const { getBrandOptions } = useBrands();

  const metrics = useMemo((): BrandMetric[] => {
    const brandOptions = getBrandOptions;
    
    // Group by entity and calculate averages
    const entityMetrics: Record<string, { mentions: number[], totalRuns: number[] }> = {};
    
    data.forEach((item) => {
      if (!entityMetrics[item.entity_id]) {
        entityMetrics[item.entity_id] = { mentions: [], totalRuns: [] };
      }
      entityMetrics[item.entity_id].mentions.push(item.mentions);
      entityMetrics[item.entity_id].totalRuns.push(item.total_runs);
    });

    const brandMetrics: BrandMetric[] = Object.entries(entityMetrics).map(([entityId, data], index) => {
      const brand = brandOptions.find(b => b.id === entityId);
      const avgMentions = data.mentions.reduce((a, b) => a + b, 0) / data.mentions.length;
      const avgTotalRuns = data.totalRuns.reduce((a, b) => a + b, 0) / data.totalRuns.length;
      const visibility = avgTotalRuns ? (avgMentions / avgTotalRuns) * 100 : 0;
      
      return {
        id: entityId,
        name: brand?.name || 'Unknown',
        logo: brand?.logo || 'None',
        position: index + 1,
        sentiment: 70 + Math.random() * 20, // Mock sentiment data
        visibility: Math.round(visibility),
        color: brand?.color,
        mentions: avgMentions 
      };
    });

    // Sort by visibility descending
    brandMetrics.sort((a, b) => b.visibility - a.visibility);
    
    // Update positions
    brandMetrics.forEach((metric, index) => {
      metric.position = index + 1;
    });

    return brandMetrics.slice(0, 5); // Top 5
  }, [data, getBrandOptions]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg ml-1">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900">Industry Ranking</h3>
        <p className="text-sm text-gray-500">Brands with highest visibility</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 font-medium text-gray-500 text-xs">#</th>
              <th className="text-left py-3 font-medium text-gray-500 text-xs">Brand</th>
              <th className="text-center py-3 font-medium text-gray-500 text-xs">Position</th>
              <th className="text-center py-3 font-medium text-gray-500 text-xs">Sentiment</th>
              <th className="text-center py-3 font-medium text-gray-500 text-xs">Visibility</th>
              <th className="text-center py-3 font-medium text-gray-500 text-xs">Mentions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id} className="border-b border-gray-50">
                <td className="py-2 text-sm font-medium text-gray-900">
                  {metric.position}
                </td>
                <td className="py-2">
                  <div className="flex items-center space-x-2">
                    {metric.logo && (
                      <img 
                        className="w-5 h-5 rounded-full" 
                        src={metric.logo}
                        alt={metric.name}
                      />
                    )}
                    <span className="text-xs font-medium text-gray-900">
                      {metric.name}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-center">
                  <span className="text-xs text-gray-900">
                    {metric.position}.0
                  </span>
                </td>
                <td className="py-2 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-900">
                      {Math.round(metric.sentiment)}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-center">
                  <span className="text-xs font-medium text-gray-900">
                    {metric.visibility}%
                  </span>
                </td>
                <td className="py-2 text-center">
                  <span className="text-xs font-medium text-gray-900">
                    {metric.mentions}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="text-sm text-blue-600 hover:text-blue-700">
          All Data
        </button>
      </div>
    </div>
  );
}
