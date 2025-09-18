import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecentMentionEnriched } from "@/hooks/useRecentMentions";
import { useOpenChatFromMention } from "@/hooks/useRunFromChat";
import clsx from "clsx";

type RecentMentionsProps = {
  data: RecentMentionEnriched[];
  loading: boolean;
  className?: string;
};

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toCsv(rows: RecentMentionEnriched[]) {
  const headers = [
    "id",
    "sentence",
    "position",
    "date",
    "entity_type",
    "entity_id",
    "entity_name",
    "model_id",
    "model_name",
    "prompt_id",
    "prompt_text",
  ];

  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.sentence ?? "",
        r.position ?? "",
        r.date,
        r.entity?.type ?? "",
        r.entity?.id ?? "",
        r.entity?.name ?? "",
        r.model?.id ?? "",
        r.model?.name ?? "",
        r.prompt?.id ?? "",
        r.prompt?.text ?? "",
      ].map(esc).join(","),
    ),
  ];

  return lines.join("\n");
}

export function RecentMentions({ data, loading, className }: RecentMentionsProps) {
  const { open } = useOpenChatFromMention();
  
  const handleDownload = () => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recent_mentions_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mentionsData = useMemo((): RecentMentionEnriched[] => {
    return data
  }, [data])

  return (
    <div className={clsx("bg-white rounded-lg ml-1", className)}>
      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Recent Mentions</h3>
          <p className="text-sm text-gray-500">Recent chat mentions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
          onClick={handleDownload}
          disabled={loading || data.length === 0}
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
      </div>

      {loading ? (
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No mentions in the selected range.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-xs">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Prompt / Chat</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Position</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Created</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Entity</th>
                
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td
                    className="py-2 px-4 cursor-pointer"
                    onClick={() => open(m)}                
                    title="Open chat"
                  >
                    <div className="flex items-start gap-3 min-w-0 items-center">
                      <div className="flex-none pr-2">
                        {m.model?.logo ? (
                          <img
                            src={m.model.logo}
                            alt={m.model.name ?? "Model"}
                            className="h-5 w-5 rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded bg-gray-100 grid place-items-center text-[10px] text-gray-500 uppercase">
                            {(m.model?.name?.[0] ?? "?")}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 text-xs font-medium line-clamp-1">
                          {m.prompt?.text ?? (m.prompt?.id ? `Prompt ${m.prompt.id}` : "—")}
                        </div>
                        <p className="text-xs text-gray-900 line-clamp-2">
                          {m.sentence || "—"}
                        </p>
                      </div>
                    </div>
                  </td>


                  <td className="py-2 px-4 text-center">
                    <span className="text-xs font-medium text-gray-900">
                      {m.position ?? "—"}
                    </span>
                  </td>

                  <td className="py-2 px-4 text-center">
                    <span className="text-xs text-gray-500">{formatDate(m.date)}</span>
                  </td>

                  <td className="py-2 px-4">
                    {m.entity ? (
                      <div className="flex items-center justify-center gap-2">
                        {m.entity.logo ? (
                          <img
                            src={m.entity.logo}
                            alt={m.entity.name ?? "Entity"}
                            className="h-5 w-5 rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <div className="text-center">
                          <div className="text-xs text-gray-900">
                            {m.entity.name ?? "—"}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase">
                            {m.entity.type ?? ""}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">—</div>
                    )}
                  </td>

                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
