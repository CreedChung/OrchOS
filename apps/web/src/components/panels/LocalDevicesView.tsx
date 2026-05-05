import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ComputerIcon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/ui/interactive-empty-state";
import { m } from "@/paraglide/messages";

interface LocalDevicesViewProps {
  loading: boolean;
  onConnectClick: () => void;
}

export function LocalDevicesView({
  loading,
  onConnectClick,
}: LocalDevicesViewProps) {
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">{m.loading_devices()}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <EmptyState
        variant="subtle"
        size="lg"
        title={m.connect_local_device()}
        description={m.pair_any_machine_desc()}
        icons={[
          <HugeiconsIcon key="d1" icon={ComputerIcon} className="size-6" />,
          <HugeiconsIcon key="d2" icon={LinkSquare02Icon} className="size-6" />,
          <HugeiconsIcon key="d3" icon={Add01Icon} className="size-6" />,
        ]}
        action={{
          label: "Connect agent",
          icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
          onClick: onConnectClick,
        }}
        className="w-full max-w-lg"
      />
    </div>
  );
}


