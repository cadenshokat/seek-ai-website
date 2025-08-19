
import React, { useMemo } from 'react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useBrands } from '@/hooks/useBrands';
import { DailyVisibilityData } from '@/hooks/useDailyVisibility';

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface VisibilityPieChartProps {
  data: DailyVisibilityData[];
  loading: boolean;
}

export function VisibilityPieChart({ data, loading }: VisibilityPieChartProps) {
  const { getBrandOptions } = useBrands();

  const pieData = useMemo((): PieData[] => {
    const brandOptions = getBrandOptions;
    
    // Group by entity and calculate totals
    const entityTotals: Record<string, { mentions: number, totalRuns: number }> = {};
    
    data.forEach((item) => {
      if (!entityTotals[item.entity_id]) {
        entityTotals[item.entity_id] = { mentions: 0, totalRuns: 0 };
      }
      entityTotals[item.entity_id].mentions += item.mentions;
      entityTotals[item.entity_id].totalRuns += item.total_runs;
    });

    const colors = ['#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f59e0b'];
    
    return Object.entries(entityTotals).map(([entityId, totals], index) => {
      const brand = brandOptions.find(b => b.id === entityId);
      const visibility = totals.totalRuns ? (totals.mentions / totals.totalRuns) * 100 : 0;
      
      return {
        name: brand?.name || 'Unknown',
        value: Math.round(visibility),
        color: brand?.color || colors[index % colors.length]
      };
    }).slice(0, 5); // Top 5
  }, [data, getBrandOptions]);

  const chartConfig = {
    visibility: {
      label: "Brand Distribution",
    },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg ml-1">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900">Brand Distribution</h3>
        <p className="text-sm text-gray-500">Visibility across brands</p>
      </div>
      
      <div className="h-74">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      <div className="mt-4 space-y-2">
        {pieData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="font-medium text-gray-900">{item.value}%</span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100">
          <button className="text-sm text-blue-600 hover:text-blue-700">
            All Brands
          </button>
        </div>
      </div>
    </div>
  );
}
