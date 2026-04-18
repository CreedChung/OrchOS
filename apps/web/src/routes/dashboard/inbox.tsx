import { createFileRoute } from "@tanstack/react-router";
import { InboxList } from "#/components/panels/InboxList";
import { InboxDetail, InboxNoSelection } from "#/components/panels/InboxDetail";
import { useDashboard } from "#/lib/dashboard-context";
import { useUIStore } from "#/lib/store";
import { isInboxItem } from "#/lib/types";

export const Route = createFileRoute("/dashboard/inbox")({ component: InboxPage });

function InboxPage() {
  const { problems, handleConvertToGoal, handleDismiss } = useDashboard();
  const { activeInboxId, setActiveInboxId, sourceFilter } = useUIStore();

  const activeInboxItem = problems.find(
    (p) => p.id === activeInboxId && p.status === "open" && isInboxItem(p),
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <InboxList
        problems={problems}
        activeInboxId={activeInboxId}
        sourceFilter={sourceFilter}
        onSelectItem={setActiveInboxId}
      />
      <div className="flex-1 overflow-hidden">
        {activeInboxItem ? (
          <InboxDetail
            item={activeInboxItem}
            onConvertToGoal={handleConvertToGoal}
            onDismiss={handleDismiss}
          />
        ) : (
          <InboxNoSelection />
        )}
      </div>
    </div>
  );
}
