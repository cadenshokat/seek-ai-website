// src/lib/markdown.ts
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";

export const collapseExtraNewlines = (s: string = ""): string =>
  s.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

export const stripMdFence = (s: string = ""): string => {
  let t = (s || "").trim();

  // strip wrapping quotes like "…", '…', ", ', ",'
  if (
    (t.startsWith('"') && (t.endsWith('"') || t.endsWith('",'))) ||
    (t.startsWith("'") && (t.endsWith("'") || t.endsWith("',")))
  ) {
    t = t.replace(/^['"]/, "").replace(/['"],?$/, "").trim();
  }

  // strip a single outer code fence
  t = t.replace(/^\uFEFF?\s*```[a-zA-Z0-9_-]*\s*\n/, "");
  t = t.replace(/\n```[\s]*$/, "");

  return collapseExtraNewlines(t).trim();
};

export const normalizeMarkdown = (s: string = ""): string => stripMdFence(s);
export const takeFirstLines = (s: string = "", n = 3): string =>
  normalizeMarkdown(s).split(/\r?\n/).slice(0, n).join("\n");

type MarkdownSize = "xs" | "sm" | "base" | "lg";

export function Markdown({
  children,
  className = "",
  size = "sm", // default to your current look
}: {
  children: string;
  className?: string;
  size?: MarkdownSize;
}) {
  // Base scale from Tailwind Typography
  const scaleBySize: Record<MarkdownSize, string> = {
    xs:  "prose-sm md:prose-sm",     // smaller everywhere
    sm:  "prose-sm md:prose-base",   // your previous default
    base:"prose",                    // default scale
    lg:  "prose-lg",                 // larger
  };

  // Extra fine-grained downsizing for headings/code when using xs
  const xsOverrides =
    "prose-headings:mb-1 " +
    "prose-h1:text-lg prose-h2:text-base prose-h3:text-sm " +
    "prose-p:text-[13px] prose-li:text-[13px] " +
    "prose-code:text-[12px] prose-pre:text-[12px] prose-pre:leading-snug";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      className={[
        scaleBySize[size],
        "max-w-none break-words",
        "prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-auto",
        size === "xs" ? xsOverrides : "",
        className,
      ].join(" ")}
    >
      {children}
    </ReactMarkdown>
  );
}
