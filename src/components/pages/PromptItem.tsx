import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Download, Settings, Flag, ExternalLink, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";

type PMRow = {
  day: string;
  prompt_id: string;
  model_id: string | null;
  entity_type: "brand" | "competitor" | null;
  entity_id: string | null;
  mention_count: number;
  avg_position: number | null;
  avg_sentiment_score: number | null; 
};

type PromptRow = {
  id: string;
  prompt: string;
  topic?: string | null;
  is_active: boolean;
  created_at: string | null;
};

type DailyVisibilityData = {
  day: string;         
  entity_id: string;   
  mentions: number;    
  total_runs: number; 
};

const toISO = (d: Date) => new Date(d).toISOString();
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const sentimentTo01 = (s: number | null) =>
  s == null ? null : Math.round(((s + 1) / 2) * 100);

function usePrompt(promptId?: string) {
  const [data, setData] = useState<PromptRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!promptId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("prompts").select("*").eq("id", promptId).single();
      if (!error && data) setData(data as PromptRow);
      setLoading(false);
    })();
  }, [promptId]);
  return { data, loading };
}

export default function PromptItem() {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { getBrandOptions } = useBrands();
  const { selectedModel, getSelectedModelName } = useModels();
  const { selectedRange } = useTimeRange();

  const { data: prompt, loading: promptLoading } = usePrompt(promptId);

  const [pmRows, setPmRows] = useState<PMRow[]>([]);
  const [runs, setRuns] = useState<
    { run_id: string; created: string; snippet: string; mentions: number }[]
  >([]);
  const [sources, setSources] = useState<{ domain: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!promptId) return;
    (async () => {
      try {
        setLoading(true);

        const startISO = toISO(selectedRange.start);
        const endISO = toISO(selectedRange.end);
        let q = supabase
          .from("prompt_mentions")
          .select("day,prompt_id,model_id,entity_type,entity_id,mention_count,avg_position,avg_sentiment_score")
          .eq("prompt_id", promptId)
          .gte("day", startISO)
          .lte("day", endISO);

        if (selectedModel) q = q.eq("model_id", selectedModel);
        const { data: pmData, error: pmErr } = await q;
        if (pmErr) throw pmErr;
        setPmRows((pmData || []) as PMRow[]);

        let mQ = supabase
          .from("mentions")
          .select("run_id,date,sentence")
          .eq("prompt_id", promptId)
          .gte("date", startISO)
          .lte("date", endISO);

        if (selectedModel) mQ = mQ.eq("model_id", selectedModel);
        const { data: mentionRows, error: mErr } = await mQ;
        if (mErr) throw mErr;

        const grouped: Record<string, { created: string; snippet: string; mentions: number }> = {};
        (mentionRows || []).forEach((r: any) => {
          const id = r.run_id as string;
          if (!grouped[id]) {
            grouped[id] = { created: r.date, snippet: r.sentence, mentions: 0 };
          }
          grouped[id].mentions += 1;
          if (new Date(r.date) < new Date(grouped[id].created)) grouped[id].created = r.date;
        });

        const runList = Object.entries(grouped)
          .sort((a, b) => +new Date(b[1].created) - +new Date(a[1].created))
          .slice(0, 20)
          .map(([run_id, v]) => ({ run_id, ...v }));

        setRuns(runList);

        if (runList.length) {
          const rows: { id: string; url: string }[] = [];
          const seen = new Set<string>();

          const { data: sources, error: source_error } = await supabase
            .from('all_sources')
            .select('*')
            .eq('prompt_id', promptId)
            .gte("date", startISO)
            .lte("date", endISO);

            if (source_error) throw source_error;
            (sources || []).forEach((r: any) => {
              if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
            });
          

          const domainCount: Record<string, number> = {};
            rows.forEach(({ url }) => {
              const dom = url;
              domainCount[dom] = (domainCount[dom] || 0) + 1;
            });

            const list = Object.entries(domainCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([domain, count]) => ({ domain, count }));

            setSources(list);

        } else {
          setSources([]);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Failed to load prompt analytics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [promptId, selectedModel, selectedRange, toast]);

  const brandById = useMemo(() => {
    const map = new Map<string, string>();
    getBrandOptions.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [getBrandOptions]);

  const dailyData: DailyVisibilityData[] = useMemo(() => {
    const byDay: Record<string, { total: number; per: Record<string, number> }> = {};
    pmRows.forEach((r) => {
      if (!r.entity_id) return;
      const day = r.day.slice(0, 10);
      byDay[day] ??= { total: 0, per: {} };
      byDay[day].per[r.entity_id] = (byDay[day].per[r.entity_id] || 0) + (r.mention_count || 0);
      byDay[day].total += r.mention_count || 0;
    });

    const out: DailyVisibilityData[] = [];
    Object.entries(byDay)
      .sort(([a], [b]) => +new Date(a) - +new Date(b))
      .forEach(([day, { total, per }]) => {
        Object.entries(per).forEach(([entity_id, mentions]) => {
          out.push({ day, entity_id, mentions, total_runs: total });
        });
      });
    return out;
  }, [pmRows]);

  const rechartsData = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    dailyData.forEach((row) => {
      const label = fmtDay(row.day);
      const name = brandById.get(row.entity_id) || "Unknown";
      byDay[label] ??= {};
      const pct = row.total_runs ? (row.mentions / row.total_runs) * 100 : 0;
      byDay[label][name] = pct;
    });
    return Object.entries(byDay).map(([date, series]) => ({ date, ...series }));
  }, [dailyData, brandById]);

  const ranking = useMemo(() => {
    const agg: Record<
      string,
      { name: string; mentions: number; posSum: number; posW: number; sentSum: number; sentW: number }
    > = {};
    pmRows.forEach((r) => {
      if (!r.entity_id) return;
      const name = brandById.get(r.entity_id) || "Unknown";
      agg[r.entity_id] ??= { name, mentions: 0, posSum: 0, posW: 0, sentSum: 0, sentW: 0 };
      agg[r.entity_id].mentions += r.mention_count || 0;
      if (r.avg_position != null) { agg[r.entity_id].posSum += (r.avg_position || 0) * (r.mention_count || 0); agg[r.entity_id].posW += (r.mention_count || 0); }
      if (r.avg_sentiment_score != null) { agg[r.entity_id].sentSum += (r.avg_sentiment_score || 0) * (r.mention_count || 0); agg[r.entity_id].sentW += (r.mention_count || 0); }
    });
    const total = Object.values(agg).reduce((s, v) => s + v.mentions, 0) || 1;
    const rows = Object.entries(agg).map(([entity_id, v]) => {
      const position = v.posW ? v.posSum / v.posW : null;
      const sent01 = v.sentW ? sentimentTo01(v.sentSum / v.sentW) : null;
      const visibility = Math.round((v.mentions / total) * 100);
      return { entity_id, brand: v.name, position, sentiment01: sent01, visibility };
    });
    return rows.sort((a, b) => b.visibility - a.visibility).slice(0, 5);
  }, [pmRows, brandById]);

  const SentimentPill = ({ n }: { n: number | null }) => {
    if (n == null) return <span>—</span>;
    const color = n >= 70 ? "bg-emerald-100 text-emerald-700" : n >= 40 ? "bg-gray-100 text-gray-700" : "bg-rose-100 text-rose-700";
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{n}</span>;
  };

  const handleDownloadJSON = (name: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (promptLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded" />
            <div className="h-96 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Prompt not found.</p>
        <Button onClick={() => navigate("/prompts")} className="mt-4">Back to Prompts</Button>
      </div>
    );
  }

  const seriesKeys = Object.keys(rechartsData[0] || {}).filter((k) => k !== "date");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">{prompt.prompt}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Flag className="h-4 w-4 text-blue-500" />
              US
            </div>
            <Badge variant={prompt.is_active ? "default" : "secondary"}>
              {prompt.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 ml-1">Visibility</h3>
              <p className="text-sm text-gray-500 ml-1">Percentage of chats mentioning each brand</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownloadJSON("visibility-data", dailyData)}>
              <Download className="w-4 h-4" />
              <span className="ml-2">Download</span>
            </Button>
          </div>

          <div className="rounded-md overflow-hidden w-full">
            <ChartContainer config={{ visibility: { label: "Visibility %" } }}>
              <ResponsiveContainer width="100%" aspect={1.9}>
                <LineChart data={rechartsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} padding={{ left: 12, right: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {seriesKeys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={`hsl(${i * 60}, 70%, 50%)`}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 ml-1">Industry Ranking</h3>
            <p className="text-sm text-gray-500 ml-1">Brands with highest visibility</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Brand</div>
              <div className="col-span-2 text-center">Position</div>
              <div className="col-span-2 text-center">Sentiment</div>
              <div className="col-span-3 text-center">Visibility</div>
            </div>

            {ranking.map((r, idx) => (
              <div key={r.entity_id} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-gray-50 rounded">
                <div className="col-span-1 text-gray-600">{idx + 1}</div>
                <div className="col-span-4 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-gray-200 inline-block" />
                  <span className="font-medium">{r.brand}</span>
                </div>
                <div className="col-span-2 text-center">{r.position != null ? r.position.toFixed(1) : "—"}</div>
                <div className="col-span-2 text-center"><SentimentPill n={r.sentiment01} /></div>
                <div className="col-span-3 text-center font-medium">{r.visibility}%</div>
              </div>
            ))}

            <div className="pt-2 border-t">
              <button className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
                All Data <ArrowUpRight className="h-3 w-3 ml-1" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 ml-1">Recent Chats</h3>
              <p className="text-sm text-gray-500 ml-1">All chats in the selected time period</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownloadJSON("recent-chats", runs)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
              <div className="col-span-6">Chat</div>
              <div className="col-span-2 text-center">Mentions</div>
              <div className="col-span-4 text-center">Created</div>
            </div>

            {runs.map((r) => (
              <Link
                to={`/chats/${encodeURIComponent(r.run_id)}`}
                className="grid grid-cols-12 gap-2 text-sm py-3 hover:bg-gray-50 rounded w-full"
              >
                <div className="col-span-6">
                  <p className="line-clamp-2 text-gray-900">{r.snippet}</p>
                </div>
                <div className="col-span-2 text-center">{r.mentions}</div>
                <div className="col-span-4 text-center text-gray-600">
                  {new Date(r.created).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 ml-1">Sources</h3>
            <p className="text-sm text-gray-500 ml-1">Sources across active models</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
              <div className="col-span-8">Source</div>
              <div className="col-span-4 text-center">Used</div>
            </div>

            {sources.map((s) => (
              <div key={s.domain} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-gray-50 rounded">
                <div className="col-span-8 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-gray-200 inline-block" />
                  <a
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    href={`https://${s.domain}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.domain} <ExternalLink className="h-3 w-3 text-gray-400" />
                  </a>
                </div>
                <div className="col-span-4 text-center font-medium">
                  {s.count}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
