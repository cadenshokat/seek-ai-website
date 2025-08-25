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
  AreaChart,
  Area,
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
};

type DailyCost = {
  day: string;     // YYYY-MM-DD
  cost: number;    // USD
  inTok: number;   // summed tokens (optional for debugging/extension)
  outTok: number;
};

const toISO = (d: Date) => new Date(d).toISOString();
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function Billing() {
  const { toast } = useToast();
  const { selectedModel, getSelectedModelName } = useModels();
  const { selectedRange } = useTimeRange();

  const [pricing, setPricing] = useState<PlatformRow | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  // fetch pricing + runs
  useEffect(() => {
    (async () => {
      if (!selectedModel) {
        setPricing(null);
        setRuns([]);
        return;
      }
      try {
        setLoading(true);
        const startISO = toISO(selectedRange.start);
        const endISO = toISO(selectedRange.end);

        // pricing for selected model
        const { data: plat, error: pErr } = await supabase
          .from("platforms")
          .select("id,name,model,input_cost,output_cost")
          .eq("id", selectedModel)
          .single();
        if (pErr) throw pErr;
        setPricing(plat as PlatformRow);

        // all runs for selected model in range
        const { data: runRows, error: rErr } = await supabase
          .from("runs")
          .select("run_at,input_tokens,output_tokens")
          .eq("model_id", selectedModel)
          .gte("run_at", startISO)
          .lte("run_at", endISO);
        if (rErr) throw rErr;

        setRuns((runRows || []) as RunRow[]);
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
  }, [selectedModel, selectedRange, toast]);

  const dailyCosts: DailyCost[] = useMemo(() => {
    if (!pricing) return [];
    const inRate = pricing.input_cost ?? 0;   
    const outRate = pricing.output_cost ?? 0;

    const byDay: Record<string, { inTok: number; outTok: number }> = {};
    runs.forEach((r) => {
      const day = (r.run_at || "").slice(0, 10);
      if (!day) return;
      const inTok = r.input_tokens ?? 0;
      const outTok = r.output_tokens ?? 0;
      byDay[day] ??= { inTok: 0, outTok: 0 };
      byDay[day].inTok += inTok;
      byDay[day].outTok += outTok;
    });

    const out: DailyCost[] = Object.entries(byDay)
      .sort(([a], [b]) => +new Date(a) - +new Date(b))
      .map(([day, v]) => {
        const cost = (v.inTok / 1_000_000) * inRate + (v.outTok / 1_000_000) * outRate;
        return { day, cost, inTok: v.inTok, outTok: v.outTok };
      });

    return out;
  }, [runs, pricing]);

  const chartData = useMemo(
    () => dailyCosts.map((d) => ({ date: fmtDay(d.day), cost: +d.cost.toFixed(4) })),
    [dailyCosts]
  );

  const totalCost = useMemo(
    () => dailyCosts.reduce((s, d) => s + d.cost, 0),
    [dailyCosts]
  );

  // UI states
  if (!selectedModel) {
    return (
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-900">Billing</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select a model to view costs for the chosen time range.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Billing</h3>
          <p className="text-sm text-gray-500">
            {getSelectedModelName()} • Total:{" "}
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
        <ChartContainer config={{ cost: { label: "Cost (USD)" } }} className="w-full h-[720] mt-9" style={{ height: 800 }}>
          <ResponsiveContainer width="100%" aspect={3}>
            <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
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
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#6366f1"
                fill="rgba(99,102,241,0.15)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-gray-500">Loading costs…</div>
      )}
    </Card>
  );
}
