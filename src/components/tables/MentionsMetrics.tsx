
import React, { useMemo, useState } from 'react';
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
  const [showAll, setShowAll] = useState(false);


  const brandMetrics = useMemo((): BrandMetric[] => {
    const brandOptions = getBrandOptions;
    
    const entityMetrics: Record<string, { mentions: number[], totalRuns: number[], sentiments: number[] }> = {};
    
    data.forEach((item) => {
      if (!entityMetrics[item.entity_id]) {
        entityMetrics[item.entity_id] = { mentions: [], totalRuns: [], sentiments: [] };
      }
      entityMetrics[item.entity_id].mentions.push(item.mentions);
      entityMetrics[item.entity_id].totalRuns.push(item.total_runs);

      if (typeof item.avg_sentiment_score === 'number') {
        entityMetrics[item.entity_id].sentiments.push(item.avg_sentiment_score);
      }
    });

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const toPillPercent = (s: number) => {
      const pct = ((s + 1) / 2) * 100;
      return Math.max(0, Math.min(100, pct));
    };

    const brandMetrics: BrandMetric[] = Object.entries(entityMetrics).map(([entityId, data], index) => {
      const brand = brandOptions.find(b => b.id === entityId);
      const sentimentRaw = data.sentiments.length ? avg(data.sentiments) : null;
      const sentiment = typeof sentimentRaw === 'number' ? toPillPercent(sentimentRaw): null;
      const avgMentions = data.mentions.reduce((a, b) => a + b, 0) / data.mentions.length;
      const avgTotalRuns = data.totalRuns.reduce((a, b) => a + b, 0) / data.totalRuns.length;
      const visibility = avgTotalRuns ? (avgMentions / avgTotalRuns) * 100 : 0;
      
      return {
        id: entityId,
        name: brand?.name || 'Unknown',
        logo: brand?.logo || 'None',
        position: index + 1,
        sentiment: sentiment, 
        visibility: Math.round(visibility),
        color: brand?.color,
        mentions: Math.round(avgMentions)
      };
    });

    brandMetrics.sort((a, b) => b.visibility - a.visibility);
    
    brandMetrics.forEach((metric, index) => {
      metric.position = index + 1;
    });

    return brandMetrics;
  }, [data, getBrandOptions]);

  const metrics = useMemo(
    () => (showAll ? brandMetrics : brandMetrics.slice(0, 5)),
    [brandMetrics, showAll]
  );

  const SentimentPill = ({ n }: { n: number | null }) => {
    if (n == null) return <span>—</span>;

    const bgClass =
      n >= 90 ? "bg-[#86efac]"
      : n >= 70 ? "bg-[#bef264]"
      : n >= 50 ? "bg-[#fde047]"
      : n >= 30 ? "bg-[#fdba74]"
      : "bg-[#fca5a5]";

    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${bgClass}`} />
        {n}
      </span>
    );
  };

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
                    <span className="text-xs text-gray-900">
                      <SentimentPill n={Math.round(metric.sentiment)}/>
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
      
      <div className="mt-4">
        <button
          className="text-sm text-blue-600 hover:text-blue-700"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          aria-controls="industry-ranking-table"
        >
          {showAll ? 'Show Less' : 'All Data'}
        </button>
      </div>
    </div>
  );
}
