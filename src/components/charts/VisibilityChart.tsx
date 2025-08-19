
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrands } from '@/hooks/useBrands';
import { DailyVisibilityData } from '@/hooks/useDailyVisibility';

interface VisibilityData {
  date: string;
  [key: string]: number | string;
}

interface VisibilityChartProps {
  data: DailyVisibilityData[];
  loading: boolean;
}

export function VisibilityChart({ data, loading }: VisibilityChartProps) {
  const { getBrandOptions } = useBrands();

  const chartData = useMemo((): VisibilityData[] => {
    const brandOptions = getBrandOptions;
    
    // Group data by date and entity
    const groupedData: Record<string, Record<string, number>> = {};

    data.forEach((item) => {
      const date = item.day;
      if (!groupedData[date]) {
        groupedData[date] = {};
      }

      const entityName = brandOptions.find(b => b.id === item.entity_id)?.name || 'Unknown';
      const percentage = item.total_runs ? (item.mentions / item.total_runs) * 100 : 0;
      
      groupedData[date][entityName] = percentage;
    });

    // Convert to chart format
    return Object.entries(groupedData).map(([date, entities]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...entities
    }));
  }, [data, getBrandOptions]);

  const chartConfig = {
    visibility: {
      label: "Visibility %",
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
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 ml-1">Visibility</h3>
          <p className="text-sm text-gray-500 ml-1">Percentage of chats mentioning each brand</p>
        </div>
        <Button variant="outline" size="sm" className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
      </div>
      
      <div className="rounded-md overflow-hidden w-full">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" aspect={1.9}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                padding={{ left: 12, right: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}%`}
              
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {Object.keys(chartData[0] || {}).filter(key => key !== 'date').map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`hsl(${index * 60}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
