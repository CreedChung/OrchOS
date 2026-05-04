import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { api, type LocalHostPairingToken } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  const { localHosts, refreshLocalHosts, loading } = useDashboard();
  const [pairing, setPairing] = useState<LocalHostPairingToken | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  async function handleCreatePairingToken() {
    try {
      setPairingLoading(true);
      const token = await api.createLocalHostPairingToken();
      setPairing(token);
      toast.success("Pairing token generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create pairing token");
    } finally {
      setPairingLoading(false);
    }
  }

  return (
    <LocalDevicesView
      hosts={localHosts}
      loading={loading}
      pairing={pairing}
      pairingLoading={pairingLoading}
      onCreatePairingToken={handleCreatePairingToken}
      onRefresh={refreshLocalHosts}
    />
  );
}
