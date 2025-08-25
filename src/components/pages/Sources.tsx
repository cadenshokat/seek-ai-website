import React, { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useModels } from "@/hooks/useModels";

type SourceRow = {
  id: string;
  brand_id: string | null;
  url: string;
  type: string;
  date: string;
  run_id: string | null;
  prompt_id: string | null;
};

type Props = {
  brandId?: string;
  limitTop?: number;
};

const hsl = (i: number) => `hsl(${i * 60}, 70%, 50%)`;
const toDay = (d: string | Date) => {
  const x = new Date(d);
  const y = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
  return y.toISOString().slice(0, 10);
};
const extractDomain = (u: string) => {
  try {
    const d = new URL(u).hostname.replace(/^www\./, "");
    return d || u;
  } catch {
    const m = u.match(/^[a-z]+:\/\/([^/]+)/i);
    return (m?.[1] || u).replace(/^www\./, "");
  }
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

  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const startISO = new Date(selectedRange.start).toISOString();
      const endISO = new Date(selectedRange.end).toISOString();

      if (selectedModel) {
        const { data, error } = await supabase
          .from("all_sources")
          .select(`
            id, brand_id, url, type, date, run_id, prompt_id,
            run_logs!inner(model_id)
          `)
          .gte("date", startISO)
          .lte("date", endISO)
          .eq("run_logs.model_id", selectedModel)
          .order("date", { ascending: true });
        if (!error) setRows((data || []).map((d: any) => ({ id: d.id, brand_id: d.brand_id, url: d.url, type: d.type, date: d.date, run_id: d.run_id, prompt_id: d.prompt_id })));
      } else {
        let q = supabase
          .from("all_sources")
          .select("id, brand_id, url, type, date, run_id, prompt_id")
          .gte("date", startISO)
          .lte("date", endISO)
          .order("date", { ascending: true });
        if (brandId) q = q.eq("brand_id", brandId);
        const { data, error } = await q;
        if (!error) setRows((data || []) as SourceRow[]);
      }

      setLoading(false);
    })();
  }, [selectedRange.start, selectedRange.end, selectedModel, brandId]);

  const days = useMemo(() => {
    const a: string[] = [];
    const cur = new Date(selectedRange.start);
    const last = new Date(selectedRange.end);
    cur.setUTCHours(0, 0, 0, 0);
    last.setUTCHours(0, 0, 0, 0);
    while (cur <= last) {
      a.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return a;
  }, [selectedRange]);

  const aggregates = useMemo(() => {
    const totalCitations = rows.length || 1;

    const domainCounts = new Map<string, number>();
    const domainTypeCounts = new Map<string, Map<string, number>>();
    const domainRunCitations = new Map<string, Map<string, number>>();
    const domainDayCounts = new Map<string, Map<string, number>>();

    const urlCounts = new Map<string, number>();
    const urlRunCitations = new Map<string, Map<string, number>>();
    const urlTypes = new Map<string, string>();
    const urlDomains = new Map<string, string>();

    rows.forEach((r) => {
      const dom = extractDomain(r.url);
      const day = toDay(r.date);
      const run = r.run_id || r.id;

      domainCounts.set(dom, (domainCounts.get(dom) || 0) + 1);

      if (!domainTypeCounts.has(dom)) domainTypeCounts.set(dom, new Map());
      const dTypes = domainTypeCounts.get(dom)!;
      dTypes.set(r.type, (dTypes.get(r.type) || 0) + 1);

      if (!domainRunCitations.has(dom)) domainRunCitations.set(dom, new Map());
      const dRuns = domainRunCitations.get(dom)!;
      dRuns.set(run, (dRuns.get(run) || 0) + 1);

      if (!domainDayCounts.has(dom)) domainDayCounts.set(dom, new Map());
      const dDays = domainDayCounts.get(dom)!;
      dDays.set(day, (dDays.get(day) || 0) + 1);

      urlCounts.set(r.url, (urlCounts.get(r.url) || 0) + 1);

      if (!urlRunCitations.has(r.url)) urlRunCitations.set(r.url, new Map());
      const uRuns = urlRunCitations.get(r.url)!;
      uRuns.set(run, (uRuns.get(run) || 0) + 1);

      if (!urlTypes.has(r.url)) urlTypes.set(r.url, r.type);
      if (!urlDomains.has(r.url)) urlDomains.set(r.url, dom);
    });

    const domainTable = Array.from(domainCounts.entries())
      .map(([domain, cnt]) => {
        const tCounts = domainTypeCounts.get(domain) || new Map();
        const topType = Array.from(tCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
        const runCit = domainRunCitations.get(domain) || new Map();
        const avgCit = Array.from(runCit.values()).reduce((s, n) => s + n, 0) / (runCit.size || 1);
        return {
          domain,
          type: topType,
          usedPct: +(100 * (cnt / totalCitations)).toFixed(0),
          avgCitations: +avgCit.toFixed(1),
          count: cnt,
        };
      })
      .sort((a, b) => b.count - a.count);

    const topDomains = domainTable.slice(0, limitTop).map((d) => d.domain);

    const chart = days.map((day) => {
      const dayTotal = rows.filter((r) => toDay(r.date) === day).length || 1;
      const row: Record<string, number | string> = {
        date: new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      topDomains.forEach((dom) => {
        const domDay = domainDayCounts.get(dom)?.get(day) || 0;
        row[dom] = +((domDay / dayTotal) * 100).toFixed(1);
      });
      return row;
    });

    const urlTable = Array.from(urlCounts.entries())
      .map(([url, cnt]) => {
        const dom = urlDomains.get(url) || extractDomain(url);
        const type = urlTypes.get(url) || "Other";
        const runCit = urlRunCitations.get(url) || new Map();
        const avgCit = Array.from(runCit.values()).reduce((s, n) => s + n, 0) / (runCit.size || 1);
        return {
          url,
          domain: dom,
          type,
          usedPct: +(100 * (cnt / totalCitations)).toFixed(0),
          avgCitations: +avgCit.toFixed(1),
          count: cnt,
        };
      })
      .sort((a, b) => b.count - a.count);

    return { chart, domainTable, urlTable, topDomains };
  }, [rows, days, limitTop]);

  const seriesKeys = aggregates.topDomains;

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
      <TabsList className="w-48">
        <TabsTrigger value="domains">Domains</TabsTrigger>
        <TabsTrigger value="urls">URLs</TabsTrigger>
      </TabsList>

      <TabsContent value="domains" className="space-y-4">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900">Source Usage by Domain</h3>
            <p className="text-sm text-gray-500">Share of citations per day for the Top {seriesKeys.length} domains</p>
          </div>
          <ChartContainer config={{ visibility: { label: "Usage %" } }} className="w-full h-[280] mt-9" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" aspect={8.5}>
              <LineChart data={aggregates.chart} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} padding={{ left: 12, right: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {seriesKeys.map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={hsl(i)} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-medium text-gray-900">Source</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-gray-500">
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Used</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Avg. Citations</th>
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
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${typeClass(r.type)}`}>{r.type}</span>
                    </td>
                    <td className="px-4 py-2 text-right">{r.usedPct}%</td>
                    <td className="px-4 py-2 text-right">{r.avgCitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="urls" className="space-y-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h4 className="text-sm font-medium text-gray-900">URLs</h4>
            <p className="text-xs text-gray-500">All URLs cited in chats for the selected period</p>
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-gray-500">
                  <th className="px-4 py-2">URL</th>
                  <th className="px-4 py-2">Domain</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Used</th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">Avg. Citations</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aggregates.urlTable.map((u) => (
                  <tr key={u.url} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-words">
                        <span className="line-clamp-2 max-w-[70ch]">{u.url}</span>
                      </a>
                    </td>
                    <td className="px-4 py-2">{u.domain}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${typeClass(u.type)}`}>{u.type}</span>
                    </td>
                    <td className="px-4 py-2 text-right">{u.usedPct}%</td>
                    <td className="px-4 py-2 text-right">{u.avgCitations}</td>
                    <td className="px-4 py-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(u.url, "_blank")} className="inline-flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" /> Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
