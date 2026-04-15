export interface AppExportData {
  version: 1;
  exportedAt: string;
  watchlist: unknown[];
  pinnedIds: string[];
  portfolio: unknown[];
  settings: Record<string, unknown>;
}

const KEYS = {
  watchlist: "ticker-watchlist",
  pinned: "ticker-pinned",
  portfolio: "ticker-portfolio",
  settings: "app-settings",
};

function safeJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function exportData(): Promise<void> {
  const data: AppExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    watchlist: (safeJSON(KEYS.watchlist) as unknown[]) ?? [],
    pinnedIds: (safeJSON(KEYS.pinned) as string[]) ?? [],
    portfolio: (safeJSON(KEYS.portfolio) as unknown[]) ?? [],
    settings: (safeJSON(KEYS.settings) as Record<string, unknown>) ?? {},
  };

  const filename = `tradex-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "TradeX Data Export" });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function importData(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AppExportData;

        if (!data.version || !data.exportedAt) {
          resolve({ success: false, error: "Invalid backup file format" });
          return;
        }

        if (Array.isArray(data.watchlist)) {
          localStorage.setItem(KEYS.watchlist, JSON.stringify(data.watchlist));
        }
        if (Array.isArray(data.pinnedIds)) {
          localStorage.setItem(KEYS.pinned, JSON.stringify(data.pinnedIds));
        }
        if (Array.isArray(data.portfolio)) {
          localStorage.setItem(KEYS.portfolio, JSON.stringify(data.portfolio));
        }
        if (data.settings && typeof data.settings === "object") {
          localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
        }

        resolve({ success: true });
      } catch {
        resolve({ success: false, error: "Could not parse file" });
      }
    };
    reader.onerror = () => resolve({ success: false, error: "Could not read file" });
    reader.readAsText(file);
  });
}
