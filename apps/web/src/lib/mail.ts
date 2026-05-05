import type { InboxThread } from "@/lib/api";
import type { MailFolderFilter } from "@/components/layout/MailFolderTabs";

export function matchesMailFolder(thread: InboxThread, filter: MailFolderFilter) {
  switch (filter) {
    case "all":
      return !thread.archived;
    case "unread":
      return !thread.archived && thread.status === "open";
    case "waiting_reply":
      return !thread.archived && thread.status === "waiting_user";
    case "completed":
      return !thread.archived && thread.status === "completed";
    case "archived":
      return thread.archived;
    default:
      return !thread.archived;
  }
}
