import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrands } from '@/hooks/useBrands';
import { DailyVisibilityData } from '@/hooks/useDailyVisibility';

type ChartRow = { date: string; [brand: string]: number | string };

interface VisibilityChartProps {
  data: DailyVisibilityData[];
  loading: boolean;
  selectedBrand: string | null;
}

export function VisibilityChart({ data, loading, selectedBrand }: VisibilityChartProps) {
  const { getBrandOptions } = useBrands();

  const { chartData, seriesKeys, colorFor } = useMemo(() => {
    const brandOptions = getBrandOptions;
    const idToMeta = new Map(
      brandOptions.map(b => [b.id, { name: b.name, color: b.color }])
    );

    const byDay: Record<string, Record<string, number>> = {};
    for (const row of data) {
      (byDay[row.day] ??= {});
      byDay[row.day][row.entity_id] = (byDay[row.day][row.entity_id] ?? 0) + row.mentions;
    }

    const formatDay = (day: string) => {
      const [y, m, d] = day.split('-').map(Number);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
        .format(new Date(y, (m ?? 1) - 1, d ?? 1));
    };

    const rows: ChartRow[] = [];
    const allSeries = new Set<string>();

    const selectedName = selectedBrand
      ? (idToMeta.get(selectedBrand)?.name ?? 'Selected')
      : null;

    for (const [day, entities] of Object.entries(byDay).sort(([a],[b]) => (a < b ? -1 : 1))) {
      const total = Object.values(entities).reduce((s, v) => s + v, 0);
      const row: Record<string, number | string> = { date: formatDay(day) };

      if (selectedBrand) {
        const mentions = entities[selectedBrand] ?? 0;
        row[selectedName as string] = total ? (mentions / total) * 100 : 0;
        allSeries.add(selectedName as string);
      } else {
        for (const [id, mentions] of Object.entries(entities)) {
          const name = idToMeta.get(id)?.name ?? 'Unknown';
          row[name] = total ? (mentions / total) * 100 : 0;
          allSeries.add(name);
        }
      }
      rows.push(row as ChartRow);
    }

    const colorFor = (series: string, index: number) => {
      if (selectedBrand && series === (idToMeta.get(selectedBrand)?.name ?? 'Selected')) {
        return idToMeta.get(selectedBrand)?.color ?? `hsl(${index * 60}, 70%, 50%)`;
      }
      return `hsl(${index * 60}, 70%, 50%)`;
    };

    return { chartData: rows, seriesKeys: Array.from(allSeries), colorFor };
  }, [data, getBrandOptions, selectedBrand]);

  const chartConfig = { visibility: { label: 'Visibility % (daily SOV)' } };


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
              {seriesKeys.map((key, index) => (
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
