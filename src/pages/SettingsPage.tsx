import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Settings, Trash2, Bell, BarChart3, FileText, Download, Upload, User, LogOut, Smartphone, X } from "lucide-react";
import type { AppExportData } from "@/lib/dataExport";
import { exportData, importData } from "@/lib/dataExport";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useDevices } from "@/hooks/useDevices";
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SettingsPage() {
  const { settings, update, resetAllData } = useSettings();
  const { permission, isSubscribed, subscribe } = usePushNotifications();
  const { user, signOut } = useAuth();
  const { devices, revokeDevice } = useDevices();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<AppExportData | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    await exportData();
    toast.success("Data exported successfully!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AppExportData;
        if (!data.version || !data.exportedAt) {
          toast.error("Invalid backup file format");
          return;
        }
        setImportPreview(data);
        setShowImportConfirm(true);
      } catch {
        toast.error("Could not parse backup file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (!pendingFile) return;
    const result = await importData(pendingFile);
    setPendingFile(null);
    setShowImportConfirm(false);
    setImportPreview(null);
    if (result.success) {
      toast.success("Data imported! Reloading…");
      setTimeout(() => window.location.reload(), 800);
    } else {
      toast.error(result.error ?? "Import failed");
    }
  };

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

  const handleSignOut = async () => {
    await signOut();
    setShowSignOutConfirm(false);
    toast.success("Signed out");
  };

  const handleRevoke = async (id: string) => {
    await revokeDevice(id);
    setRevokeTarget(null);
    toast.success("Device removed");
  };

  return (
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Account Section */}
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Account</h2>
        {user ? (
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">Synced across your devices</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Link to="/auth" className="glass-card p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Sign In to Sync</p>
              <p className="text-xs text-muted-foreground">Sync watchlist, portfolio &amp; alerts across devices</p>
            </div>
            <span className="text-muted-foreground">›</span>
          </Link>
        )}
      </div>

      {/* Authorized Devices */}
      {user && (
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Authorized Devices
          </h2>
          <div className="glass-card overflow-hidden">
            {devices.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No devices yet</p>
            ) : (
              devices.map((d, i) => (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-border/50" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{d.device_name}</p>
                      {d.isCurrent && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/15 px-1.5 py-0.5 rounded">
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Last seen {timeAgo(d.last_seen_at)}</p>
                  </div>
                  {!d.isCurrent && (
                    <button
                      onClick={() => setRevokeTarget(d.id)}
                      className="p-2 text-loss hover:bg-loss/10 rounded-md"
                      aria-label="Revoke device"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Preferences */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2 mt-3">Preferences</h2>
      <div className="flex flex-col gap-3">
        {/* Theme switcher */}
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-foreground mb-1">Theme</p>
          <p className="text-xs text-muted-foreground mb-3">Choose your visual style</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ theme: "obsidian" })}
              className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                settings.theme === "obsidian" ? "border-foreground" : "border-glass-border/40"
              }`}
              style={{
                background: "linear-gradient(135deg, hsl(230 60% 18% / 0.6), hsl(270 50% 14% / 0.5) 50%, hsl(20 70% 18% / 0.4)), hsl(0 0% 8%)",
              }}
            >
              <p className="text-xs font-bold text-white text-left relative z-10">Obsidian</p>
              <p className="text-[10px] text-white/70 text-left relative z-10">Mono + mystery</p>
            </button>
            <button
              onClick={() => update({ theme: "aurora" })}
              className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                settings.theme === "aurora" ? "border-foreground" : "border-glass-border/40"
              }`}
              style={{
                background: "linear-gradient(135deg, hsl(250 95% 50% / 0.5), hsl(280 90% 50% / 0.45) 50%, hsl(320 80% 50% / 0.5)), hsl(232 38% 12%)",
              }}
            >
              <p className="text-xs font-bold text-white text-left relative z-10">Aurora</p>
              <p className="text-[10px] text-white/70 text-left relative z-10">Purple gradient</p>
            </button>
          </div>
        </div>

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

        <button
          onClick={handleExport}
          className="glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Download className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Export Data</p>
            <p className="text-xs text-muted-foreground">Download a backup of all your data</p>
          </div>
          <span className="ml-auto text-muted-foreground">›</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Upload className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Import Data</p>
            <p className="text-xs text-muted-foreground">Restore from a previously exported backup</p>
          </div>
          <span className="ml-auto text-muted-foreground">›</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

        <button
          onClick={() => setShowResetConfirm(true)}
          className="glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-9 h-9 rounded-full bg-loss/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4.5 h-4.5 text-loss" />
          </div>
          <div>
            <p className="text-sm font-semibold text-loss">Reset All Data</p>
            <p className="text-xs text-muted-foreground">Clear local portfolio, watchlist, and saved preferences</p>
          </div>
          <span className="ml-auto text-muted-foreground">›</span>
        </button>
      </div>

      {/* Disclaimer */}
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

      {/* Reset */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your local portfolio trades, watchlist, pinned tickers, and saved preferences. {user ? "Your account data in the cloud will not be affected." : "This action cannot be undone."}
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

      {/* Import Confirm */}
      <AlertDialog
        open={showImportConfirm}
        onOpenChange={(open) => {
          setShowImportConfirm(open);
          if (!open) {
            setPendingFile(null);
            setImportPreview(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This will overwrite your current data with the backup from{" "}
                  <span className="font-semibold text-foreground">
                    {importPreview?.exportedAt ? new Date(importPreview.exportedAt).toLocaleDateString() : "unknown date"}
                  </span>. This cannot be undone.
                </p>
                {importPreview && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1.5 text-sm">
                    <p className="font-medium text-foreground mb-2">Backup contains:</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Watchlist items</span>
                      <span className="font-medium text-foreground">{importPreview.watchlist?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pinned tickers</span>
                      <span className="font-medium text-foreground">{importPreview.pinnedIds?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Portfolio trades</span>
                      <span className="font-medium text-foreground">{importPreview.portfolio?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price alerts</span>
                      <span className="font-medium text-foreground">{importPreview.alerts?.length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Settings</span>
                      <span className="font-medium text-foreground">
                        {importPreview.settings && Object.keys(importPreview.settings).length > 0 ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign out */}
      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out?</AlertDialogTitle>
            <AlertDialogDescription>
              Your data will remain saved on this device. You can sign back in anytime to resume syncing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke device */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this device?</AlertDialogTitle>
            <AlertDialogDescription>
              The device will be removed from your authorized devices list. It will need to sign in again to sync.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
