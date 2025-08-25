import React, { useMemo } from 'react';
import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useBrands } from '@/hooks/useBrands';
import { DailyVisibilityData } from '@/hooks/useDailyVisibility';

interface PieData { name: string; value: number; color: string; logo: string; isOther?: boolean; }

const RAD = Math.PI / 180;
const renderLabel: any = ({ cx, cy, midAngle, outerRadius, percent, payload }: any) => {
  const r = outerRadius + 30;                      
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx ? 'start' : 'end';
  const pct = (percent * 100).toFixed(0);
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fill="#374151" fontSize={12}>
      {payload.name}
    </text>
  );
};

export function VisibilityPieChart({ data, loading, selectedBrand }: { data: DailyVisibilityData[]; loading: boolean; selectedBrand: string | null; }) {
  const { getBrandOptions } = useBrands(); // this is an ARRAY in your context

  const pieData = useMemo<PieData[]>(() => {
    const brandOptions = getBrandOptions;

    // Sum mentions per entity per day, then across days
    const perDay: Record<string, Record<string, number>> = {};
    for (const row of data) {
      perDay[row.day] ??= {};
      perDay[row.day][row.entity_id] = (perDay[row.day][row.entity_id] ?? 0) + row.mentions;
    }
    const byEntity: Record<string, number> = {};
    for (const ents of Object.values(perDay)) {
      for (const [id, m] of Object.entries(ents)) byEntity[id] = (byEntity[id] ?? 0) + m;
    }

    const total = Object.values(byEntity).reduce((s, v) => s + v, 0);
    if (!total) return [];

    const palette = ['#3b82f6','#ef4444','#8b5cf6','#10b981','#f59e0b','#06b6d4','#f43f5e','#84cc16'];

    // If a brand is selected: show [Brand, Other]
    if (selectedBrand) {
      const brandMeta = brandOptions.find(b => b.id === selectedBrand);
      const brandName = brandMeta?.name ?? 'Selected';
      const brandColor = brandMeta?.color ?? palette[0];
      const brandLogo = brandMeta?.logo ?? null;

      const brandMentions = byEntity[selectedBrand] ?? 0;
      const otherMentions = Math.max(0, total - brandMentions);

      return [
        { name: brandName, value: (brandMentions / total) * 100, color: brandColor, logo: brandLogo, isOther: false },
        { name: 'Other',    value: (otherMentions / total) * 100, color: '#e5e7eb', logo: null, isOther: true },
      ];
    }

    const entries = Object.entries(byEntity).map(([id, mentions]) => {
      const brand = brandOptions.find(b => b.id === id);
      return { name: brand?.name ?? 'Unknown', mentions, color: brand?.color, logo: brand?.logo };
    });
    entries.sort((a, b) => b.mentions - a.mentions);

    const top = entries.slice(0, 8);
    const rest = entries.slice(8).reduce((s, e) => s + e.mentions, 0);

    const result: PieData[] = top.map((e, i) => ({
      name: e.name,
      logo: e.logo ?? null,
      value: (e.mentions / total) * 100,
      color: e.color ?? palette[i % palette.length],
    }));
    if (rest > 0) result.push({ name: 'Other', value: (rest / total) * 100, color: '#e5e7eb', logo: null, isOther: true });
    return result;
  }, [data, selectedBrand, getBrandOptions]);

  const chartConfig = { visibility: { label: 'Brand Distribution' } };


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
        <p className="text-sm text-gray-500">Share of mentions across brands</p>
      </div>

      <div className="">
        <ChartContainer config={chartConfig} className=" h-[300px] w-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 60, right: 24, bottom: 64, left: 24 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"              
                innerRadius={72}
                outerRadius={100}     
                dataKey="value"
                nameKey="name"
                labelLine
                label={renderLabel}
                isAnimationActive={false}
              >
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="mt-4 space-y-2">
        {pieData.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {(!item.isOther && item.logo) ? (
                <img src={item.logo} alt={item.name} className="w-5 h-5 rounded-full object-contain bg-white" />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="font-medium text-gray-900">{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
