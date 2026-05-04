import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "@/components/panels/BoardView";
import { useDashboard } from "@/lib/dashboard-context";
import type { ConversationBoardFilter } from "@/components/panels/BoardView";

export const Route = createFileRoute("/dashboard/board")({ component: BoardPage });

function BoardPage() {
  const [boardFilter] = useState<ConversationBoardFilter>("all");
  const { agents, runtimes, projects, commands } = useDashboard();

  return (
    <BoardView
      agents={agents}
      commands={commands}
      runtimes={runtimes}
      projects={projects}
      boardFilter={boardFilter}
    />
  );
}
