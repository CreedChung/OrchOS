import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { InboxList } from "@/components/panels/InboxList";
import { InboxDetail, InboxNoSelection } from "@/components/panels/InboxDetail";
import { api, type InboxMessage, type InboxThread, type Project } from "@/lib/api";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/inbox")({ component: InboxPage });

function InboxPage() {
  const navigate = useNavigate();
  const { activeInboxId, setActiveInboxId, setActiveGoalId } = useUIStore();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [messagesByThreadId, setMessagesByThreadId] = useState<Record<string, InboxMessage[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    void api.listInboxThreads().then((result) => {
      setThreads(result);
      if (!activeInboxId && result.length > 0) {
        setActiveInboxId(result[0].id);
      }
    });
    void api.listProjects().then(setProjects);
  }, [activeInboxId, setActiveInboxId]);

  useEffect(() => {
    if (!activeInboxId) return;
    void api.listInboxMessages(activeInboxId).then((result) => {
      setMessagesByThreadId((prev) => ({ ...prev, [activeInboxId]: result }));
    });
  }, [activeInboxId]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeInboxId),
    [threads, activeInboxId],
  );

  const activeMessages = activeInboxId ? messagesByThreadId[activeInboxId] || [] : [];
  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const handleReply = async (
    threadId: string,
    data: { body: string; subject?: string; to: string[]; cc?: string[] },
  ) => {
    const message = await api.addInboxMessage(threadId, {
      messageType: "question",
      senderType: "user",
      senderName: "User",
      subject: data.subject,
      body: data.body,
      to: data.to,
      cc: data.cc,
    });

    setMessagesByThreadId((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), message],
    }));
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, lastMessageAt: message.createdAt, updatedAt: message.createdAt }
          : thread,
      ),
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <InboxList
        threads={threads}
        activeInboxId={activeInboxId}
        projectNameById={projectNameById}
        onSelectItem={setActiveInboxId}
      />
      <div className="flex-1 overflow-hidden">
        {activeThread ? (
          <InboxDetail
            thread={activeThread}
            messages={activeMessages}
            projects={projects}
            onReply={(data) => handleReply(activeThread.id, data)}
            onOpenGoal={
              activeThread.primaryGoalId
                ? () => {
                    setActiveGoalId(activeThread.primaryGoalId || null);
                    void navigate({ to: "/dashboard/projects" });
                  }
                : undefined
            }
          />
        ) : (
          <InboxNoSelection />
        )}
      </div>
    </div>
  );
}
