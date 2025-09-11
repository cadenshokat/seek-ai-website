import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useTimeRange } from "@/hooks/useTimeRange";
import { ExternalLink } from "lucide-react";

type Competitor = {
  id: string;
  name: string;
  color?: string;
  logo?: string;
  website?: string;
  brand_id: string;
};

type Mention = {
  id: string;
  competitor_id: string;
  sentence_mentioned: string | null;
  sentiment: "positive" | "neutral" | "negative" | string;
  position: number | null;
  date: string; // ISO
};

type SummaryRow = {
  competitor: Competitor;
  brandName: string;
  total: number;
  avgPosition: number;
  pos: number;
  neu: number;
  neg: number;
  lastDate: string | null;
};

const sentimentBadge = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "positive") return "bg-green-100 text-green-800";
  if (v === "negative") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export function Competitors() {
  const { brands } = useBrands();
  const { selectedRange } = useTimeRange();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getBrandName = (brandId: string) => brands.find((b) => b.id === brandId)?.name || "Unknown";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) Get competitors
        const { data: comps, error: cErr } = await supabase
          .from("competitors")
          .select("id,name,color,logo,website,brand_id")
          .order("name", { ascending: true });

        if (cErr) throw cErr;
        setCompetitors(comps || []);

        // 2) Get all mentions for these competitors in the selected range, paged (to go past 1,000)
        const ids = (comps || []).map((c) => c.id);
        if (ids.length === 0) {
          setMentions([]);
          return;
        }

        const startISO = new Date(
          selectedRange.start.getFullYear(),
          selectedRange.start.getMonth(),
          selectedRange.start.getDate(),
          0, 0, 0, 0
        ).toISOString();

        const endISO = new Date(
          selectedRange.end.getFullYear(),
          selectedRange.end.getMonth(),
          selectedRange.end.getDate(),
          23, 59, 59, 999
        ).toISOString();

        const pageSize = 1000;
        let page = 0;
        const all: Mention[] = [];

        while (true) {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          const { data: batch, error: mErr } = await supabase
            .from("competitor_mentions")
            .select("id,competitor_id,sentence_mentioned,sentiment,position,date")
            .in("competitor_id", ids)
            .gte("date", startISO)
            .lte("date", endISO)
            .order("date", { ascending: false })
            .range(from, to);

          if (mErr) throw mErr;

          all.push(...(batch || []));
          if (!batch || batch.length < pageSize) break; // done
          page += 1;
        }

        setMentions(all);
      } catch (e) {
        console.error("Failed to load competitors or mentions", e);
        setCompetitors([]);
        setMentions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRange]);

  const summaries: SummaryRow[] = useMemo(() => {
    if (!competitors.length) return [];

    // Group mentions by competitor
    const byComp = new Map<string, Mention[]>();
    for (const m of mentions) {
      if (!byComp.has(m.competitor_id)) byComp.set(m.competitor_id, []);
      byComp.get(m.competitor_id)!.push(m);
    }

    return competitors.map((c) => {
      const list = byComp.get(c.id) || [];
      const total = list.length;

      const pos = list.filter((m) => (m.sentiment || "").toLowerCase() === "positive").length;
      const neu = list.filter((m) => (m.sentiment || "").toLowerCase() === "neutral").length;
      const neg = list.filter((m) => (m.sentiment || "").toLowerCase() === "negative").length;

      const avgPosition =
        total > 0
          ? Math.round(
              (list.reduce((s, m) => s + (typeof m.position === "number" ? m.position : 0), 0) / total) * 10
            ) / 10
          : 0;

      const lastDate = list.length ? list[0].date : null;

      return {
        competitor: c,
        brandName: getBrandName(c.brand_id),
        total,
        avgPosition,
        pos,
        neu,
        neg,
        lastDate,
      };
    });
  }, [competitors, mentions, brands]);

  const selectedMentions = useMemo(() => {
    if (!selectedId) return [];
    return mentions.filter((m) => m.competitor_id === selectedId).slice(0, 50);
  }, [mentions, selectedId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-64 w-full bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Competitors</h1>
          <p className="text-gray-600 text-sm">
            Aggregated mentions for {fmtDate(selectedRange.start.toISOString())} – {fmtDate(selectedRange.end.toISOString())}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setSelectedId(null)}>
          Clear Selection
        </Button>
      </header>

      {/* SUMMARY TABLE */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Competitor</th>
              <th className="px-4 py-3 text-left">Brand</th>
              <th className="px-4 py-3 text-right">Mentions</th>
              <th className="px-4 py-3 text-right">Avg&nbsp;Position</th>
              <th className="px-4 py-3 text-right">Positive</th>
              <th className="px-4 py-3 text-right">Neutral</th>
              <th className="px-4 py-3 text-right">Negative</th>
              <th className="px-4 py-3 text-left">Last Mention</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summaries
              .sort((a, b) => b.total - a.total)
              .map((row) => {
                const c = row.competitor;
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedId === c.id ? "bg-gray-50" : ""}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="h-6 w-6 rounded" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-gray-200" />
                        )}
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.brandName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.avgPosition || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge className="bg-green-50 text-green-700">{row.pos}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge className="bg-gray-50 text-gray-700">{row.neu}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge className="bg-red-50 text-red-700">{row.neg}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(row.lastDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(c.website!, "_blank");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* DRILL-DOWN TABLE */}
      {selectedId && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              Recent mentions —{" "}
              {summaries.find((s) => s.competitor.id === selectedId)?.competitor.name || "Selected"}
            </h2>
            <div className="text-sm text-gray-500">
              Showing up to 50 most recent in range
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Sentiment</th>
                  <th className="px-4 py-3 text-right">Position</th>
                  <th className="px-4 py-3 text-left">Sentence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedMentions.length ? (
                  selectedMentions.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">{fmtDate(m.date)}</td>
                      <td className="px-4 py-3">
                        <Badge className={sentimentBadge(m.sentiment)}>{m.sentiment}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {typeof m.position === "number" ? m.position : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        <span className="line-clamp-2">{m.sentence_mentioned || "—"}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                      No mentions in the selected range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
