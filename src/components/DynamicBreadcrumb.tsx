import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Resolvers = Partial<{
  prompt: (id: string) => string | undefined;
  item: (id: string) => string | undefined;
  chat: (id: string) => string | undefined;
  section: (id: string) => string | undefined;
}>;

type RouteDef = {
  pattern: string; // e.g. "/prompts/:promptId/items/:itemId"
  label:
    | string
    | ((params: Record<string, string>, resolvers?: Resolvers) => string);
};

const ROUTES: RouteDef[] = [
  // Root
  { pattern: "/", label: "Home" },

  // Chats
  { pattern: "/chats", label: "Chats" },
  {
    pattern: "/chats/:chatId",
    label: (p, r) => r?.chat?.(p.chatId) ?? "Chat",
  },
  { pattern: "/chats/:chatId/sections", label: "Sections" },
  {
    pattern: "/chats/:chatId/sections/:sectionId",
    label: (p, r) => r?.section?.(p.sectionId) ?? "Section",
  },

  // Prompts
  { pattern: "/prompts", label: "Prompts" },
  {
    pattern: "/prompts/:promptId",
    label: (p, r) => r?.prompt?.(p.promptId) ?? "Prompt",
  },
  { pattern: "/prompts/:promptId/items", label: "Items" },
  {
    pattern: "/prompts/:promptId/items/:itemId",
    label: (p, r) => r?.item?.(p.itemId) ?? "Item",
  },
  { pattern: "/prompts/:promptId/sections", label: "Sections" },
  {
    pattern: "/prompts/:promptId/sections/:sectionId",
    label: (p, r) => r?.section?.(p.sectionId) ?? "Section",
  },

  // Nested: prompt > item > sections > section
  { pattern: "/prompts/:promptId/items/:itemId/sections", label: "Sections" },
  {
    pattern: "/prompts/:promptId/items/:itemId/sections/:sectionId",
    label: (p, r) => r?.section?.(p.sectionId) ?? "Section",
  },

  // Other top-levels you listed
  { pattern: "/sources", label: "Sources" },
  { pattern: "/competitors", label: "Competitors" },
  { pattern: "/tags", label: "Tags" },
  { pattern: "/people", label: "People" },
  { pattern: "/workspace", label: "Workspace" },
  { pattern: "/company", label: "Company" },
  { pattern: "/billing", label: "Billing" },
];

/** Very small pattern matcher (no external deps) */
function matchPattern(
  pattern: string,
  path: string
): { params: Record<string, string> } | null {
  const pSeg = pattern.split("/").filter(Boolean);
  const aSeg = path.split("/").filter(Boolean);
  if (pSeg.length !== aSeg.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < pSeg.length; i++) {
    const p = pSeg[i];
    const a = aSeg[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = a;
    } else if (p !== a) {
      return null;
    }
  }
  return { params };
}

function specificityKey(pattern: string) {
  // More static segments = more specific
  const segs = pattern.split("/").filter(Boolean);
  const staticCount = segs.filter((s) => !s.startsWith(":")).length;
  return `${segs.length.toString().padStart(2, "0")}-${staticCount
    .toString()
    .padStart(2, "0")}`;
}

function shortId(id?: string) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export function DynamicBreadcrumb({ resolvers }: { resolvers?: Resolvers }) {
  const location = useLocation();

  const crumbs = useMemo(() => {
    const full = location.pathname;
    // Build cumulative paths: "/prompts/123/items" -> ["/", "/prompts", "/prompts/123", "/prompts/123/items"]
    const parts = full.split("/").filter(Boolean);
    const paths: string[] = ["/"];
    for (let i = 0; i < parts.length; i++) {
      const prev = paths[paths.length - 1];
      paths.push(`${prev === "/" ? "" : prev}/${parts[i]}`);
    }

    // For each cumulative path, find the most specific matching route
    return paths
      .map((p) => {
        const matches = ROUTES
          .map((r) => {
            const m = matchPattern(r.pattern, p);
            return m ? { def: r, params: m.params } : null;
          })
          .filter(Boolean) as { def: RouteDef; params: Record<string, string> }[];

        if (matches.length === 0) return null;

        // Choose the most specific by our key
        const best = matches.sort(
          (a, b) =>
            specificityKey(a.def.pattern).localeCompare(
              specificityKey(b.def.pattern)
            )
        )[matches.length - 1];

        let label =
          typeof best.def.label === "function"
            ? best.def.label(best.params, resolvers)
            : best.def.label;

        // Fallback: if label is still generic and we have a single param, append short id
        if (
          typeof best.def.label !== "function" &&
          /:/.test(best.def.pattern)
        ) {
          const paramVal =
            Object.values(best.params)[Object.values(best.params).length - 1];
          if (paramVal) label = `${label} (${shortId(paramVal)})`;
        }

        return { path: p, label };
      })
      .filter(Boolean) as { path: string; label: string }[];
  }, [location.pathname, resolvers]);

  if (crumbs.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const lastIndex = crumbs.length - 1;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, idx) => {
          const isLast = idx === lastIndex;
          return (
            <React.Fragment key={c.path}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={c.path}>{c.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
