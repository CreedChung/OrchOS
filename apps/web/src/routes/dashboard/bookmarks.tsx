import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Add01Icon,
  Bookmark01Icon,
  Delete02Icon,
  Edit02Icon,
  Folder01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/interactive-empty-state";
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

type BookmarkDraft = {
  title: string;
  url: string;
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
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedBookmark, setDraggedBookmark] = useState<{ bookmarkId: string; sourceCategoryId: string } | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(null);
  const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft>({ title: "", url: "" });
  const [loading, setLoading] = useState(true);
  const [isCreateBookmarkDialogOpen, setIsCreateBookmarkDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadBookmarks();
  }, []);

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


  function handleImportBookmarksClick() {
    fileInputRef.current?.click();
  }

  async function loadBookmarks() {
    setLoading(true);
    try {
      const nextCategories = await api.listBookmarks();
      setCategories(nextCategories);
      setSelectedCategoryId((current) => current ?? nextCategories[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  }

  async function persistCategories(nextCategories: BookmarkCategory[], nextSelectedCategoryId?: string | null) {
    const saved = await api.replaceBookmarks(nextCategories);
    setCategories(saved);
    setSelectedCategoryId(nextSelectedCategoryId ?? saved[0]?.id ?? null);
    return saved;
  }

  function handleCreateCategory() {
    const index = categories.length + 1;
    const newCategory: BookmarkCategory = {
      id: `custom-${Date.now()}`,
      name: `New category ${index}`,
      bookmarks: [],
    };

    const nextCategories = [...categories, newCategory];
    void persistCategories(nextCategories, newCategory.id).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create category");
    });
    setRenameCategoryId(newCategory.id);
  }

  function moveCategory(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const sourceIndex = categories.findIndex((category) => category.id === sourceId);
    const targetIndex = categories.findIndex((category) => category.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const next = [...categories];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistCategories(next, selectedCategoryId).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reorder categories");
    });
  }

  function reorderBookmarkWithinCategory(bookmarkId: string, targetBookmarkId: string) {
    if (!selectedCategory || bookmarkId === targetBookmarkId) {
      return;
    }

    const sourceIndex = selectedCategory.bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);
    const targetIndex = selectedCategory.bookmarks.findIndex((bookmark) => bookmark.id === targetBookmarkId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextBookmarks = [...selectedCategory.bookmarks];
    const [moved] = nextBookmarks.splice(sourceIndex, 1);
    nextBookmarks.splice(targetIndex, 0, moved);
    const nextCategories = categories.map((category) =>
      category.id === selectedCategory.id ? { ...category, bookmarks: nextBookmarks } : category,
    );

    void persistCategories(nextCategories, selectedCategory.id).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reorder bookmarks");
    });
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

      await persistCategories(parsed, parsed[0]?.id ?? null);
      toast.success(`Imported ${parsed.reduce((count, category) => count + category.bookmarks.length, 0)} bookmarks`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import bookmarks");
    }

    event.target.value = "";
  }

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null;
  const editingBookmark = selectedCategory?.bookmarks.find((bookmark) => bookmark.id === editingBookmarkId) ?? null;
  const filteredBookmarks = selectedCategory
    ? selectedCategory.bookmarks.filter((bookmark) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return (
          bookmark.title.toLowerCase().includes(query) ||
          bookmark.url.toLowerCase().includes(query)
        );
      })
    : [];

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
                <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={handleImportBookmarksClick}>
                  <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
                  Import from file
                </Button>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-2">
                  <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Categories
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleCreateCategory}
                    title="New category"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                  </Button>
                </div>
                {categories.length > 0 ? (
                  <div className="space-y-1">
                    {categories.map((category) => {
                      const isActive = category.id === selectedCategory?.id;

                      return (
                        <div
                          key={category.id}
                          draggable
                          onDragStart={() => setDraggedCategoryId(category.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (draggedCategoryId) {
                              moveCategory(draggedCategoryId, category.id);
                              setDraggedCategoryId(null);
                              return;
                            }
                            if (draggedBookmark && draggedBookmark.sourceCategoryId !== category.id) {
                              void api.moveBookmarkItem(
                                draggedBookmark.bookmarkId,
                                draggedBookmark.sourceCategoryId,
                                category.id,
                              ).then((saved) => {
                                setCategories(saved);
                                setSelectedCategoryId(category.id);
                                setDraggedBookmark(null);
                                toast.success("Bookmark moved");
                              }).catch((error) => {
                                toast.error(error instanceof Error ? error.message : "Failed to move bookmark");
                              });
                            }
                          }}
                          onDragEnd={() => setDraggedCategoryId(null)}
                          className={cn(
                            "group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                            isActive ? "bg-accent" : "hover:bg-accent/40",
                            draggedCategoryId === category.id && "opacity-60",
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
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            title="Edit category"
                          >
                            <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteCategoryId(category.id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            title="Delete category"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
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

        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize bookmarks sidebar"
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4",
            sidebarCollapsed && "hidden",
            isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            className={cn(
              "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
              isResizingSidebar && "border-border bg-muted shadow-md",
            )}
          >
            <div
              className={cn(
                "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                isResizingSidebar && "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
            onClick={handleExpandSidebar}
            title="Expand sidebar"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        ) : null}

        <ScrollArea className="h-full">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="lg" className="text-muted-foreground" />
              </div>
            ) : selectedCategory ? (
              <>
                <section className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Category</div>
                    <h1 className="mt-2 text-xl font-semibold text-foreground">{selectedCategory.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedCategory.bookmarks.length} imported bookmark{selectedCategory.bookmarks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        setBookmarkDraft({ title: "", url: "" });
                        setIsCreateBookmarkDialogOpen(true);
                      }}
                    >
                      <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      New bookmark
                    </Button>
                    <Button type="button" variant="outline" onClick={handleImportBookmarksClick}>
                      <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                      Import another file
                    </Button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search bookmarks in this category"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredBookmarks.length > 0 ? (
                    filteredBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        draggable
                        onDragStart={() => setDraggedBookmark({ bookmarkId: bookmark.id, sourceCategoryId: selectedCategory.id })}
                        onDragEnd={() => setDraggedBookmark(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (!draggedBookmark) {
                            return;
                          }

                          if (draggedBookmark.sourceCategoryId === selectedCategory.id) {
                            reorderBookmarkWithinCategory(draggedBookmark.bookmarkId, bookmark.id);
                            setDraggedBookmark(null);
                            return;
                          }
                        }}
                        className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/30"
                      >
                        <div className="flex items-start gap-3">
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 flex-1 items-start gap-3"
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <HugeiconsIcon icon={Bookmark01Icon} className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h2 className="truncate text-sm font-medium text-foreground">{bookmark.title}</h2>
                              <p className="mt-2 line-clamp-2 break-all text-xs leading-5 text-muted-foreground">
                                {bookmark.url}
                              </p>
                            </div>
                          </a>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setEditingBookmarkId(bookmark.id);
                                setBookmarkDraft({ title: bookmark.title, url: bookmark.url });
                              }}
                              title="Edit bookmark"
                            >
                              <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeletingBookmarkId(bookmark.id)}
                              className="hover:text-destructive"
                              title="Delete bookmark"
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 px-5 py-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      {searchQuery.trim()
                        ? "No bookmarks match the current search."
                        : "This category does not have any bookmarks yet."}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  variant="subtle"
                  size="lg"
                  title="Bookmarks workspace"
                  description="Import your bookmarks from a file, then organize them by category in this dedicated workspace."
                  icons={[
                    <HugeiconsIcon key="b1" icon={Bookmark01Icon} className="size-6" />,
                    <HugeiconsIcon key="b2" icon={Folder01Icon} className="size-6" />,
                    <HugeiconsIcon key="b3" icon={Upload01Icon} className="size-6" />,
                  ]}
                  action={{
                    label: "Import from file",
                    icon: <HugeiconsIcon icon={Upload01Icon} className="size-4" />,
                    onClick: handleImportBookmarksClick,
                  }}
                  className="w-full max-w-lg"
                />
              </div>
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
          const nextCategories = categories.map((category) =>
            category.id === renameCategoryId ? { ...category, name } : category,
          );
          void persistCategories(nextCategories, selectedCategoryId).then(() => {
            setRenameCategoryId(null);
            toast.success("Category renamed");
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to rename category");
          });
        }}
      />

      <AppDialog
        open={isCreateBookmarkDialogOpen}
        onOpenChange={setIsCreateBookmarkDialogOpen}
        title="New bookmark"
        description="Add a bookmark manually to the current category."
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsCreateBookmarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!selectedCategoryId) {
                  toast.error("Select a category first");
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  toast.error("Title and URL are required");
                  return;
                }

                void api.createBookmarkItem(selectedCategoryId, {
                  title: bookmarkDraft.title.trim(),
                  url: bookmarkDraft.url.trim(),
                }).then((saved) => {
                  setCategories(saved);
                  setSelectedCategoryId(selectedCategoryId);
                  setBookmarkDraft({ title: "", url: "" });
                  setIsCreateBookmarkDialogOpen(false);
                  toast.success("Bookmark created");
                }).catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Failed to create bookmark");
                });
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Title</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">URL</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, url: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deletingBookmarkId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingBookmarkId(null);
          }
        }}
        title="Delete bookmark"
        description="This removes the bookmark from the current category."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!selectedCategoryId || !deletingBookmarkId) {
            return;
          }

          void api.deleteBookmarkItem(selectedCategoryId, deletingBookmarkId).then((saved) => {
            setCategories(saved);
            setSelectedCategoryId((current) => current ?? saved[0]?.id ?? null);
            setDeletingBookmarkId(null);
            toast.success("Bookmark deleted");
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to delete bookmark");
          });
        }}
      />

      <AppDialog
        open={editingBookmarkId !== null && editingBookmark !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBookmarkId(null);
          }
        }}
        title="Edit bookmark"
        description="Update the title and URL for this bookmark."
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditingBookmarkId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editingBookmarkId || !selectedCategoryId) {
                  return;
                }

                if (!bookmarkDraft.title.trim() || !bookmarkDraft.url.trim()) {
                  toast.error("Title and URL are required");
                  return;
                }

                void api.updateBookmarkItem(selectedCategoryId, editingBookmarkId, {
                  title: bookmarkDraft.title.trim(),
                  url: bookmarkDraft.url.trim(),
                }).then((saved) => {
                  setCategories(saved);
                  setSelectedCategoryId((current) => current ?? saved[0]?.id ?? null);
                  setEditingBookmarkId(null);
                  toast.success("Bookmark updated");
                }).catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Failed to update bookmark");
                });
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">Title</span>
            <input
              value={bookmarkDraft.title}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">URL</span>
            <input
              value={bookmarkDraft.url}
              onChange={(event) => setBookmarkDraft((current) => ({ ...current, url: event.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </AppDialog>

      <ConfirmDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCategoryId(null);
          }
        }}
        title="Delete category"
        description="This removes the category from the current bookmarks workspace view."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!deleteCategoryId) {
            return;
          }

          void api.deleteBookmarkCategory(deleteCategoryId).then((saved) => {
            setCategories(saved);
            if (selectedCategoryId === deleteCategoryId) {
              setSelectedCategoryId(saved[0]?.id ?? null);
            }
            setDeleteCategoryId(null);
            toast.success("Category deleted");
          }).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Failed to delete category");
          });
        }}
      />
    </div>
  );
}
