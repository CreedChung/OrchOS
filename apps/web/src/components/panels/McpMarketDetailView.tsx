import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Download01Icon,
  FolderGitIcon,
  InformationCircleIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type McpMarketItem } from "@/lib/api";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface McpMarketDetailViewProps {
  item: McpMarketItem;
  projects: Project[];
  onRefresh: () => void;
  embedded?: boolean;
}

export function McpMarketDetailView({ item, projects, onRefresh, embedded = false }: McpMarketDetailViewProps) {
  const navigate = useNavigate();
  const [installing, setInstalling] = useState(false);
  const [scope, setScope] = useState<"global" | "project">("global");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");

  const handleInstall = async () => {
    if (scope === "project" && !projectId) {
      toast.error("Please select a project target first");
      return;
    }

    setInstalling(true);
    try {
      await api.createMcpServer({
        name: item.name,
        command: item.command,
        args: item.args,
        env: {},
        scope,
        projectId: scope === "project" ? projectId : undefined,
      });
      toast.success(`Installed ${item.name}`);
      onRefresh();
    } catch (err) {
      console.error("Failed to install MCP server:", err);
      toast.error(`Failed to install ${item.name}`);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={cn("mx-auto flex w-full flex-1 flex-col overflow-y-auto p-6", !embedded && "max-w-5xl") }>
        {!embedded ? (
          <div className="mb-6 flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard/mcp-servers" })}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-1.5 size-3.5" />
              返回市场
            </Button>
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-6 backdrop-blur-sm">
          <div className="absolute -right-12 -top-12 size-40 rounded-full bg-primary/6 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
                  <HugeiconsIcon icon={item.sourceType === "official" ? SparklesIcon : FolderGitIcon} className="size-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{item.name}</h1>
                    {item.installed ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        已安装
                      </span>
                    ) : null}
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      官方
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {item.category ? (
                  <span className="rounded-md bg-primary/8 px-2 py-1 text-xs font-medium text-primary/80">
                    {item.category}
                  </span>
                ) : null}
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground/75">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => window.open(item.source, "_blank", "noopener,noreferrer")}>
                <HugeiconsIcon icon={InformationCircleIcon} className="mr-1.5 size-4" />
                查看来源
              </Button>
              <Button type="button" onClick={() => void handleInstall()} disabled={item.installed || installing}>
                <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-4" />
                {item.installed ? "Installed" : installing ? "Installing..." : "Install"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/40 bg-card/70 p-5">
            <h2 className="text-sm font-semibold text-foreground">安装配置</h2>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/70">Command</div>
                <div className="mt-1 rounded-lg border border-border/40 bg-background/60 px-3 py-2 font-mono text-xs break-all">{item.command}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/70">Args</div>
                <div className="mt-1 rounded-lg border border-border/40 bg-background/60 px-3 py-2 font-mono text-xs break-all">{item.args.join(" ") || "-"}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/40 bg-card/70 p-5">
            <h2 className="text-sm font-semibold text-foreground">安装目标</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Select value={scope} onValueChange={(value) => setScope(value as "global" | "project") }>
                <SelectTrigger className="h-9 min-w-32 text-sm">
                  <SelectValue>{scope === "global" ? "Global" : "Project"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {scope === "project" ? (
                <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "") }>
                  <SelectTrigger className="h-9 min-w-40 text-sm" disabled={projects.length === 0}>
                    <SelectValue>
                      {projects.find((project) => project.id === projectId)?.name || "Select project"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-border/40 bg-card/70 p-5">
          <h2 className="text-sm font-semibold text-foreground">仓库信息</h2>
          <dl className="mt-3 grid gap-3 text-sm lg:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">作者 / 组织</dt>
              <dd className="mt-1 text-foreground">{item.owner || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">仓库</dt>
              <dd className="mt-1 text-foreground">{item.repo || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Stars</dt>
              <dd className="mt-1 text-foreground">{typeof item.stars === "number" ? item.stars.toLocaleString() : "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">最近更新</dt>
              <dd className="mt-1 text-foreground">{item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toLocaleString() : "-"}</dd>
            </div>
            <div className="lg:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">主页</dt>
              <dd className="mt-1 break-all text-foreground/85">{item.homepage || "-"}</dd>
            </div>
            <div className="lg:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">来源仓库</dt>
              <dd className="mt-1 rounded-lg border border-border/40 bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
                {item.source}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
