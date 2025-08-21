// src/pages/chatitem.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Markdown, normalizeMarkdown } from "@/lib/markdown";
import "highlight.js/styles/github.min.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type PromptJoin = { prompt: string } | { prompt: string }[] | null | undefined;
type PlatformJoin =
  | { name?: string | null; logo?: string | null }
  | { name?: string | null; logo?: string | null }[]
  | null
  | undefined;

interface RunRow {
  id: string;
  run_id: string;
  prompt_id: string;
  model_id: string;
  response: string;
  run_at: string;
  status: string;
  prompts?: PromptJoin;
  platforms?: PlatformJoin;
}

interface MentionRow {
  id: string;
  sentence: string | null;
  entity_type: "brand" | "competitor" | string;
  entity_id: string;
  sentiment: string;
  sentiment_score: number | null;
  position: number;
  date: string;
}

interface SourceRow {
  id: string;
  url: string;
  type: string;
  date: string;
  run_id?: string | null;
  prompt_id?: string | null;
}

const extractPromptText = (p: PromptJoin): string => {
  if (!p) return "(untitled prompt)";
  if (Array.isArray(p)) return p[0]?.prompt ?? "(untitled prompt)";
  return p.prompt ?? "(untitled prompt)";
};

const sentimentBadgeClass = (sentiment: string, score: number | null) => {
  const label = (sentiment || "").toLowerCase();
  if (label.includes("pos")) return "bg-green-50 text-green-700 ring-1 ring-green-200";
  if (label.includes("neg")) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (label.includes("neu")) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

  if (typeof score === "number") {
    if (score > 0.15) return "bg-green-50 text-green-700 ring-1 ring-green-200";
    if (score < -0.15) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
};

const extractPlatformInfo = (pl: PlatformJoin): { model_name: string; model_logo?: string | null } => {
  const pick = (obj: any) => ({ model_name: obj?.name ?? "", model_logo: obj?.logo ?? null });
  if (!pl) return { model_name: "", model_logo: null };
  return Array.isArray(pl) ? pick(pl[0] || {}) : pick(pl);
};

export default function ChatItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [run, setRun] = useState<RunRow | null>(null);
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("response");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);

        const { data: runRow, error: runErr } = await supabase
          .from("runs")
          .select(`
            id, run_id, prompt_id, model_id, response, run_at, status,
            prompts ( prompt ),
            platforms ( name, logo )
          `)
          .eq("id", id)
          .single();

        if (runErr) throw runErr;
        if (!runRow) throw new Error("Run not found");

        setRun(runRow as RunRow);

        const runId = runRow.run_id as string;
        const promptId = runRow.prompt_id as string;
        const modelId = runRow.model_id as string;

        const [mentionsRes, sourcesRes] = await Promise.all([
          supabase
            .from("mentions")
            .select(`
              id, sentence, entity_type, entity_id, sentiment,
              sentiment_score, position, date
            `)
            .eq("run_id", runId)
            .eq("prompt_id", promptId)
            .eq("model_id", modelId)
            .order("position", { ascending: true }),

          supabase
            .from("all_sources")
            .select(`id, url, type, date, run_id, prompt_id`)
            .eq("run_id", runId)
            .eq("prompt_id", promptId)
            .order("date", { ascending: false }),
        ]);

        if (mentionsRes.error) throw mentionsRes.error;
        if (sourcesRes.error) throw sourcesRes.error;

        setMentions((mentionsRes.data ?? []) as MentionRow[]);
        setSources((sourcesRes.data ?? []) as SourceRow[]);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to load chat",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    })();
  }, [id, toast]);

  const promptText = useMemo(() => extractPromptText(run?.prompts), [run]);
  const { model_name, model_logo } = useMemo(() => extractPlatformInfo(run?.platforms), [run]);

  if (!initialized || loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
          <span>Loading chat…</span>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat not found</h3>
        <p className="text-gray-500">We couldn’t find a chat with that id.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/chats")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chats
        </Button>
      </div>
    );
  }

  const SentimentPill = ({ n }: { n: number | null }) => {
    if (n == null) return <span>—</span>;
    const color = n >= 60 ? "bg-emerald-100 text-emerald-700" : n >= 40 ? "bg-gray-100 text-gray-700" : "bg-rose-100 text-rose-700";
    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{n.toFixed(0)}</span>;
  };

  const runAt = new Date(run.run_at).toLocaleString();

  return (
    <div className="">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 min-w-0">
            <span className="text-md font-semibold text-gray-900 truncate" title={promptText}>
              {promptText}
            </span>
          </div>

          <div className="ml-auto">
            <TabsList className="inline-flex w-auto text-sm">
              <TabsTrigger value="response" className="text-sm">Response</TabsTrigger>
              <TabsTrigger value="stats" className="text-sm">Stats</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <Separator />

        <TabsContent value="response" className="mt-4">
          <Markdown size="xs" className="prose-headings:font-semibold prose-strong:font-semibold">
            {normalizeMarkdown(run.response || "")}
          </Markdown>
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-8">
          <div>
            <div className="text-md font-medium">
              Mentions
            </div>
            <div>
              {mentions.length === 0 ? (
                <div className="text-gray-500">No mentions recorded for this response.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs tracking-wide text-gray-500">
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Entity</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Sentiment</th>
                        <th className="px-3 py-2">Sentence</th>
                        <th className="px-3 py-2 whitespace-nowrap">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mentions.map((m) => {
                        const score = m.sentiment_score * 100;
                        const scoreText =
                          typeof score === "number" ? score.toFixed(0) : 0;
                        return (
                          <tr key={m.id} className="hover:bg-gray-50 text-xs">
                            <td className="px-3 py-2 text-gray-500">{m.position}</td>
                            <td className="px-3 py-2">{m.entity_id}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs">
                                {m.entity_type}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs`}>
                                <SentimentPill n={score} />
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="max-w-[60ch] break-words text-gray-800">
                                {m.sentence || "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                              {new Date(m.date).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-md font-medium">
              Sources
            </div>
            <div>
              {sources.length === 0 ? (
                <div className="text-gray-500">No sources linked to this response.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs tracking-wide text-gray-500">
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">URL</th>
                        <th className="px-3 py-2 whitespace-nowrap">Date</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sources.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50 text-xs">
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs ring-1 ring-gray-200">
                              {s.type}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 break-words"
                              title={s.url}
                            >
                              <span className="line-clamp-2 max-w-[70ch]">{s.url}</span>
                            </a>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {new Date(s.date).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(s.url, "_blank")}
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
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
