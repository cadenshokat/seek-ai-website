import { PMRow } from "@/components/pages/Prompts";

type BrandMeta = { id: string; name: string; color?: string | null; logo?: string | null };
type TopBrand = { id: string; name: string; logo?: string | null; color?: string | null; mentions: number; sharePct: number };

export type BuiltMetrics = Record<
  string,
  {
    mentionCountBrand: number;
    avgPosition: number | null;
    avgSentiment01: number | null;
    visibilityPct: number;
    topBrands: TopBrand[];
  }
>;

function to01(score: number | null | undefined): number | null {
  if (score == null) return null;
  return Math.round(((score + 1) / 2) * 100);
}

export function buildPromptMetrics(rows: PMRow[], selectedBrand: string | null, brands: BrandMeta[]): BuiltMetrics {
  const brandIndex = new Map(brands.map(b => [b.id, b]));
  const perPromptTotals = new Map<string, number>();
  const perPromptBrandMentions = new Map<string, Map<string, number>>();
  const perPromptBrandWeighted = new Map<
    string,
    { posSum: number; posW: number; sentSum: number; sentW: number }
  >();

  for (const r of rows) {
    const pid = r.prompt_id;
    const mc = Number(r.mention_count || 0);
    perPromptTotals.set(pid, (perPromptTotals.get(pid) || 0) + mc);
    if (!perPromptBrandMentions.has(pid)) perPromptBrandMentions.set(pid, new Map());
    const byBrand = perPromptBrandMentions.get(pid)!;
    const bid = r.entity_id || "";
    byBrand.set(bid, (byBrand.get(bid) || 0) + mc);
    if (selectedBrand == null || bid === selectedBrand) {
      if (!perPromptBrandWeighted.has(pid)) perPromptBrandWeighted.set(pid, { posSum: 0, posW: 0, sentSum: 0, sentW: 0 });
      const w = perPromptBrandWeighted.get(pid)!;
      if (r.avg_position != null) { w.posSum += r.avg_position * mc; w.posW += mc; }
      if (r.avg_sentiment_score != null) { w.sentSum += r.avg_sentiment_score * mc; w.sentW += mc; }
    }
  }

  const out: BuiltMetrics = {};
  for (const [pid, totalMentions] of perPromptTotals.entries()) {
    const byBrand = perPromptBrandMentions.get(pid) || new Map();
    let brandMentions = 0;
    if (selectedBrand) brandMentions = byBrand.get(selectedBrand) || 0;
    else brandMentions = totalMentions;

    const w = perPromptBrandWeighted.get(pid);
    const avgPosition = w && w.posW ? w.posSum / w.posW : null;
    const avgSentiment01 = w && w.sentW ? to01(w.sentSum / w.sentW) : null;
    const visibilityPct = totalMentions ? Math.round((brandMentions / totalMentions) * 100) : 0;

    const entries: TopBrand[] = Array.from(byBrand.entries())
      .map(([bid, m]) => {
        const meta = brandIndex.get(bid);
        return {
          id: bid,
          name: meta?.name || "Unknown",
          logo: meta?.logo || null,
          color: meta?.color || null,
          mentions: m,
          sharePct: totalMentions ? (m / totalMentions) * 100 : 0,
        };
      })
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 3);

    out[pid] = {
      mentionCountBrand: brandMentions,
      avgPosition,
      avgSentiment01,
      visibilityPct,
      topBrands: entries,
    };
  }
  return out;
}
