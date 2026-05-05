import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Bookmark01Icon,
  Edit02Icon,
  Folder01Icon,
  LinkSquare02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/bookmarks")({
  component: BookmarksPage,
});

type ImportedBookmark = {
  id: string;
  title: string;
  url: string;
};

type BookmarkCategory = {
  id: string;
  name: string;
  bookmarks: ImportedBookmark[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "bookmark-category";
}

function dedupeCategoryId(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let index = 2;
  while (used.has(`${base}-${index}`)) {
    index += 1;
  }

  const next = `${base}-${index}`;
  used.add(next);
  return next;
}

function normalizeCategory(name: string, bookmarks: ImportedBookmark[], used: Set<string>) {
  const trimmedName = name.trim() || "Imported";
  return {
    id: dedupeCategoryId(slugify(trimmedName), used),
    name: trimmedName,
    bookmarks,
  } satisfies BookmarkCategory;
}

function parseBookmarkHtml(text: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const containers = Array.from(doc.querySelectorAll("dt"));
  const categories: BookmarkCategory[] = [];
  const used = new Set<string>();

  for (const container of containers) {
    const heading = container.querySelector(":scope > h3");
    if (!heading) {
      continue;
    }

    const links = Array.from(container.querySelectorAll(":scope > dl a[href]"));
    if (links.length === 0) {
      continue;
    }

    const bookmarks = links
      .map((link, index) => {
        const url = link.getAttribute("href")?.trim() ?? "";
        if (!url) {
          return null;
        }

        return {
          id: `${slugify(heading.textContent || "category")}-${index}-${slugify(link.textContent || "bookmark")}`,
          title: link.textContent?.trim() || url,
          url,
        } satisfies ImportedBookmark;
      })
      .filter((item): item is ImportedBookmark => item !== null);

    if (bookmarks.length === 0) {
      continue;
    }

    categories.push(normalizeCategory(heading.textContent || "Imported", bookmarks, used));
  }

  if (categories.length > 0) {
    return categories;
  }

  const looseLinks = Array.from(doc.querySelectorAll("a[href]"));
  const bookmarks = looseLinks
    .map((link, index) => {
      const url = link.getAttribute("href")?.trim() ?? "";
      if (!url) {
        return null;
      }

      return {
        id: `imported-${index}-${slugify(link.textContent || "bookmark")}`,
        title: link.textContent?.trim() || url,
        url,
      } satisfies ImportedBookmark;
    })
    .filter((item): item is ImportedBookmark => item !== null);

  return bookmarks.length > 0 ? [normalizeCategory("Imported", bookmarks, used)] : [];
}

function parseBookmarkJson(text: string) {
  const data = JSON.parse(text) as unknown;
  const used = new Set<string>();

  if (Array.isArray(data)) {
    const bookmarks = data
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (!url) {
          return null;
        }

        return {
          id: `imported-${index}-${slugify(String(record.title || record.name || url))}`,
          title: typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : url,
          url,
        } satisfies ImportedBookmark;
      })
      .filter((item): item is ImportedBookmark => item !== null);

    return bookmarks.length > 0 ? [normalizeCategory("Imported", bookmarks, used)] : [];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const categories: BookmarkCategory[] = [];

  for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const bookmarks = value
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (!url) {
          return null;
        }

        return {
          id: `${slugify(name)}-${index}-${slugify(String(record.title || record.name || url))}`,
          title: typeof record.title === "string" ? record.title : typeof record.name === "string" ? record.name : url,
          url,
        } satisfies ImportedBookmark;
      })
      .filter((item): item is ImportedBookmark => item !== null);

    if (bookmarks.length > 0) {
      categories.push(normalizeCategory(name, bookmarks, used));
    }
  }

  return categories;
}

function parseBookmarkCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
  const used = new Set<string>();
  const header = rows[0].map((cell) => cell.toLowerCase());
  const categoryIndex = header.findIndex((cell) => cell === "category" || cell === "folder");
  const titleIndex = header.findIndex((cell) => cell === "title" || cell === "name");
  const urlIndex = header.findIndex((cell) => cell === "url" || cell === "link");
  const dataRows = urlIndex >= 0 ? rows.slice(1) : rows;
  const grouped = new Map<string, ImportedBookmark[]>();

  dataRows.forEach((row, index) => {
    const fallbackUrlIndex = urlIndex >= 0 ? urlIndex : row.length > 1 ? 1 : 0;
    const url = row[fallbackUrlIndex]?.trim() ?? "";
    if (!url || !/^https?:\/\//i.test(url)) {
      return;
    }

    const category = categoryIndex >= 0 ? row[categoryIndex]?.trim() || "Imported" : "Imported";
    const title = titleIndex >= 0 ? row[titleIndex]?.trim() || url : row[0]?.trim() || url;
    const existing = grouped.get(category) ?? [];
    existing.push({
      id: `${slugify(category)}-${index}-${slugify(title)}`,
      title,
      url,
    });
    grouped.set(category, existing);
  });

  return Array.from(grouped.entries()).map(([name, bookmarks]) => normalizeCategory(name, bookmarks, used));
}

function BookmarksPage() {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 240), 380);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);

  function handleFetchBrowserBookmarks() {
    toast.info("Browser bookmark sync UI is ready. The browser import capability still needs implementation.");
  }

  function handleImportBookmarksClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      let parsed: BookmarkCategory[] = [];

      if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        parsed = parseBookmarkHtml(text);
      } else if (lowerName.endsWith(".json")) {
        parsed = parseBookmarkJson(text);
      } else if (lowerName.endsWith(".csv")) {
        parsed = parseBookmarkCsv(text);
      } else {
        throw new Error("Unsupported bookmark file format");
      }

      if (parsed.length === 0) {
        throw new Error("No bookmarks could be imported from this file");
      }

      setCategories(parsed);
      setSelectedCategoryId(parsed[0]?.id ?? null);
      toast.success(`Imported ${parsed.reduce((count, category) => count + category.bookmarks.length, 0)} bookmarks`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import bookmarks");
    }

    event.target.value = "";
  }

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.json,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={cn(
          "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--bookmarks-sidebar-width)]",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({ "--bookmarks-sidebar-width": `${Math.min(sidebarWidth, 380)}px` } as CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="text-sm font-semibold text-foreground">Bookmarks</div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="active:-translate-y-0"
              onClick={handleCollapseSidebar}
              title="Collapse sidebar"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 p-3">
              <section className="space-y-2">
                <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Sources
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={handleFetchBrowserBookmarks}>
                  <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
                  Fetch from browser
                </Button>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={handleImportBookmarksClick}>
                  <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
                  Import from file
                </Button>
              </section>

              <section className="space-y-2">
                <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Categories
                </div>
                {categories.length > 0 ? (
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const isActive = category.id === selectedCategory?.id;

                      return (
                        <div
                          key={category.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                            isActive ? "bg-accent" : "hover:bg-accent/40",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <HugeiconsIcon icon={Folder01Icon} className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{category.name}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {category.bookmarks.length}
                            </span>
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setRenameCategoryId(category.id)}
                            title="Edit category"
                          >
                            <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs leading-5 text-muted-foreground">
                    Imported bookmark categories will appear here.
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize bookmarks sidebar"
            onPointerDown={handleResizeStart}
            className={cn(
              "group absolute top-0 right-[-8px] z-20 flex h-full w-4 cursor-col-resize items-center justify-center",
              isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
            )}
          >
            <div
              className={cn(
                "flex h-12 w-2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,transform,box-shadow,opacity] duration-150 ease-out group-hover:bg-muted group-hover:scale-100 group-hover:shadow-md",
                isResizingSidebar ? "border-border bg-muted scale-100 shadow-md" : "scale-95",
                !showExpandedContent && "opacity-0",
              )}
            >
              <div
                className={cn(
                  "h-7 w-px rounded-full bg-border transition-[height,background-color,opacity] duration-150 ease-out group-hover:h-8 group-hover:bg-foreground/35",
                  isResizingSidebar && "opacity-0",
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:translate-y-0"
            onClick={handleExpandSidebar}
            title="Expand sidebar"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        ) : null}

        <ScrollArea className="h-full">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-6">
            {selectedCategory ? (
              <>
                <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Category</div>
                    <h1 className="mt-2 text-xl font-semibold text-foreground">{selectedCategory.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedCategory.bookmarks.length} imported bookmark{selectedCategory.bookmarks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={handleImportBookmarksClick}>
                    <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                    Import another file
                  </Button>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {selectedCategory.bookmarks.map((bookmark) => (
                    <a
                      key={bookmark.id}
                      href={bookmark.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <HugeiconsIcon icon={Bookmark01Icon} className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-medium text-foreground">{bookmark.title}</h2>
                          <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-muted-foreground">
                            {bookmark.url}
                          </p>
                        </div>
                      </div>
                    </a>
                  ))}
                </section>
              </>
            ) : (
              <section className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-16 shadow-sm">
                <div className="mx-auto max-w-xl text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <HugeiconsIcon icon={Bookmark01Icon} className="size-6" />
                  </div>
                  <h1 className="mt-5 text-xl font-semibold text-foreground">Bookmarks workspace</h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Import bookmarks from your browser or a file, then organize them by category in this dedicated workspace.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" onClick={handleFetchBrowserBookmarks}>
                      <HugeiconsIcon icon={LinkSquare02Icon} className="size-4" />
                      Fetch from browser
                    </Button>
                    <Button type="button" variant="outline" onClick={handleImportBookmarksClick}>
                      <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                      Import from file
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </div>

      <RenameDialog
        open={renameCategoryId !== null}
        title="Edit category"
        initialValue={categories.find((category) => category.id === renameCategoryId)?.name ?? ""}
        placeholder="Category name"
        onClose={() => setRenameCategoryId(null)}
        onSubmit={(name) => {
          setCategories((current) =>
            current.map((category) =>
              category.id === renameCategoryId ? { ...category, name } : category,
            ),
          );
          setRenameCategoryId(null);
          toast.success("Category renamed");
        }}
      />
    </div>
  );
}
