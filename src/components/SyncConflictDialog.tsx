import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, GitMerge } from "lucide-react";

export type SyncChoice = "upload" | "download" | "merge";

interface Props {
  open: boolean;
  localCounts: { watchlist: number; trades: number; alerts: number };
  cloudCounts: { watchlist: number; trades: number; alerts: number };
  onChoose: (choice: SyncChoice) => void;
}

export function SyncConflictDialog({ open, localCounts, cloudCounts, onChoose }: Props) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Sync your data</DialogTitle>
          <DialogDescription>
            We found data in both this device and your account. How should we combine it?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 my-2 text-sm">
          <div className="rounded-lg border p-3">
            <div className="font-medium mb-1">This device</div>
            <div className="text-muted-foreground space-y-0.5 text-xs">
              <div>{localCounts.watchlist} watchlist items</div>
              <div>{localCounts.trades} trades</div>
              <div>{localCounts.alerts} alerts</div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium mb-1">Your account</div>
            <div className="text-muted-foreground space-y-0.5 text-xs">
              <div>{cloudCounts.watchlist} watchlist items</div>
              <div>{cloudCounts.trades} trades</div>
              <div>{cloudCounts.alerts} alerts</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={() => onChoose("merge")} className="w-full justify-start" variant="default">
            <GitMerge className="w-4 h-4 mr-2" />
            Merge (recommended) — combine both
          </Button>
          <Button onClick={() => onChoose("upload")} className="w-full justify-start" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload — keep this device, replace account
          </Button>
          <Button onClick={() => onChoose("download")} className="w-full justify-start" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download — keep account, replace this device
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
