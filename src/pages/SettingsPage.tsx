import { useState, useRef } from "react";
import { Settings, Shield, Trash2, Bell, BarChart3, FileText, Download, Upload } from "lucide-react";
import { exportData, importData } from "@/lib/dataExport";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { settings, update, resetAllData } = useSettings();
  const { permission, isSubscribed, subscribe } = usePushNotifications();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePushToggle = async (checked: boolean) => {
    if (checked && !isSubscribed) {
      const ok = await subscribe();
      if (ok) {
        update({ pushNotificationsEnabled: true });
        toast.success("Push notifications enabled!");
      } else {
        toast.error("Could not enable notifications");
      }
    } else {
      update({ pushNotificationsEnabled: checked });
    }
  };

  return (
    <div className="px-4 pt-14 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {/* Confidence Score */}
        <div className="glass-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Confidence Score</p>
              <p className="text-xs text-muted-foreground">Show confidence rating on ticker cards</p>
            </div>
          </div>
          <Switch
            checked={settings.showConfidenceScore}
            onCheckedChange={(checked) => update({ showConfidenceScore: checked })}
          />
        </div>

        {/* Push Notifications */}
        <div className="glass-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Blocked by browser — enable in site settings"
                  : "Receive alerts when price targets are hit"}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed && settings.pushNotificationsEnabled}
            onCheckedChange={handlePushToggle}
            disabled={permission === "denied"}
          />
        </div>

        {/* Re-read Disclaimer */}
        <button
          onClick={() => setShowDisclaimer(true)}
          className="glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Disclaimer</p>
            <p className="text-xs text-muted-foreground">Re-read the app disclaimer</p>
          </div>
          <span className="ml-auto text-muted-foreground">›</span>
        </button>

        {/* Reset Data */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-loss/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4.5 h-4.5 text-loss" />
          </div>
          <div>
            <p className="text-sm font-semibold text-loss">Reset All Data</p>
            <p className="text-xs text-muted-foreground">Clear portfolio, watchlist, and saved preferences</p>
          </div>
          <span className="ml-auto text-muted-foreground">›</span>
        </button>
      </div>

      {/* Disclaimer Dialog */}
      <AlertDialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Disclaimer</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              The information provided in this app is for{" "}
              <span className="font-semibold text-foreground">informational and educational purposes only</span> and
              does not constitute financial advice, investment advice, trading advice, or any other sort of advice.
              <br /><br />
              You should not make any decision, financial or otherwise, based on any of the information presented
              here without undertaking independent due diligence and consulting with a professional financial advisor.
              <br /><br />
              By agreeing, you acknowledge that you use this app at your own risk and that the developers are not
              responsible for any financial losses or decisions made based on the content shown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDisclaimer(false)} className="w-full">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your portfolio trades, watchlist, pinned tickers, and all saved preferences. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
