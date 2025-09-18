import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useModels } from "@/hooks/useModels";
import { Separator } from "@/components/ui/separator";

type DomainDailyRow = {
  day_utc: string; // 'YYYY-MM-DD' (UTC)
  brand_id: string | null;
  model_id: string | null;
  domain: string;
  mentions: number;
};

type UrlDailyRow = {
  day_utc: string; // 'YYYY-MM-DD' (UTC)
  brand_id: string | null;
  model_id: string | null;
  url: string;
  domain: string | null;
  type: string | null;
  mentions: number;
};

type Props = {
  brandId?: string;
  limitTop?: number;
};

const color = (i: number) => `hsl(${(i * 53) % 360}, 70%, 50%)`;

// Local day "YYYY-MM-DD"
const localDay = (d: string | Date) => {
  const x = new Date(d);
  const y = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  return `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
};

// Labels like "Sep 05"
const labelDay = (yyyy_mm_dd: string) => {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const typeClass = (t: string) => {
  const s = (t || "").toLowerCase();
  if (s.includes("ref")) return "bg-purple-100 text-purple-700 ring-1 ring-purple-200";
  if (s.includes("edit")) return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
  if (s.includes("ugc")) return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
  if (s.includes("inst")) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  if (s.includes("corp")) return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";
  if (s.includes("compet")) return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  if (s.includes("you")) return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
};

export default function Sources({ brandId, limitTop = 5 }: Props) {
  const { selectedRange } = useTimeRange();
  const { selectedModel } = useModels();

  const [domainRows, setDomainRows] = useState<DomainDailyRow[]>([]);
  const [urlRows, setUrlRows] = useState<UrlDailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Pull pre-aggregated rows from views
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const startDay = localDay(selectedRange.start); // 'YYYY-MM-DD'
        const endDay = localDay(selectedRange.end);

        let qDomain = supabase
          .from("domain_daily")
          .select("day_utc,brand_id,model_id,domain,mentions")
          .gte("day_utc", startDay)
          .lte("day_utc", endDay)
          .order("day_utc", { ascending: false })
          .order("domain", { ascending: true });

        let qUrl = supabase
          .from("url_daily")
          .select("day_utc,brand_id,model_id,url,domain,type,mentions")
          .gte("day_utc", startDay)
          .lte("day_utc", endDay)
          .order("day_utc", { ascending: false });

        if (selectedModel) {
          qDomain = qDomain.eq("model_id", selectedModel);
          qUrl = qUrl.eq("model_id", selectedModel);
        }
        if (brandId) {
          qDomain = qDomain.eq("brand_id", brandId);
          qUrl = qUrl.eq("brand_id", brandId);
        }

        const [{ data: dData, error: dErr }, { data: uData, error: uErr }] = await Promise.all([qDomain, qUrl]);
        if (dErr) throw dErr;
        if (uErr) throw uErr;

        setDomainRows((dData || []) as DomainDailyRow[]);
        setUrlRows((uData || []) as UrlDailyRow[]);
      } catch (e) {
        console.error("Failed to load daily aggregates", e);
        setDomainRows([]);
        setUrlRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRange, selectedModel, brandId]);

  // Build contiguous list of days (inclusive) based on the selected range
  const days: string[] = useMemo(() => {
    const out: string[] = [];
    const start = new Date(
      selectedRange.start.getFullYear(),
      selectedRange.start.getMonth(),
      selectedRange.start.getDate()
    );
    const end = new Date(
      selectedRange.end.getFullYear(),
      selectedRange.end.getMonth(),
      selectedRange.end.getDate()
    );
    for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      out.push(localDay(d));
    }
    return out;
  }, [selectedRange]);

  const aggregates = useMemo(() => {
    if (domainRows.length === 0 && urlRows.length === 0) {
      return {
        chart: [] as any[],
        domainTable: [] as any[],
        urlTable: [] as any[],
        topDomains: [] as string[],
      };
    }

    const dayTotals = new Map<string, number>();
    for (const r of domainRows) {
      dayTotals.set(r.day_utc, (dayTotals.get(r.day_utc) || 0) + r.mentions);
    }

    const domainTotals = new Map<string, number>();
    const domainDayCounts = new Map<string, Map<string, number>>();
    for (const r of domainRows) {
      domainTotals.set(r.domain, (domainTotals.get(r.domain) || 0) + r.mentions);
      if (!domainDayCounts.has(r.domain)) domainDayCounts.set(r.domain, new Map());
      const dmap = domainDayCounts.get(r.domain)!;
      dmap.set(r.day_utc, (dmap.get(r.day_utc) || 0) + r.mentions);
    }

    const domainTypeCounts = new Map<string, Map<string, number>>();
    for (const u of urlRows) {
      const dom = u.domain || "";
      const typ = u.type || "other";
      if (!domainTypeCounts.has(dom)) domainTypeCounts.set(dom, new Map());
      const tmap = domainTypeCounts.get(dom)!;
      tmap.set(typ, (tmap.get(typ) || 0) + u.mentions);
    }

    const grandTotal = Array.from(dayTotals.values()).reduce((a, b) => a + b, 0) || 1;

    // Domain table (sorted by total mentions)
    const domainTable = Array.from(domainTotals.entries())
      .map(([domain, count]) => {
        const tCounts = domainTypeCounts.get(domain) || new Map();
        const topType = Array.from(tCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
        const avgPerDay = count / Math.max(days.length, 1);
        return {
          domain,
          type: topType,
          count,
          usedPct: Math.round((count / grandTotal) * 100),
          avgPerDay: Number(avgPerDay.toFixed(1)),
        };
      })
      .sort((a, b) => b.count - a.count);

    const topDomains = domainTable.slice(0, Math.max(limitTop, 0)).map((d) => d.domain);

    const chart = days.map((day) => {
      const dayTotal = dayTotals.get(day) || 0;
      const row: Record<string, number | string> = { date: labelDay(day) };
      for (const dom of topDomains) {
        const c = domainDayCounts.get(dom)?.get(day) || 0;
        row[dom] = dayTotal ? Number(((c / dayTotal) * 100).toFixed(1)) : 0;
      }
      return row;
    });

    // URL table (aggregate url_daily across days)
    const urlTotals = new Map<string, { count: number; type: string; domain: string }>();
    for (const u of urlRows) {
      const prev = urlTotals.get(u.url);
      const nextCount = (prev?.count || 0) + u.mentions;
      urlTotals.set(u.url, {
        count: nextCount,
        type: prev?.type ?? (u.type || "Other"),
        domain: prev?.domain ?? (u.domain || ""),
      });
    }

    const urlTable = Array.from(urlTotals.entries())
      .map(([url, v]) => {
        const avgPerDay = v.count / Math.max(days.length, 1);
        return {
          url,
          domain: v.domain,
          type: v.type,
          count: v.count,
          usedPct: Math.round((v.count / grandTotal) * 100),
          avgPerDay: Number(avgPerDay.toFixed(1)),
        };
      })
      .sort((a, b) => b.count - a.count);

    return { chart, domainTable, urlTable, topDomains };
  }, [domainRows, urlRows, days, limitTop]);

  const hasSeries = aggregates.topDomains.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="domains" className="space-y-6">
      <TabsList className="w-38 h-10">
        <TabsTrigger value="domains">Domains</TabsTrigger>
        <TabsTrigger value="urls">URLs</TabsTrigger>
      </TabsList>

      <TabsContent value="domains" className="space-y-4">
        <div className="p-2">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900">Source Usage by Domain</h3>
            <p className="text-xs text-gray-500">
              Share of citations per day for the Top {aggregates.topDomains.length || 0} domains
            </p>
          </div>

          <ChartContainer config={{ visibility: { label: "Usage %" } }} className="w-full mt-9" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" >
              <LineChart data={aggregates.chart} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {hasSeries
                  ? aggregates.topDomains.map((dom, i) => (
                      <Line
                        key={dom}
                        type="monotone"
                        dataKey={dom}
                        stroke={color(i)}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    ))
                  : null}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <Separator />

        <div className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-medium text-gray-900">Domains</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-gray-500">
                  <th className="px-4 py-2">Domain</th>
                  <th className="px-4 py-2">Top Type</th>
                  <th className="px-4 py-2 text-right">Count</th>
                  <th className="px-4 py-2 text-right">Used</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Avg / Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aggregates.domainTable.map((r) => (
                  <tr key={r.domain} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded bg-gray-200 inline-block" />
                        <span className="text-gray-900">{r.domain}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${typeClass(r.type)}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{r.count}</td>
                    <td className="px-4 py-2 text-right">{r.usedPct}%</td>
                    <td className="px-4 py-2 text-right">{r.avgPerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="urls" className="space-y-4">
        <div className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-medium text-gray-900">URLs</h4>
            <p className="text-xs text-gray-500">All URLs cited in chats for the selected period</p>
          </div>
        </div>
        <Separator />
        <div className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-gray-500">
                  <th className="px-4 py-2">URL</th>
                  <th className="px-4 py-2">Domain</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Count</th>
                  <th className="px-4 py-2 text-right">Used</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Avg / Day</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aggregates.urlTable.map((u) => (
                  <tr key={u.url} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-words"
                      >
                        <span className="line-clamp-2 max-w-[70ch]">{u.url}</span>
                      </a>
                    </td>
                    <td className="px-4 py-2">{u.domain}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${typeClass(u.type)}`}>
                        {u.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{u.count}</td>
                    <td className="px-4 py-2 text-right">{u.usedPct}%</td>
                    <td className="px-4 py-2 text-right">{u.avgPerDay}</td>
                    <td className="px-4 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(u.url, "_blank")}
                        className="inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" /> Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
