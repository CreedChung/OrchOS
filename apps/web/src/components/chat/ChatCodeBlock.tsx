import { useCallback, useEffect, useState } from "react";
import { createHighlighter } from "shiki";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

const CHAT_CODE_LANGS = [
  "tsx",
  "typescript",
  "javascript",
  "jsx",
  "json",
  "css",
  "scss",
  "html",
  "markdown",
  "md",
  "bash",
  "shell",
  "diff",
];

let chatHighlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getChatHighlighter() {
  if (!chatHighlighterPromise) {
    chatHighlighterPromise = createHighlighter({
      langs: CHAT_CODE_LANGS,
      themes: ["github-dark", "github-light"],
    });
  }

  return chatHighlighterPromise;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCodeLanguage(lang: string) {
  if (lang === "tsx") return "typescript";
  if (lang === "ts") return "typescript";
  if (lang === "js") return "javascript";
  if (lang === "md") return "markdown";
  if (lang === "sh") return "bash";
  return lang;
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, []);

  return theme;
}

export function ChatCodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    let mounted = true;

    async function highlight() {
      try {
        setLoading(true);
        const highlighter = await getChatHighlighter();
        const highlightedHtml = highlighter.codeToHtml(code, {
          lang: normalizeCodeLanguage(language || "text"),
          theme: resolvedTheme === "dark" ? "github-dark" : "github-light",
        });

        if (mounted) {
          setHtml(highlightedHtml);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
          setLoading(false);
        }
      }
    }

    void highlight();

    return () => {
      mounted = false;
    };
  }, [code, language, resolvedTheme]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [code]);

  return (
    <>
      <style>{`
        .chat-code-block {
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 1rem;
          background: var(--card);
        }
        .chat-code-block pre {
          margin: 0;
          padding: 1rem;
          overflow-x: auto;
          background: transparent !important;
          font-size: 0.8125rem;
          line-height: 1.55;
          white-space: pre;
        }
        .chat-code-block code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: inherit;
          line-height: inherit;
          white-space: pre;
        }
      `}</style>
      <div className="my-3 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {language || "text"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={() => {
              void handleCopy();
            }}
            title="Copy code"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <div className="chat-code-block">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
              {m.loading()}
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </>
  );
}
