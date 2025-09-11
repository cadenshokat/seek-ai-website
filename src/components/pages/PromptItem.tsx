import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Download, Flag, ExternalLink, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";
import { Separator } from "@/components/ui/separator";
import { useOpenChatFromTrip } from "@/hooks/useRunFromChat";

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

type RankRow = {
  entity_id: string;
  brand: string;
  logo: string | null;
  position: number | null;
  sentiment01: number | null;
  visibility: number;
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

type BrandMeta = { name: string; logo?: string | null; color?: string };

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const localRangeISO = (start: Date, end: Date) => {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return { startISO: s.toISOString(), endISO: e.toISOString() };
};

const fmtLocalDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(y, (m ?? 1) - 1, d ?? 1)
  );
};

const sentimentTo01 = (s: number | null) => (s == null ? null : Math.round(((s + 1) / 2) * 100));

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
  const { openTrip } = useOpenChatFromTrip();

  const { selectedBrand, getBrandOptions } = useBrands();
  const { selectedModel } = useModels();
  const { selectedRange } = useTimeRange();

  const { data: prompt, loading: promptLoading } = usePrompt(promptId);

  const [pmRows, setPmRows] = useState<PMRow[]>([]);
  const [runs, setRuns] = useState<{ run_id: string; model_id: string; created: string; snippet: string; mentions: number }[]>([]);
  const [sources, setSources] = useState<{ domain: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const optionById = useMemo(() => {
    const map = new Map<string, { name: string; type: "brand" | "competitor"; color?: string | null }>();
    getBrandOptions.forEach((b) => map.set(b.id, { name: b.name, type: b.type, color: b.color }));
    return map;
  }, [getBrandOptions]);

  useEffect(() => {
    if (!promptId) return;
    (async () => {
      try {
        setLoading(true);

        const dayStart = ymd(selectedRange.start);
        const dayEnd = ymd(selectedRange.end);

        let q = supabase
          .from("prompt_mentions")
          .select("day,prompt_id,model_id,entity_type,entity_id,mention_count,avg_position,avg_sentiment_score")
          .eq("prompt_id", promptId)
          .gte("day", dayStart)
          .lte("day", dayEnd);
        if (selectedModel) q = q.eq("model_id", selectedModel);
        const { data: pmData, error: pmErr } = await q;
        if (pmErr) throw pmErr;
        setPmRows((pmData || []) as PMRow[]);

        const { startISO, endISO } = localRangeISO(selectedRange.start, selectedRange.end);
        let mQ = supabase
          .from("mentions")
          .select("run_id,date,sentence,entity_id,model_id")
          .eq("prompt_id", promptId)
          .gte("date", startISO)
          .lte("date", endISO);
        if (selectedModel) mQ = mQ.eq("model_id", selectedModel);
        if (selectedBrand) mQ = mQ.eq("entity_id", selectedBrand);
        const { data: mentionRows, error: mErr } = await mQ;
        if (mErr) throw mErr;

        const grouped: Record<string, { run_id: string; model_id: string | null; created: string; snippet: string; mentions: number }> = {};

        (mentionRows || []).forEach((r: any) => {
          const key = `${r.run_id}::${r.model_id ?? "null"}`;
          const existing = grouped[key];
          if (!existing) {
            grouped[key] = {
              run_id: r.run_id,
              model_id: r.model_id ?? null,
              created: r.date,
              snippet: r.sentence,
              mentions: 1,
            };
          } else {
            existing.mentions += 1;
            if (new Date(r.date) < new Date(existing.created)) existing.created = r.date;
            if (!existing.snippet && r.sentence) existing.snippet = r.sentence;
          }
        });

        const runList = Object.values(grouped)
          .sort((a, b) => +new Date(b.created) - +new Date(a.created))
          .slice(0, 20);
        setRuns(runList);
        const runIds = new Set<string>(runList.map((r) => r.run_id));

        let sQ = supabase
          .from("all_sources")
          .select("*")
          .eq("prompt_id", promptId)
          .gte("date", startISO)
          .lte("date", endISO);
        if (selectedBrand) {
          const meta = optionById.get(selectedBrand);
          if (meta?.type === "brand") {
            sQ = sQ.eq("brand_id", selectedBrand);
          } else if (meta?.type === "competitor") {
            const ids = Array.from(runIds);
            if (ids.length === 0) {
              setSources([]);
              setLoading(false);
              return;
            }
            sQ = sQ.in("run_id", ids);
          }
        }
        const { data: srcRows, error: sErr } = await sQ;
        if (sErr) throw sErr;

        const rows: { id: string; url: string }[] = [];
        const seen = new Set<string>();
        (srcRows || []).forEach((r: any) => {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            rows.push(r);
          }
        });
        const domainCount: Record<string, number> = {};
        rows.forEach(({ url }) => {
          let dom = url;
          try {
            dom = new URL(url).hostname.replace(/^www\./, "");
          } catch {}
          domainCount[dom] = (domainCount[dom] || 0) + 1;
        });
        const list = Object.entries(domainCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([domain, count]) => ({ domain, count }));
        setSources(list);
      } catch {
        toast({ title: "Failed to load prompt analytics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [promptId, selectedModel, selectedBrand, selectedRange, optionById, toast]);

  const brandById = useMemo(() => {
    const map = new Map<string, BrandMeta>();
    getBrandOptions.forEach(b => {
      map.set(b.id, { name: b.name, logo: b.logo ?? null, color: b.color });
    });
    return map;
}, [getBrandOptions]);


  const dailyData: DailyVisibilityData[] = useMemo(() => {
    const byDay: Record<string, { total: number; per: Record<string, number> }> = {};
    pmRows.forEach((r) => {
      if (!r.entity_id) return;
      const day = r.day.slice(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, per: {} };
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
  const days = Array.from(
    new Set(dailyData.map(r => r.day.slice(0,10)))
  ).sort((a, b) => +new Date(a) - +new Date(b));

  const selectedLabel = selectedBrand
    ? (brandById.get(selectedBrand)?.name ?? 'Selected')
    : null;

  const perDay: Record<string, { total: number; per: Record<string, number> }> = {};
  dailyData.forEach(row => {
    const day = row.day.slice(0,10);
    perDay[day] ??= { total: 0, per: {} };
    perDay[day].per[row.entity_id] = (perDay[day].per[row.entity_id] ?? 0) + row.mentions;
    perDay[day].total = row.total_runs; 
  });

  const rows = days.map(day => {
    const label = fmtLocalDay(day);
    const bucket = perDay[day] ?? { total: 0, per: {} };
    const total = bucket.total || 0;
    const row: Record<string, number | string> = { date: label };

      if (selectedLabel && selectedBrand) {
        const mentions = bucket.per[selectedBrand] ?? 0;
        row[selectedLabel] = total ? (mentions / total) * 100 : 0;
      } else {
        Object.entries(bucket.per).forEach(([id, mentions]) => {
          const name = brandById.get(id)?.name ?? 'Unknown';
          row[name] = total ? (mentions / total) * 100 : 0;
        });
      }
      return row;
    });

    return rows;
  }, [dailyData, brandById, selectedBrand]);


  const seriesKeys = useMemo(() => {
    if (selectedBrand) {
      return [brandById.get(selectedBrand)?.name ?? 'Selected'];
    }
    const first = rechartsData[0] || {};
    return Object.keys(first).filter(k => k !== 'date');
  }, [rechartsData, selectedBrand, brandById]);

  const brandRanking = useMemo<RankRow[]>(() => {
    const agg: Record<string, {
      name: string;
      logo: string | null;
      mentions: number;
      posSum: number; posW: number;
      sentSum: number; sentW: number;
    }> = {};

    pmRows.forEach((r) => {
      if (!r.entity_id) return;
      const meta = brandById.get(r.entity_id);
      const name = meta?.name ?? 'Unknown';
      const logo = meta?.logo ?? null;

      if (!agg[r.entity_id]) {
        agg[r.entity_id] = { name, logo, mentions: 0, posSum: 0, posW: 0, sentSum: 0, sentW: 0 };
      }
      agg[r.entity_id].mentions += r.mention_count || 0;

      if (r.avg_position != null) {
        agg[r.entity_id].posSum += (r.avg_position || 0) * (r.mention_count || 0);
        agg[r.entity_id].posW += r.mention_count || 0;
      }
      if (r.avg_sentiment_score != null) {
        agg[r.entity_id].sentSum += (r.avg_sentiment_score || 0) * (r.mention_count || 0);
        agg[r.entity_id].sentW += r.mention_count || 0;
      }
    });

    const total = Object.values(agg).reduce((s, v) => s + v.mentions, 0) || 1;

    const rows = Object.entries(agg).map(([entity_id, v]) => {
      const position = v.posW ? v.posSum / v.posW : null;
      const sent01 = v.sentW ? sentimentTo01(v.sentSum / v.sentW) : null;
      const visibility = Math.round((v.mentions / total) * 100);
      return { entity_id, brand: v.name, logo: v.logo, position, sentiment01: sent01, visibility };
    });

    return rows.sort((a, b) => b.visibility - a.visibility);
  }, [pmRows, brandById]);

  const ranking = useMemo(
      () => (showAll ? brandRanking : brandRanking.slice(0, 5)),
      [brandRanking, showAll]
    );

  const SentimentPill = ({ n }: { n: number | null }) => {
  if (n == null) return <span>—</span>;

  const bgClass =
    n >= 70 ? "bg-green-400"
    : n >= 40 ? "bg-gray-400"
    : "bg-rose-500";

  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${bgClass}`} />
      {n}
    </span>
  );
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">{prompt.prompt}</h1>
          
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6">
        <div className="p-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 ml-1">Visibility</h3>
              <p className="text-sm text-gray-500 ml-1">Percentage of chats mentioning each brand</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownloadJSON("visibility-data", dailyData)}>
              <Download className="w-4 h-4" />
              <span className="text-xs">Download</span>
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
                  {(() => {
                    const keys = selectedBrand ? [optionById.get(selectedBrand)?.name || "Selected"] : Object.keys(rechartsData[0] || {}).filter((k) => k !== "date");
                    return keys.map((key, i) => (
                      <Line key={`series-${key}-${i}`} type="monotone" dataKey={key} stroke={`hsl(${i * 60}, 70%, 50%)`} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    ));
                  })()}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="p-2">
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
              <div key={`rank-${r.entity_id}-${idx}`} className="grid grid-cols-12 gap-2 text-sm py-1 hover:bg-gray-50 rounded">
                <div className="col-span-1 text-gray-600">{idx + 1}</div>
                <div className="col-span-4 flex items-center gap-2">
                  {r.logo && (
                    <img src={r.logo} alt={r.brand} className="h-5 w-5 rounded-full" />
                  )}
                  <span className="font-medium">{r.brand}</span>
                </div>
                <div className="col-span-2 text-center">{r.position != null ? r.position.toFixed(1) : "—"}</div>
                <div className="col-span-2 text-center">
                  <SentimentPill n={r.sentiment01} />
                </div>
                <div className="col-span-3 text-center font-medium">{r.visibility}%</div>
              </div>
            ))}
            <div className="pt-2 border-t">
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
        </div>
      </div>
        
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6">
        <div className="p-2">
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
            {runs.map((r, i) => (
              <button
                key={`run-${r.run_id}-${r.model_id}-${i}`}
                type="button"
                onClick={() => openTrip({ run_id: r.run_id, model_id: r.model_id, prompt_id: promptId ?? null })}
                className="grid grid-cols-12 gap-2 text-sm py-3 hover:bg-gray-50 rounded w-full text-left cursor-pointer"
                title="Open chat"
              >
                <div className="col-span-6">
                  <p className="line-clamp-2 text-gray-900">{r.snippet}</p>
                </div>
                <div className="col-span-2 text-center">{r.mentions}</div>
                <div className="col-span-4 text-center text-gray-600">{new Date(r.created).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        <Separator orientation="vertical" />

        <div className="p-2">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 ml-1">Sources</h3>
            <p className="text-sm text-gray-500 ml-1">Sources across active models</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
              <div className="col-span-8">Source</div>
              <div className="col-span-4 text-center">Used</div>
            </div>
            {sources.map((s, i) => (
              <div key={`src-${s.domain}-${s.count}-${i}`} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-gray-50 rounded">
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
                <div className="col-span-4 text-center font-medium">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
