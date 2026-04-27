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
import { api, type SkillMarketItem } from "@/lib/api";
import { useConversationStore } from "@/lib/stores/conversation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SkillMarketDetailViewProps {
  item: SkillMarketItem;
  embedded?: boolean;
}

export function SkillMarketDetailView({ item, embedded = false }: SkillMarketDetailViewProps) {
  const navigate = useNavigate();
  const createConversation = useConversationStore((state) => state.createConversation);
  const loadMessages = useConversationStore((state) => state.loadMessages);
  const [sending, setSending] = useState(false);

  const handleSendToAgent = async () => {
    if (!item.installable || !item.installSource) {
      toast.info("该条目当前只有索引信息，请先打开原始页面查看详情。", {
        action: item.browseUrl
          ? {
              label: "打开",
              onClick: () => window.open(item.browseUrl, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      return;
    }

    setSending(true);
    try {
      const conversation = await createConversation({});
      const instruction = [
        `请安装这个 skill repo：${item.installSource}`,
        `技能名称：${item.name}`,
        item.description ? `说明：${item.description}` : undefined,
        "安装方式：将这个 repo 地址作为技能来源处理，并在安装前检查仓库内容与风险。",
      ]
        .filter(Boolean)
        .join("\n");

      await api.sendConversationMessage(conversation.id, instruction);
      await loadMessages(conversation.id, { force: true });
      await navigate({ to: "/dashboard/creation" });
      toast.success(`已将 ${item.name} 的仓库地址发送给 agent`);
    } catch (err) {
      console.error("Failed to send market skill to agent:", err);
      toast.error(`发送 ${item.name} 给 agent 失败`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={cn("mx-auto flex w-full flex-1 flex-col overflow-y-auto p-6", !embedded && "max-w-5xl") }>
        {!embedded ? (
          <div className="mb-6 flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/dashboard/skills" })}>
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
                    {item.sourceType === "official" ? (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        官方
                      </span>
                    ) : null}
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
              {item.browseUrl ? (
                <Button type="button" variant="outline" onClick={() => window.open(item.browseUrl, "_blank", "noopener,noreferrer")}>
                  <HugeiconsIcon icon={InformationCircleIcon} className="mr-1.5 size-4" />
                  查看来源
                </Button>
              ) : null}
              <Button type="button" onClick={() => void handleSendToAgent()} disabled={!item.installable || item.installed || sending}>
                <HugeiconsIcon icon={Download01Icon} className="mr-1.5 size-4" />
                {item.installed ? "Installed" : !item.installable ? "Indexed" : sending ? "Sending..." : "Send to Agent"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/40 bg-card/70 p-5">
            <h2 className="text-sm font-semibold text-foreground">安装来源</h2>
            <div className="mt-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
              {item.installSource || item.source}
            </div>
            {!item.installable ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                当前条目只有索引信息，没有可直接发送给 agent 的标准 repo 安装地址。
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-border/40 bg-card/70 p-5">
            <h2 className="text-sm font-semibold text-foreground">详情</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">作者 / 组织</dt>
                <dd className="mt-1 text-foreground">{item.owner || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">仓库</dt>
                <dd className="mt-1 text-foreground">{item.repo || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">类型</dt>
                <dd className="mt-1 text-foreground">{item.sourceType === "official" ? "Official Market Entry" : "Market Entry"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">状态</dt>
                <dd className="mt-1 text-foreground">{item.installed ? "Installed" : item.installable ? "Ready to send to agent" : "Indexed only"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">Stars</dt>
                <dd className="mt-1 text-foreground">{typeof item.stars === "number" ? item.stars.toLocaleString() : "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">最近更新</dt>
                <dd className="mt-1 text-foreground">{item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toLocaleString() : "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">主页</dt>
                <dd className="mt-1 break-all text-foreground/85">{item.homepage || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground/70">来源 URL</dt>
                <dd className="mt-1 break-all text-foreground/85">{item.browseUrl || item.source}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
