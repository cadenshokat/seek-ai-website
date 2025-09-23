import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type PlatformRow = {
  id: string;
  name: string;
  model: string;
  input_cost: number | null;   // $ per 1K input tokens
  output_cost: number | null;  // $ per 1K output tokens
};

type RunRow = {
  run_at: string;
  input_tokens: number | null;
  output_tokens: number | null;
  model_id?: string | null;    // needed for "All models"
};

const toISO = (d: Date) => new Date(d).toISOString();
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// simple palette
const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
  "#8b5cf6", "#22c55e", "#eab308", "#f97316", "#ec4899",
  "#14b8a6", "#84cc16", "#0ea5e9", "#d946ef", "#64748b",
];

export default function Billing() {
  const { toast } = useToast();
  const { selectedModel, getSelectedModelName } = useModels();
  const { selectedRange } = useTimeRange();

  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isAllModels =
    selectedModel === "ALL" ||
    selectedModel === "all" ||
    selectedModel === "*" ||
    getSelectedModelName?.().toLowerCase?.() === "all models";

  useEffect(() => {
    (async () => {
      if (!selectedModel && !isAllModels) {
        setPlatforms([]);
        setRuns([]);
        return;
      }
      try {
        setLoading(true);
        const startISO = toISO(selectedRange.start);
        const endISO = toISO(selectedRange.end);

        if (isAllModels) {
          const { data: plats, error: pErr } = await supabase
            .from("platforms")
            .select("id,name,model,input_cost,output_cost");
          if (pErr) throw pErr;
          setPlatforms((plats || []) as PlatformRow[]);

          const { data: runRows, error: rErr } = await supabase
            .from("runs")
            .select("run_at,input_tokens,output_tokens,model_id")
            .gte("run_at", startISO)
            .lte("run_at", endISO);
          if (rErr) throw rErr;
          setRuns((runRows || []) as RunRow[]);
        } else {
          const { data: plat, error: pErr } = await supabase
            .from("platforms")
            .select("id,name,model,input_cost,output_cost")
            .eq("id", selectedModel)
            .single();
          if (pErr) throw pErr;
          setPlatforms(plat ? [plat as PlatformRow] : []);

          const { data: runRows, error: rErr } = await supabase
            .from("runs")
            .select("run_at,input_tokens,output_tokens")
            .eq("model_id", selectedModel)
            .gte("run_at", startISO)
            .lte("run_at", endISO);
          if (rErr) throw rErr;
          setRuns((runRows || []) as RunRow[]);
        }
      } catch (e) {
        console.error(e);
        toast({
          title: "Failed to load billing data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedModel, isAllModels, selectedRange]);

  const { chartData, series, totalCost } = useMemo(() => {
    if (!platforms.length || !runs.length) {
      return { chartData: [] as any[], series: [] as { key: string; label: string; color: string }[], totalCost: 0 };
    }

    const priceById = new Map<string, { inRate: number; outRate: number; label: string }>();
    platforms.forEach((p) => {
      const inRate = p.input_cost ?? 0;
      const outRate = p.output_cost ?? 0;
      const label = p.model || p.name || p.id;
      priceById.set(p.id, { inRate, outRate, label });
    });

    const daySet = new Set<string>();
    const agg: Record<string, Record<string, { inTok: number; outTok: number }>> = {};

    runs.forEach((r) => {
      const day = (r.run_at || "").slice(0, 10);
      if (!day) return;
      daySet.add(day);
      const mid = (r.model_id || platforms[0]?.id) as string;
      agg[mid] ??= {};
      agg[mid][day] ??= { inTok: 0, outTok: 0 };
      agg[mid][day].inTok += r.input_tokens ?? 0;
      agg[mid][day].outTok += r.output_tokens ?? 0;
    });

    const daysSorted = Array.from(daySet).sort((a, b) => +new Date(a) - +new Date(b));

    const modelIdsWithData = Object.keys(agg);
    const series = modelIdsWithData.map((mid, i) => {
      const label = priceById.get(mid)?.label ?? mid;
      const color = COLORS[i % COLORS.length];
      return { key: `m_${mid}`, label, color };
    });

    const rows = daysSorted.map((day) => {
      const row: any = { date: fmtDay(day) };
      modelIdsWithData.forEach((mid) => {
        const sums = agg[mid][day];
        if (!sums) {
          row[`m_${mid}`] = 0;
          return;
        }
        const pr = priceById.get(mid);
        const inRate = pr?.inRate ?? 0;
        const outRate = pr?.outRate ?? 0;
        const cost = (sums.inTok / 1_000_000) * inRate + (sums.outTok / 1_000_000) * outRate;
        row[`m_${mid}`] = +cost.toFixed(4);
      });
      return row;
    });

    const totalCost = rows.reduce((sum: number, row: any) => {
      return sum + series.reduce((s, ser) => s + (row[ser.key] ?? 0), 0);
    }, 0);

    return { chartData: rows, series, totalCost };
  }, [platforms, runs]);

  if (!selectedModel && !isAllModels) {
    return (
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-900">Billing</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select a model to view costs for the chosen time range.
        </p>
      </Card>
    );
  }

  const titleLabel = isAllModels ? "All Models" : getSelectedModelName();
  const config = useMemo(() => {
    const cfg: Record<string, { label: string }> = {};
    series.forEach((s) => (cfg[s.key] = { label: s.label }));
    return cfg;
  }, [series]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Billing</h3>
          <p className="text-sm text-gray-500">
            {titleLabel} • Total:{" "}
            <span className="font-semibold">
              {totalCost.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-md overflow-hidden w-full">
        <ChartContainer config={config} className="w-full mt-4">
          <ResponsiveContainer width="100%" aspect={3}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                padding={{ left: 12, right: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) =>
                  v.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {loading && <div className="mt-4 text-sm text-gray-500">Loading costs…</div>}
    </div>
  );
}
