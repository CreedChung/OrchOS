import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  LinkSquare02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/ui/interactive-empty-state";
import { m } from "@/paraglide/messages";
import type { LocalHostPairingToken } from "@/lib/api";

interface LocalDevicesViewProps {
  loading: boolean;
  pairing: LocalHostPairingToken | null;
  pairingLoading: boolean;
  onCreatePairingToken: () => Promise<void>;
}

export function LocalDevicesView({
  loading,
  pairing,
  pairingLoading,
  onCreatePairingToken,
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
          <HugeiconsIcon key="d3" icon={RefreshIcon} className="size-6" />,
        ]}
        action={{
          label: pairingLoading ? m.generating_token() : pairing ? m.regenerate_token() : m.pair_device(),
          icon: <HugeiconsIcon icon={ComputerIcon} className="size-4" />,
          onClick: () => void onCreatePairingToken(),
          disabled: pairingLoading,
        }}
        className="w-full max-w-lg"
      />
    </div>
  );
}


