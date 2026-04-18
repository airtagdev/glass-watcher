import { useCloudSync } from "@/hooks/useCloudSync";
import { SyncConflictDialog } from "@/components/SyncConflictDialog";

/**
 * Top-level component that watches for cloud sync conflicts on first sign-in
 * and surfaces the merge/upload/download dialog.
 */
export function SyncGate() {
  const { needsChoice, localCounts, cloudCounts, choose } = useCloudSync();
  return (
    <SyncConflictDialog
      open={needsChoice}
      localCounts={localCounts}
      cloudCounts={cloudCounts}
      onChoose={choose}
    />
  );
}
