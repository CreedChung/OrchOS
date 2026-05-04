import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "@/components/panels/BoardView";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/board")({ component: BoardPage });

function BoardPage() {
  const boardFilter = useUIStore((s) => s.boardFilter);

  return <BoardView boardFilter={boardFilter} />;
}
