import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, TrendingUp, MessageSquare, Gauge, Search, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";

type CompetitorRow = {
  id: string;
  brand_id: string;
  website: string | null;
  name: string | null;
  logo: string | null;
  color: string | null;
};

type DailyRow = {
  day: string; // ISO date (YYYY-MM-DD)
  entity_id: string;
  entity_type: "brand" | "competitor";
  mentions: number;
  total_runs: number;
  platform_id?: string | null;
  avg_sentiment_score?: number | null; // -1..1 (as per your view)
};

type CompetitorSummary = {
  id: string;
  name: string;
  logo?: string | null;
  color?: string | null;
  website?: string | null;

  // Quick checks
  totalMentions: number;        // sum over range
  avgVisibilityPct: number;     // (sum mentions / sum total_runs) * 100
  avgSentimentPct: number | null; // [-1..1] mapped to [0..100]
  lastSeen: string | null;      // latest day we have data for this competitor
};

function useCompetitorsList() {
  const { selectedBrand } = useBrands();
  const [rows, setRows] = useState<CompetitorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedBrand) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("competitors")
          .select("id, brand_id, website, name, logo, color")
          .eq("brand_id", selectedBrand)
          .order("name", { ascending: true });

        if (error) throw error;
        if (!cancelled) setRows(data ?? []);
      } catch (e) {
        console.error("Error loading competitors:", e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBrand]);

  return { rows, loading };
}

function useCompetitorDailyStats(competitorIds: string[]) {
  const { selectedModel } = useModels();
  const { selectedRange } = useTimeRange();

  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!competitorIds.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from("daily_visibility_stats")
          .select("*")
          .in("entity_id", competitorIds)
          .eq("entity_type", "competitor")
          .gte("day", selectedRange.start.toISOString().slice(0, 10))
          .lte("day", selectedRange.end.toISOString().slice(0, 10));

        if (selectedModel) {
          query = query.eq("platform_id", selectedModel);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as DailyRow[]);
      } catch (e) {
        console.error("Error loading competitor visibility stats:", e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [competitorIds, selectedModel, selectedRange]);

  return { rows, loading };
}

function mapToPctFromMinus1To1(x: number): number {
  // Safely map [-1,1] -> [0,100]
  const pct = ((x + 1) / 2) * 100;
  return Math.max(0, Math.min(100, pct));
}

function buildSummaries(competitors: CompetitorRow[], dailies: DailyRow[]): CompetitorSummary[] {
  const byId = new Map<string, CompetitorRow>();
  competitors.forEach(c => byId.set(c.id, c));

  type Agg = {
    mentions: number;
    runs: number;
    weightedSentimentNumer: number; // sum of (sentiment * mentions)
    weightedSentimentDenom: number; // sum of mentions that had sentiment
    lastSeen: string | null;
  };

  const aggs = new Map<string, Agg>();

  for (const r of dailies) {
    if (!aggs.has(r.entity_id)) {
      aggs.set(r.entity_id, {
        mentions: 0,
        runs: 0,
        weightedSentimentNumer: 0,
        weightedSentimentDenom: 0,
        lastSeen: null,
      });
    }
    const a = aggs.get(r.entity_id)!;
    a.mentions += r.mentions ?? 0;
    a.runs += r.total_runs ?? 0;

    if (typeof r.avg_sentiment_score === "number") {
      // Weight by mentions that day so spikes don’t dominate
      a.weightedSentimentNumer += r.avg_sentiment_score * (r.mentions ?? 0);
      a.weightedSentimentDenom += (r.mentions ?? 0);
    }

    // Track last seen (max day)
    if (!a.lastSeen || r.day > a.lastSeen) a.lastSeen = r.day;
  }

  const out: CompetitorSummary[] = competitors.map(c => {
    const a = aggs.get(c.id);
    const visibility = a && a.runs > 0 ? (a.mentions / a.runs) * 100 : 0;

    let sentimentPct: number | null = null;
    if (a && a.weightedSentimentDenom > 0) {
      const meanSent = a.weightedSentimentNumer / a.weightedSentimentDenom; // -1..1
      sentimentPct = mapToPctFromMinus1To1(meanSent);
    }

    return {
      id: c.id,
      name: c.name ?? "Unknown",
      logo: c.logo,
      color: c.color ?? undefined,
      website: c.website ?? undefined,
      totalMentions: a?.mentions ?? 0,
      avgVisibilityPct: Math.round(visibility),
      avgSentimentPct: sentimentPct !== null ? Math.round(sentimentPct) : null,
      lastSeen: a?.lastSeen ?? null,
    };
  });

  // Sort by visibility desc as a sane default for "quick checks"
  out.sort((a, b) => b.avgVisibilityPct - a.avgVisibilityPct);
  return out;
}

function Pill({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="outline">—</Badge>;
  const hue =
    value >= 70 ? "bg-green-500/15 text-green-700 border-green-500/30" :
    value >= 40 ? "bg-gray-500/15 text-gray-700 border-gray-500/30" :
                  "bg-rose-500/15 text-rose-700 border-rose-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${hue}`}>
      {value}
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-4 rounded-2xl shadow-sm border bg-white">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-4 w-28 bg-gray-200 rounded mt-4 animate-pulse" />
    </Card>
  );
}

export function Competitors() {
  const { rows: competitors, loading: loadingCompetitors } = useCompetitorsList();
  const competitorIds = useMemo(() => competitors.map(c => c.id), [competitors]);
  const { rows: dailies, loading: loadingStats } = useCompetitorDailyStats(competitorIds);

  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); 

  useEffect(() => {
  }, [refreshKey]);

  const summaries = useMemo(
    () => buildSummaries(competitors, dailies),
    [competitors, dailies]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return summaries;
    return summaries.filter(s =>
      s.name.toLowerCase().includes(t)
      || (s.website?.toLowerCase() ?? "").includes(t)
    );
  }, [summaries, q]);

  const loading = loadingCompetitors || loadingStats;

  return (
    <section id="competitors" className="py-2 relative">
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search competitors…"
              className="pl-8 w-56"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCcw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 rounded-2xl border-dashed text-center">
          <p className="text-sm text-muted-foreground">No competitors found for the current filters.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="p-4 rounded-2xl shadow-sm border bg-white group relative overflow-hidden"
              style={c.color ? { borderColor: `${c.color}33` } : undefined}
            >
              {/* Accent border / halo */}
              {c.color && (
                <div
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px circle at 0% 0%, ${c.color} 0, transparent 60%)`
                  }}
                />
              )}

              <div className="flex items-center gap-3">
                {c.logo ? (
                  <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-black/5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 ring-1 ring-black/5" />
                )}
                <div>
                  <div className="text-sm font-semibold leading-tight">{c.name}</div>
                  {c.website ? (
                    <a
                      href={/^https?:\/\//.test(c.website) ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                    >
                      Visit site <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No website</span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Visibility
                  </div>
                  <div className="text-sm font-semibold mt-1">{c.avgVisibilityPct}%</div>
                </div>

                <div className="rounded-xl border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Mentions
                  </div>
                  <div className="text-sm font-semibold mt-1">{c.totalMentions}</div>
                </div>

                <div className="rounded-xl border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    Sentiment
                  </div>
                  <div className="mt-1">
                    <Pill value={c.avgSentimentPct} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Last seen: {c.lastSeen ?? "—"}
                </div>
                {c.color ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-0"
                    style={{ backgroundColor: `${c.color}22`, color: c.color }}
                  >
                    {c.name}
                  </Badge>
                ) : (
                  <span />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
